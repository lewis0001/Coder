'use strict';
/* ============================================================
   lib/fls.js — FAVORITE-LONGSHOT (fade-the-longshot) edge, but
   ONLY judged on what you could ACTUALLY FILL right now.

   The intuition under test: "most predictions finish NO." The
   prior calibration study (data/research/calibration-study.md)
   found that LONGSHOT / MID-BAND YES legs resolve NO MORE often
   than their price implies (the 30-55% band is the worst: ~22%
   realized YES vs ~48% implied), so FADING them — buying NO and
   holding to resolution — is gross-profitable. BUT that edge lived
   in illiquid / stale markets where it was not fillable.

   This module screens LIVE markets for LIQUIDITY first, then prices
   the executable NO entry by walking the REAL NO book (buyCost VWAP
   + taker fee), and compares it to the historical realized NO-rate
   of that YES-price bucket (the calibration prior). Net edge =
   priorRealizedNoRate − executableNoCost(per share). Only LIQUID,
   FILLABLE candidates count.

   It ALSO runs the historical resolved dataset restricted to its
   most-liquid (highest-volume) subset, so we can ask: does the
   fade-NO edge SURVIVE when we throw away the illiquid markets that
   fooled the prior research? (out-of-sample via lib/validate.js)

   Zero dependencies beyond sibling libs. Does NOT mutate any input.
   ============================================================ */

const ob = require('./orderbook');

/* ----------------------------------------------------------------
   CALIBRATION PRIOR — realized YES-win frequency by implied-YES
   decile, taken verbatim from the OVERALL / first-obs panel of
   data/research/calibration-study.md (the largest, most stable n).
   For a FADE (buy NO) the relevant prior is the realized NO-rate =
   1 - realizedYesWin. We keep YES-win here and derive NO-rate.

   Each entry: [loYes, hiYes, n, meanImplYes, realizedYesWin].
   These are the buckets we score live candidates against.
   ---------------------------------------------------------------- */
const CALIB_YESWIN = [
  [0.00, 0.10, 166, 0.023, 0.012],
  [0.10, 0.20, 47, 0.148, 0.128],
  [0.20, 0.30, 69, 0.248, 0.232],
  [0.30, 0.40, 25, 0.356, 0.560],
  [0.40, 0.50, 112, 0.477, 0.223],
  [0.50, 0.60, 174, 0.513, 0.506],
  [0.60, 0.70, 34, 0.652, 0.735],
  [0.70, 0.80, 28, 0.746, 0.786],
  [0.80, 0.90, 19, 0.847, 0.895],
  [0.90, 1.01, 55, 0.961, 0.982],
];

/* Look up the calibration bucket for an implied YES price; returns
   { lo, hi, n, meanImplYes, realizedYesWin, realizedNoRate } or null. */
function calibBucket(yesPrice) {
  for (const [lo, hi, n, meanImpl, yesWin] of CALIB_YESWIN) {
    if (yesPrice >= lo && yesPrice < hi) {
      return { lo, hi, n, meanImplYes: meanImpl, realizedYesWin: yesWin, realizedNoRate: 1 - yesWin };
    }
  }
  return null;
}

/* Fade bands we are willing to target (implied YES price):
     longshot : [0.03, 0.15]
     mid      : [0.15, 0.55]
   We exclude the extreme sub-3c tail (near-calibrated, all noise/fees)
   and anything >=0.55 (that's the favorite side, not a fade-the-longshot
   target). */
const LONGSHOT_BAND = [0.03, 0.15];
const MID_BAND = [0.15, 0.55];

function inBand(yesPrice, band) { return yesPrice >= band[0] && yesPrice < band[1]; }
function fadeBandName(yesPrice) {
  if (inBand(yesPrice, LONGSHOT_BAND)) return 'longshot';
  if (inBand(yesPrice, MID_BAND)) return 'mid';
  return null;
}

/* ---- taker fee model (matches lib/arb-mutex.js) ----------------- */
function takerFeePerShare(price, feeSchedule, feesEnabled) {
  if (!feesEnabled || !feeSchedule || !feeSchedule.rate) return 0;
  const rate = +feeSchedule.rate || 0;
  const exp = feeSchedule.exponent != null ? +feeSchedule.exponent : 1;
  const m = Math.min(price, 1 - price);
  return rate * Math.pow(m, exp);
}

/* ---- parse a live Gamma market into a fade leg ------------------ */
/* Returns { id, question, yesToken, noToken, yesPrice, ... } or null
   if it is not a clean, order-book, binary Yes/No market. */
function marketToLeg(m) {
  if (!m) return null;
  if (m.enableOrderBook === false) return null;
  if (m.closed || m.archived || m.active === false) return null;
  if (m.acceptingOrders === false) return null;
  const outcomes = ob.parseJSON(m.outcomes, null);
  const prices = ob.parseJSON(m.outcomePrices, null);
  const tokens = ob.parseJSON(m.clobTokenIds, null);
  if (!Array.isArray(outcomes) || outcomes.length !== 2) return null;
  if (!Array.isArray(tokens) || tokens.length !== 2) return null;
  const lo = outcomes.map((s) => String(s).toLowerCase());
  let yi = lo.indexOf('yes'), ni = lo.indexOf('no');
  if (yi < 0 || ni < 0) { yi = 0; ni = 1; }
  // implied YES price: prefer outcomePrices, else best mid of YES quotes.
  let yesPrice = null;
  if (Array.isArray(prices) && prices.length === 2) {
    const p = Number(prices[yi]);
    if (isFinite(p)) yesPrice = p;
  }
  if (yesPrice == null && m.lastTradePrice != null) yesPrice = Number(m.lastTradePrice);
  return {
    id: String(m.id),
    question: m.question,
    yesToken: String(tokens[yi]),
    noToken: String(tokens[ni]),
    yesPrice,
    gammaSpread: m.spread != null ? +m.spread : null,
    gammaBestBid: m.bestBid != null ? +m.bestBid : null,
    gammaBestAsk: m.bestAsk != null ? +m.bestAsk : null,
    volume24hr: Number(m.volume24hr) || 0,
    volumeNum: Number(m.volumeNum) || Number(m.volume) || 0,
    liquidityNum: m.liquidityNum != null ? Number(m.liquidityNum) : null,
    endDate: m.endDate || m.endDateIso || null,
    negRisk: !!m.negRisk,
    feeSchedule: m.feeSchedule || null,
    feesEnabled: m.feesEnabled !== false && !!m.feeSchedule,
  };
}

/* ----------------------------------------------------------------
   LIQUIDITY GATE — judged on the REAL NO book (the side we BUY when
   fading). A candidate is liquid+fillable only if:
     - NO book has both bestBid and bestAsk present (two-sided),
     - NO-book spread <= maxSpread,
     - depthWithin(maxSlip,'buy') on the NO book covers >= minFillUsd
       of fillable shares (i.e. you can actually buy your clip near top),
     - 24h volume >= minVol24h.
   Returns a screen object with all the numbers (so callers can print
   why something passed/failed), never throws.
   ---------------------------------------------------------------- */
function screenLiquidity(noBook, leg, opts = {}) {
  const maxSpread = opts.maxSpread != null ? opts.maxSpread : 0.03;
  const maxSlip = opts.maxSlip != null ? opts.maxSlip : 0.02;
  const minFillUsd = opts.minFillUsd != null ? opts.minFillUsd : 300;
  const minVol24h = opts.minVol24h != null ? opts.minVol24h : 5000;

  const out = {
    twoSided: false, spread: null, depthBuyShares: 0, depthBuyUsd: 0,
    vol24: leg.volume24hr, passSpread: false, passDepth: false,
    passVol: false, liquid: false, reason: '',
  };
  if (!noBook || noBook.bestBid == null || noBook.bestAsk == null) {
    out.reason = 'no two-sided NO book';
    return out;
  }
  out.twoSided = true;
  out.spread = noBook.spread;
  // fillable depth within maxSlip of best NO ask
  const depthShares = ob.depthWithin(noBook, 'buy', maxSlip);
  out.depthBuyShares = depthShares;
  // approximate USD outlay to take that depth (price ~ best ask)
  out.depthBuyUsd = depthShares * (noBook.bestAsk != null ? noBook.bestAsk : 1);
  out.passSpread = noBook.spread != null && noBook.spread <= maxSpread + 1e-9;
  out.passDepth = out.depthBuyUsd >= minFillUsd;
  out.passVol = out.vol24 >= minVol24h;
  out.liquid = out.passSpread && out.passDepth && out.passVol;
  if (!out.liquid) {
    const why = [];
    if (!out.passVol) why.push(`vol24 $${Math.round(out.vol24)}<$${minVol24h}`);
    if (!out.passSpread) why.push(`NO spread ${out.spread != null ? out.spread.toFixed(3) : 'n/a'}>${maxSpread}`);
    if (!out.passDepth) why.push(`NO fill depth $${Math.round(out.depthBuyUsd)}<$${minFillUsd}`);
    out.reason = why.join('; ');
  }
  return out;
}

/* ----------------------------------------------------------------
   EXECUTABLE NO ENTRY — walk the real NO asks for `clipShares` shares
   (clip in $ payout = share count, since NO pays $1). Returns
   { fillable, exhausted, avgPriceNoFee, feePerShare, avgPrice (incl fee),
     costUsd } or { exhausted:true } if the book can't fill the clip.
   ---------------------------------------------------------------- */
function executableNoEntry(noBook, leg, clipShares) {
  const r = ob.buyCost(noBook, clipShares);
  if (r.exhausted || r.avgPrice == null) {
    return { exhausted: true, fillable: r.filled, avgPriceNoFee: r.avgPrice, costUsd: r.cost };
  }
  const feePerShare = takerFeePerShare(r.avgPrice, leg.feeSchedule, leg.feesEnabled);
  const avgPrice = r.avgPrice + feePerShare;
  return {
    exhausted: false,
    fillable: r.filled,
    avgPriceNoFee: r.avgPrice,
    feePerShare,
    avgPrice,                 // all-in NO cost per share (incl taker fee)
    costUsd: r.cost + feePerShare * r.filled,
  };
}

/* ----------------------------------------------------------------
   Score one already-fetched (leg, noBook) pair as a fade candidate.
   Returns a full candidate record or { skip, reason }.
     priorRealizedNoRate = 1 - realizedYesWin of the YES-price bucket
     executableNoCost     = all-in per-share NO ask (VWAP+fee) for clip
     netEdgePerShare      = priorRealizedNoRate - executableNoCost
       (what you net per $1 NO share IF the historical NO-rate holds:
        you pay executableNoCost now, collect $1 with prob ~NO-rate)
   ---------------------------------------------------------------- */
function scoreFade(leg, noBook, opts = {}) {
  const clip = opts.clipShares != null ? opts.clipShares : 300;
  if (leg.yesPrice == null || !isFinite(leg.yesPrice)) return { skip: true, reason: 'no YES price' };
  const band = fadeBandName(leg.yesPrice);
  if (!band) return { skip: true, reason: `YES ${leg.yesPrice.toFixed(3)} outside fade bands` };
  const calib = calibBucket(leg.yesPrice);
  if (!calib) return { skip: true, reason: 'no calibration bucket' };

  const liq = screenLiquidity(noBook, leg, opts);
  const entry = executableNoEntry(noBook, leg, clip);

  const priorRealizedNoRate = calib.realizedNoRate;
  const executableNoCost = entry.exhausted ? null : entry.avgPrice;
  const netEdgePerShare = executableNoCost == null ? null : (priorRealizedNoRate - executableNoCost);

  return {
    skip: false,
    id: leg.id,
    question: leg.question,
    band,
    yesPrice: leg.yesPrice,
    noToken: leg.noToken,
    endDate: leg.endDate,
    negRisk: leg.negRisk,
    volume24hr: leg.volume24hr,
    // book
    noBestBid: noBook ? noBook.bestBid : null,
    noBestAsk: noBook ? noBook.bestAsk : null,
    noSpread: noBook ? noBook.spread : null,
    liquidity: liq,
    // entry
    clipShares: clip,
    exhausted: entry.exhausted,
    fillableShares: entry.fillable,
    executableNoCost,                 // all-in per-share (VWAP + fee)
    executableNoCostNoFee: entry.exhausted ? null : entry.avgPriceNoFee,
    feePerShare: entry.exhausted ? null : entry.feePerShare,
    // prior + edge
    calibBucket: [calib.lo, calib.hi],
    calibN: calib.n,
    priorRealizedNoRate,
    netEdgePerShare,
    // a candidate is "tradeable" only if liquid, fillable, and net-positive
    tradeable: !!(liq.liquid && !entry.exhausted && netEdgePerShare != null && netEdgePerShare > 0),
  };
}

/* ================================================================
   HISTORICAL LIQUID-SUBSET FADE BACKTEST
   ----------------------------------------------------------------
   Re-run the fade idea on the RESOLVED dataset, but only on its
   most-liquid (highest-volume) markets, to ask: does restricting to
   liquidity preserve or destroy the edge?

   For each resolved market whose ENTRY YES price (firstPrice, the
   first observed price = the "first-obs" timing of the calibration
   study) is in a fade band, we "buy NO" at that entry. The honest
   per-trade PnL on a $1 NO share, held to resolution, is:
       payoff = (yesWon ? 0 : 1)        // NO pays 1 iff YES lost
       cost   = noEntryPrice + fee      // we pay ~ (1 - yesPrice) for NO,
                                        // plus a round-trip cost proxy
       pnl    = payoff - cost
   We approximate the NO entry price as (1 - yesPrice) and add a
   per-share cost proxy `costPerShare` (spread+slippage+fee) since the
   resolved dataset has no stored book. This is deliberately
   conservative: the LIVE scan uses the REAL book; here we stress the
   historical edge against a fixed friction.
   ================================================================ */
function fadePnlForMarket(mkt, opts = {}) {
  const band0 = opts.bands || [LONGSHOT_BAND, MID_BAND];
  const costPerShare = opts.costPerShare != null ? opts.costPerShare : 0.02;
  const entryYes = mkt.firstPrice != null ? Number(mkt.firstPrice)
    : (mkt.path && mkt.path.length ? Number(mkt.path[0].p) : null);
  if (entryYes == null || !isFinite(entryYes)) return null;
  const inAny = band0.some((b) => entryYes >= b[0] && entryYes < b[1]);
  if (!inAny) return null;
  const noEntry = (1 - entryYes) + costPerShare;     // all-in NO cost per share
  const payoff = mkt.outcomeYesWon ? 0 : 1;          // NO wins iff YES lost
  return payoff - noEntry;                            // per-share PnL
}

/* Build the fade per-trade PnL log over a list of resolved markets. */
function fadeLog(markets, opts = {}) {
  const log = [];
  for (const m of markets) {
    const pnl = fadePnlForMarket(m, opts);
    if (pnl != null) log.push({ id: m.id, netPnl: pnl, volume: m.volume, endDate: m.endDate });
  }
  return log;
}

module.exports = {
  CALIB_YESWIN,
  LONGSHOT_BAND,
  MID_BAND,
  calibBucket,
  fadeBandName,
  inBand,
  takerFeePerShare,
  marketToLeg,
  screenLiquidity,
  executableNoEntry,
  scoreFade,
  fadePnlForMarket,
  fadeLog,
};
