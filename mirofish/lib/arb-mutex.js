'use strict';
/* ============================================================
   lib/arb-mutex.js — structural mispricing in LIVE multi-outcome
   (mutually-exclusive) Polymarket events, judged ONLY on real
   order-book depth via lib/orderbook.js.

   Three structures, all computed on executable fills (buyCost walks
   real asks; a leg that can't fill its clip is exhausted=true and
   kills the basket):

   (1) BUY-ALL-NO basket. In a K-leg event where EXACTLY ONE leg
       resolves YES, buying NO on every leg pays exactly (K-1) per
       share-set: the one winner's NO -> 0, the (K-1) losers' NO -> 1.
       If executable cost (sum of buyCost(NO clip) + taker fees) <
       (K-1)*clip, that's an arbitrage.

       negRisk variant: you do NOT need to buy the last leg. Buy NO on
       (K-1) legs; if all resolve to losers you keep (K-2)+... — no.
       The real negRisk structural play: buy NO on all K legs, then the
       negRisk adapter lets you CONVERT a complete set of NO (one per
       outcome) into (K-1) USDC + ... Actually the clean, honest version
       we can verify on books is identical to the buy-all-NO basket:
       hold NO on every leg to resolution, collect (K-1). We compute
       that. We ALSO compute the "all-but-most-expensive-leg" version
       (skip the single most expensive NO leg) which on a true mutex
       event is NOT a guaranteed payout unless you convert, so we only
       report it as an upper-bound diagnostic, never as a tradeable claim.

   (2) OVERROUND short. sum over legs of (best YES ask). On a mutex
       event the fair sum of YES is 1. If sum of executable YES asks
       >> 1 the YES basket is overpriced; shorting it = buying NO on
       every leg, which is exactly structure (1). We report the
       sum-YES-ask overround as a diagnostic and tie the realizable
       edge to the buy-all-NO basket.

   (3) WITHIN-EVENT relative value. A leg whose executable NO is cheap
       relative to (1 - its own YES ask) or relative to siblings —
       i.e. NO_ask + YES_ask < 1 on the SAME leg is a single-market
       lock (buy YES + buy NO < 1, pays 1). We surface those too since
       they show up while scanning.

   Fees: Polymarket taker fees (taker-only schedules, exponent 1):
       fee_per_share = rate * min(price, 1-price).
   We charge the taker fee on every NO share bought (worst-case,
   honest). feesEnabled=false markets are free.
   ============================================================ */

const { buyCost, sellProceeds, depthWithin, parseJSON } = require('./orderbook');

/* ---- fee model ---------------------------------------------------- */
/* Returns taker fee per share for buying at `price`, given a market's
   feeSchedule. exponent is 1 in all live schedules; we honor it anyway. */
function takerFeePerShare(price, feeSchedule, feesEnabled) {
  if (!feesEnabled || !feeSchedule || !feeSchedule.rate) return 0;
  const rate = +feeSchedule.rate || 0;
  const exp = feeSchedule.exponent != null ? +feeSchedule.exponent : 1;
  const m = Math.min(price, 1 - price);
  return rate * Math.pow(m, exp);
}

/* Total taker fee to buy `shares` at avg `avgPrice` on a market. */
function takerFee(avgPrice, shares, feeSchedule, feesEnabled) {
  if (!(shares > 0) || avgPrice == null) return 0;
  return takerFeePerShare(avgPrice, feeSchedule, feesEnabled) * shares;
}

/* ---- mutual-exclusivity classification --------------------------- */
/* The buy-all-NO basket pays EXACTLY (K-1) ONLY if the legs form a true
   one-winner partition (exactly one leg resolves YES). The honest signal
   for that on Polymarket:
     - event.negRisk === true  (Polymarket's "negative risk" adapter flag,
       which it sets precisely for mutually-exclusive outcome sets), AND
     - sum of per-leg YES prices ≈ 1 (a partition's probabilities sum to 1).
   Plain (negRisk=false) multi-leg events are overwhelmingly OVERLAPPING /
   INDEPENDENT yes/no questions (threshold ladders like "BTC hits $X",
   "total corners over N.5", per-team prop bundles) whose YES prices sum to
   5-18, NOT 1. On those, buying all-NO does NOT pay (K-1) — multiple or
   zero legs resolve YES — so the "arb" is fake. We REQUIRE negRisk to even
   consider a basket, and additionally sanity-check sumYES.

   Returns { isMutex, sumYes, reason }. sumYes uses gamma YES prices
   (mid-ish) when present, else null (then we lean on negRisk alone). */
function classifyMutex(event, legs) {
  const neg = !!event.negRisk;
  let s = 0, n = 0;
  for (const leg of legs) {
    if (leg.gammaBestAsk != null && leg.gammaBestBid != null) { s += (leg.gammaBestAsk + leg.gammaBestBid) / 2; n++; }
    else if (leg.gammaBestAsk != null) { s += leg.gammaBestAsk; n++; }
  }
  const sumYes = n === legs.length && n > 0 ? s : null;
  // A partition's YES prices sum to ~1. Allow [0.5, 1.2]: the low tail covers
  // partitions with a large unlisted "field/other" leg (e.g. Nobel), where the
  // NO basket is still safe (all listed legs CAN all lose -> all NO pay).
  const sumOk = sumYes == null ? true : (sumYes <= 1.2);
  const isMutex = neg && sumOk;
  let reason;
  if (!neg) reason = 'not negRisk (overlapping/independent questions — all-NO does not pay K-1)';
  else if (!sumOk) reason = `negRisk but sumYES=${sumYes.toFixed(2)}>1.2 (not a clean partition)`;
  else reason = 'mutex (negRisk' + (sumYes != null ? `, sumYES=${sumYes.toFixed(2)}` : '') + ')';
  return { isMutex, sumYes, reason };
}

/* ---- leg extraction ---------------------------------------------- */
/* Turn an event's markets[] into clean legs with yes/no token ids and a
   fee schedule. Only keep order-book-enabled, open, active markets that
   are genuine Yes/No binaries. */
function eventLegs(event) {
  const legs = [];
  for (const m of event.markets || []) {
    if (!m.enableOrderBook) continue;
    if (m.closed || m.archived || m.active === false) continue;
    if (m.acceptingOrders === false) continue;
    const outcomes = parseJSON(m.outcomes, null);
    const tokens = parseJSON(m.clobTokenIds, null);
    if (!Array.isArray(outcomes) || !Array.isArray(tokens) || tokens.length !== 2) continue;
    // identify which token is YES / NO
    const lo = outcomes.map((s) => String(s).toLowerCase());
    let yi = lo.indexOf('yes'), ni = lo.indexOf('no');
    if (yi < 0 || ni < 0) { yi = 0; ni = 1; } // fall back to convention [yes,no]
    legs.push({
      question: m.question,
      title: m.groupItemTitle || m.question,
      yesToken: tokens[yi],
      noToken: tokens[ni],
      feeSchedule: m.feeSchedule || null,
      feesEnabled: m.feesEnabled !== false && !!m.feeSchedule,
      gammaBestAsk: m.bestAsk != null ? +m.bestAsk : null,
      gammaBestBid: m.bestBid != null ? +m.bestBid : null,
      tickSize: m.orderPriceMinTickSize != null ? +m.orderPriceMinTickSize : 0.001,
      minSize: m.orderMinSize != null ? +m.orderMinSize : 5,
    });
  }
  return legs;
}

/* ---- structure 1+2: buy-all-NO basket on real books -------------- */
/* clipUsd: target dollars of NOTIONAL PAYOUT per leg we aim to lock,
   expressed as a share count = clipUsd (since each NO share pays $1).
   We try to buy `shares` NO on every leg, walking real asks.

   Returns a full per-event report. */
function analyzeBuyAllNo(legs, books, shares) {
  const K = legs.length;
  const perLeg = [];
  let totalCost = 0;       // dollars to buy `shares` NO on every leg (incl fee)
  let totalCostNoFee = 0;
  let allFill = true;
  let minFillShares = Infinity; // capacity bottleneck (thinnest leg, in shares)
  let sumYesAsk = 0;       // overround diagnostic (best YES ask sum)
  let yesAskKnown = 0;

  for (const leg of legs) {
    const noBook = books[leg.noToken];
    const yesBook = books[leg.yesToken];
    if (yesBook && yesBook.bestAsk != null) { sumYesAsk += yesBook.bestAsk; yesAskKnown++; }

    if (!noBook || !noBook.asks || !noBook.asks.length) {
      perLeg.push({ leg, fillable: 0, exhausted: true, cost: null, avgPrice: null, fee: null });
      allFill = false; minFillShares = 0; continue;
    }
    const r = buyCost(noBook, shares);
    const fee = takerFee(r.avgPrice, r.filled, leg.feeSchedule, leg.feesEnabled);
    const cost = r.cost + fee;
    // capacity: how many NO shares can this leg fill at all (sum of ask sizes)?
    const legDepthShares = noBook.asks.reduce((s, l) => s + l.size, 0);
    minFillShares = Math.min(minFillShares, legDepthShares);
    if (r.exhausted) allFill = false;
    totalCost += cost; totalCostNoFee += r.cost;
    perLeg.push({
      leg, fillable: r.filled, exhausted: r.exhausted, cost, costNoFee: r.cost,
      avgPrice: r.avgPrice, fee, bestAsk: noBook.bestAsk, legDepthShares,
    });
  }

  const payout = (K - 1) * shares;                 // guaranteed payout if all NO held
  const grossEdge = payout - totalCostNoFee;       // before fees
  const netEdge = payout - totalCost;              // after taker fees
  const netPerDollarSet = netEdge / shares;        // net cents per share-set (== per (K-1) basket unit)
  // "basket NO cost minus (K-1)" normalized to per-share-set terms:
  const noCostMinusK1 = (totalCost / shares) - (K - 1);   // <0 means arb (after fees)
  const noCostMinusK1NoFee = (totalCostNoFee / shares) - (K - 1);

  return {
    K, shares, perLeg,
    totalCost, totalCostNoFee, payout,
    grossEdge, netEdge, netPerDollarSet,
    noCostMinusK1, noCostMinusK1NoFee,
    allFill,
    capacityShares: isFinite(minFillShares) ? minFillShares : 0,
    sumYesAsk: yesAskKnown === K ? sumYesAsk : null,  // only meaningful if every leg known
    sumYesAskPartial: sumYesAsk, yesAskKnown,
    overround: yesAskKnown === K ? sumYesAsk - 1 : null,
  };
}

/* ---- structure 3: single-market lock (YES_ask + NO_ask < 1) ------ */
/* On the SAME leg, if you can buy YES and NO each at ask and the sum is
   < 1, you lock (1 - sum) per share-set guaranteed. Real depth. */
function analyzeSingleLeg(legs, books, shares) {
  const hits = [];
  for (const leg of legs) {
    const yb = books[leg.yesToken], nb = books[leg.noToken];
    if (!yb || !nb || !yb.asks.length || !nb.asks.length) continue;
    const ry = buyCost(yb, shares), rn = buyCost(nb, shares);
    if (ry.exhausted || rn.exhausted) continue;
    const feeY = takerFee(ry.avgPrice, ry.filled, leg.feeSchedule, leg.feesEnabled);
    const feeN = takerFee(rn.avgPrice, rn.filled, leg.feeSchedule, leg.feesEnabled);
    const cost = ry.cost + rn.cost + feeY + feeN;
    const net = shares - cost;        // pays exactly `shares` (1 per set)
    if (net > 0) {
      hits.push({
        leg, shares, cost, net, netPerShare: net / shares,
        yesAvg: ry.avgPrice, noAvg: rn.avgPrice, feeY, feeN,
      });
    }
  }
  return hits;
}

/* ---- within-event relative value: cheapest NO vs siblings -------- */
/* Diagnostic only: for each leg, executable NO ask vs the event's
   implied NO (1 - leg's YES mid). Flags legs whose NO trades well below
   what siblings imply. Not a standalone arb, but feeds the basket. */
function relativeValue(legs, books, shares) {
  const rows = [];
  for (const leg of legs) {
    const nb = books[leg.noToken], yb = books[leg.yesToken];
    if (!nb || !nb.asks.length) continue;
    const r = buyCost(nb, shares);
    if (r.exhausted) continue;
    const yesMid = yb && yb.mid != null ? yb.mid : (yb && yb.bestAsk != null ? yb.bestAsk : null);
    const impliedNo = yesMid != null ? 1 - yesMid : null;
    rows.push({
      title: leg.title,
      noAsk: r.avgPrice,
      impliedNo,
      cheapness: impliedNo != null ? impliedNo - r.avgPrice : null, // >0: NO cheaper than implied
    });
  }
  rows.sort((a, b) => (b.cheapness ?? -9) - (a.cheapness ?? -9));
  return rows;
}

module.exports = {
  takerFeePerShare, takerFee, eventLegs, classifyMutex,
  analyzeBuyAllNo, analyzeSingleLeg, relativeValue,
};
