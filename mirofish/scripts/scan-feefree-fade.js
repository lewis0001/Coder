'use strict';
/* ============================================================
   scripts/scan-feefree-fade.js
   FADE THE OVERPRICED LEG, but ONLY where the fee is gone.

   PRIOR (data/research/calibration-study.md): mid-band (0.15-0.55)
   and longshot (0.03-0.15) YES legs of multi-outcome / mutually-
   exclusive fields resolve NO MORE often than priced — a REAL gross
   edge (only one candidate of a crowded field can win, so the basket
   of mid-priced YES legs is structurally overpriced).

   WHY EDGES.md killed it: that gross edge was eaten by (a) the 3-7%
   category TAKER FEE and (b) illiquidity/staleness in the thin legs
   where it concentrated. The standard that caught the false positive:
   judge every edge on the REAL order book (VWAP+slippage via
   lib/orderbook.buyCost), never on a mid-price fiction.

   KEY INSIGHT (this script's whole reason to exist): geopolitics /
   world-leader markets on Polymarket are FEE-FREE (feesEnabled=false,
   feeType=null, feeSchedule=null) and LIQUID ($200k-5M+/24h), and many
   are MULTI-CANDIDATE mutually-exclusive fields ("Next PM of Ethiopia",
   "Next leader out of power", "Who signs the Iran deal"). On these, the
   fee that killed the edge is ZERO. So: does the fade survive once we
   remove the fee AND require liquidity?

   WHAT THIS DOES (all on LIVE books, NO mid-price fills):
     1) Build the FEE-FREE LIQUID universe from live events+markets.
        Verify per market feesEnabled===false (feeType/feeSchedule null).
        Identify multi-candidate mutually-exclusive fields (negRisk or
        >=3 sibling legs) vs standalone fee-free markets.
     2) For overpriced legs (YES in longshot/mid band), compute the
        EXECUTABLE all-in NO cost on the live NO book (buyCost VWAP for a
        $clip clip; fee=0 because fee-free — but we ASSERT it, never
        assume it). Implied net edge = priorRealizedNoRate(bucket) -
        executableNoCost. Report net cents/$1 and fillable depth.
     3) Write a FORWARD LOG data/research/feefree-fade-YYYYMMDD.json of
        today's candidates (id, question, event, YES price, executable
        NO cost, depth, resolution date, resolved/outcome placeholders)
        for honest scoring at resolution. (Backtesting dead markets
        fooled us before; only forward scoring is honest.)
     4) Sanity: confirm each candidate is genuinely TWO-SIDED and FRESH
        (live NO book both sides + live YES book both sides, recent
        Gamma update, recent last-trade) — staleness is what invalidated
        the earlier overround 'edge'.

   NEW FILE. Reads ONLY existing libs (lib/orderbook, lib/fls). Mutates
   nothing but the forward log it writes. Plain Node, zero deps. Polite
   API use (concurrency<=5).

   Usage:
     node scripts/scan-feefree-fade.js
       [--eventLimit=300] [--marketLimit=500] [--clip=300]
       [--minClipUsd=100] [--maxClipUsd=500]
       [--minFillUsd=100] [--maxSpread=0.04] [--maxSlip=0.03]
       [--minVol24h=20000] [--conc=5] [--top=60]
       [--freshHours=48] [--no-write]
   ============================================================ */

const fs = require('fs');
const path = require('path');
const ob = require('../lib/orderbook');
const fls = require('../lib/fls');

/* ----------------------------- args ----------------------------- */
function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return def;
  const v = hit.split('=')[1];
  return isNaN(+v) ? v : +v;
}
const FLAG = (name) => process.argv.includes(`--${name}`);

const EVENT_LIMIT = arg('eventLimit', 300);
const MARKET_LIMIT = arg('marketLimit', 500);
const CLIP = arg('clip', 300);             // NO shares per fade clip ($ payout, NO pays $1)
const MIN_CLIP_USD = arg('minClipUsd', 100);
const MAX_CLIP_USD = arg('maxClipUsd', 500);
const MIN_FILL_USD = arg('minFillUsd', 100);
const MAX_SPREAD = arg('maxSpread', 0.04);
const MAX_SLIP = arg('maxSlip', 0.03);
const MIN_VOL24H = arg('minVol24h', 20000);
const CONC = Math.min(5, arg('conc', 5));  // POLITE: never exceed 5
const TOP = arg('top', 60);
const FRESH_HOURS = arg('freshHours', 48);
const WRITE = !FLAG('no-write');

const RESEARCH_DIR = path.join(__dirname, '..', 'data', 'research');

/* --------------------------- helpers ---------------------------- */
function f(x, d = 4) { return x == null || !isFinite(x) ? 'n/a' : (+x).toFixed(d); }
function c(x) { return x == null || !isFinite(x) ? 'n/a' : (100 * x).toFixed(2) + 'c'; }
function money(x) { return x == null || !isFinite(x) ? 'n/a' : '$' + Math.round(+x).toLocaleString(); }
function todayTag() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}
function hoursSince(iso) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!isFinite(t)) return Infinity;
  return (Date.now() - t) / 3600000;
}

/* ----------------------------------------------------------------
   FEE-FREE DETECTION — the load-bearing gate. A market is fee-free
   ONLY if feesEnabled is explicitly false AND there is no fee type /
   schedule / non-zero base fee. We are deliberately strict: any hint
   of a fee disqualifies, so a counted "net" edge is genuinely net.
   ---------------------------------------------------------------- */
function isFeeFree(m) {
  if (!m) return false;
  if (m.feesEnabled !== false) return false;          // must be explicit false
  if (m.feeType != null) return false;                // e.g. "politics_fees"
  if (m.feeSchedule != null) return false;            // {rate,...}
  const tb = Number(m.takerBaseFee);
  const mb = Number(m.makerBaseFee);
  if (isFinite(tb) && tb > 0) return false;
  if (isFinite(mb) && mb > 0) return false;
  return true;
}

/* Is a leg a clean, live, order-book binary YES/NO market we can trade? */
function tradableLeg(m) {
  if (!m) return false;
  if (m.enableOrderBook === false) return false;
  if (m.closed || m.archived || m.active === false) return false;
  if (m.acceptingOrders === false) return false;
  const toks = ob.parseJSON(m.clobTokenIds, null);
  const outs = ob.parseJSON(m.outcomes, null);
  if (!Array.isArray(toks) || toks.length !== 2) return false;
  if (!Array.isArray(outs) || outs.length !== 2) return false;
  return true;
}

/* Parse a live market (possibly nested in an event) into a fade leg,
   carrying the field/event context + freshness fields. Returns null if
   not a clean binary order-book market. */
function legFrom(m, field) {
  if (!tradableLeg(m)) return null;
  const leg = fls.marketToLeg(m);
  if (!leg) return null;
  leg.feeFree = isFeeFree(m);
  leg.groupItemTitle = m.groupItemTitle || null;
  leg.lastTradePrice = m.lastTradePrice != null ? Number(m.lastTradePrice) : null;
  leg.oneDayPriceChange = m.oneDayPriceChange != null ? Number(m.oneDayPriceChange) : null;
  leg.updatedAt = m.updatedAt || m.updatedAtIso || null;
  leg.field = field || null;       // { eventId, title, category, negRisk, nLegs, kind }
  return leg;
}

/* ----------------------------------------------------------------
   FRESHNESS / TWO-SIDEDNESS sanity — judged on BOTH live books.
   Staleness is exactly what invalidated the earlier overround edge,
   so a candidate counts only if:
     - NO book two-sided (buy side we trade),
     - YES book two-sided (confirms the leg is actively two-way quoted,
       not a one-sided dust quote),
     - Gamma record updated within freshHours,
     - a finite last-trade price exists.
   ---------------------------------------------------------------- */
function freshness(leg, noBook, yesBook) {
  const noTwoSided = !!(noBook && noBook.bestBid != null && noBook.bestAsk != null);
  const yesTwoSided = !!(yesBook && yesBook.bestBid != null && yesBook.bestAsk != null);
  const updHours = hoursSince(leg.updatedAt);
  const recentlyUpdated = updHours <= FRESH_HOURS;
  const hasLastTrade = leg.lastTradePrice != null && isFinite(leg.lastTradePrice);
  const fresh = noTwoSided && yesTwoSided && recentlyUpdated && hasLastTrade;
  const why = [];
  if (!noTwoSided) why.push('NO book one-sided/empty');
  if (!yesTwoSided) why.push('YES book one-sided/empty');
  if (!recentlyUpdated) why.push(`stale (updated ${isFinite(updHours) ? updHours.toFixed(0) : '?'}h ago > ${FRESH_HOURS}h)`);
  if (!hasLastTrade) why.push('no last-trade price');
  return { fresh, noTwoSided, yesTwoSided, updHours, recentlyUpdated, hasLastTrade, reason: why.join('; ') };
}

/* ============================ MAIN ============================== */
(async () => {
  const t0 = Date.now();
  console.log('# scan-feefree-fade — fade the overpriced leg where the FEE IS GONE. ' + new Date().toISOString());
  console.log(`# fade bands (implied YES): longshot [${fls.LONGSHOT_BAND.join(',')}], mid [${fls.MID_BAND.join(',')}]. Buy NO, hold to resolution.`);
  console.log(`# gates: fee-free (feesEnabled===false), vol24>=${money(MIN_VOL24H)}, NO-spread<=${MAX_SPREAD}, fill>=${money(MIN_FILL_USD)} within ${MAX_SLIP} slip, clip=${CLIP} NO-sh ($${MIN_CLIP_USD}-$${MAX_CLIP_USD}), fresh<=${FRESH_HOURS}h.`);
  console.log(`# POLITE: concurrency=${CONC}.\n`);

  /* ---- 1) DISCOVER: live events (fields) + live standalone markets ---- */
  console.log('============================================================');
  console.log('(1) BUILD FEE-FREE LIQUID UNIVERSE');
  console.log('============================================================');
  let events = [];
  try { events = await ob.liveEvents({ limit: EVENT_LIMIT }); }
  catch (e) { console.log(`# WARN liveEvents failed: ${e.message}`); }
  console.log(`# fetched ${events.length} live events (by 24h volume)`);

  let standalone = [];
  try { standalone = await ob.liveMarkets({ limit: MARKET_LIMIT }); }
  catch (e) { console.log(`# WARN liveMarkets failed: ${e.message}`); }
  console.log(`# fetched ${standalone.length} live markets (by 24h volume)`);

  // --- index events as FIELDS; classify multi-candidate mutex vs other ---
  const fields = [];          // every event we keep context for
  const legsById = new Map(); // dedupe legs by market id (events + standalone)

  let feeFreeFields = 0, mutexFields = 0, feeFreeFieldVol = 0;
  for (const e of events) {
    const mk = e.markets || [];
    if (!mk.length) continue;
    const tradable = mk.filter(tradableLeg);
    if (!tradable.length) continue;
    const feeFreeLegs = tradable.filter(isFeeFree);
    const allFeeFree = feeFreeLegs.length === tradable.length && tradable.length > 0;
    const someFeeFree = feeFreeLegs.length > 0;
    const negRisk = !!e.negRisk;
    const nLegs = tradable.length;
    const isMultiCand = negRisk || nLegs >= 3;       // mutually-exclusive field
    const kind = negRisk ? 'mutex-negRisk' : (nLegs >= 3 ? 'multi-leg' : 'small');
    const vol24 = Number(e.volume24hr) || 0;
    const field = {
      eventId: String(e.id), title: e.title, slug: e.slug,
      category: e.category || (e.tags && e.tags.length ? (e.tags[0].label || e.tags[0].slug) : null),
      tags: (e.tags || []).map((t) => t.label || t.slug).filter(Boolean).slice(0, 6),
      negRisk, nLegs, kind, vol24,
      allFeeFree, someFeeFree, feeFreeLegs: feeFreeLegs.length, isMultiCand,
    };
    if (someFeeFree) {
      feeFreeFields++;
      feeFreeFieldVol += vol24;
      if (isMultiCand) mutexFields++;
      fields.push(field);
    }
    // collect the fee-free, in-band tradable legs from this field
    for (const m of feeFreeLegs) {
      const leg = legFrom(m, field);
      if (!leg) continue;
      legsById.set(leg.id, leg);
    }
  }

  // standalone fee-free markets not already captured via an event
  let standaloneFeeFree = 0;
  for (const m of standalone) {
    if (!isFeeFree(m) || !tradableLeg(m)) continue;
    const id = String(m.id);
    if (legsById.has(id)) continue;
    standaloneFeeFree++;
    const field = {
      eventId: null, title: m.question, slug: m.slug,
      category: m.category || null, tags: [], negRisk: !!m.negRisk,
      nLegs: 1, kind: 'standalone', vol24: Number(m.volume24hr) || 0,
      allFeeFree: true, someFeeFree: true, feeFreeLegs: 1, isMultiCand: false,
    };
    const leg = legFrom(m, field);
    if (leg) legsById.set(leg.id, leg);
  }

  const allFeeFreeLegs = [...legsById.values()];
  console.log(`# FEE-FREE FIELDS (events w/ >=1 fee-free leg): ${feeFreeFields}  (multi-candidate mutually-exclusive: ${mutexFields})`);
  console.log(`#   total 24h volume across fee-free fields: ${money(feeFreeFieldVol)}`);
  console.log(`# FEE-FREE standalone markets (not in a kept event): ${standaloneFeeFree}`);
  console.log(`# total distinct FEE-FREE tradable legs: ${allFeeFreeLegs.length}`);

  // top fee-free fields by volume (context for the report)
  const topFields = fields.slice().sort((a, b) => b.vol24 - a.vol24).slice(0, 12);
  console.log('\n--- TOP FEE-FREE FIELDS by 24h volume ---');
  console.log('  vol24      | legs | mutex | feeFree | category        | title');
  for (const fl of topFields) {
    console.log(
      `  ${money(fl.vol24).padStart(10)} | ${String(fl.nLegs).padStart(4)} | ${(fl.isMultiCand ? 'yes' : 'no').padEnd(5)} | ` +
      `${String(fl.feeFreeLegs).padStart(7)} | ${String(fl.category || '').slice(0, 15).padEnd(15)} | ${String(fl.title || '').slice(0, 50)}`
    );
  }

  /* ---- 2) keep only fee-free legs whose YES is in a fade band + clear vol ---- */
  const inBand = allFeeFreeLegs.filter((l) => l.feeFree && fls.fadeBandName(l.yesPrice) != null);
  const inBandVol = inBand.filter((l) => l.volume24hr >= MIN_VOL24H);
  console.log(`\n# fee-free legs with YES in a fade band [${fls.LONGSHOT_BAND.join('-')}]∪[${fls.MID_BAND.join('-')}]: ${inBand.length}`);
  console.log(`#   of which clear leg vol24>=${money(MIN_VOL24H)}: ${inBandVol.length} (pre-book filter)`);

  if (!inBandVol.length) {
    console.log('\n# no fee-free, in-band, liquid-enough legs to price. Nothing to do.');
    finishEmpty(t0, { feeFreeFields, mutexFields, standaloneFeeFree, allFeeFreeLegs: allFeeFreeLegs.length, inBand: inBand.length });
    return;
  }

  /* ---- 3) price EXECUTABLE NO entry on the REAL NO book + freshness via YES book ---- */
  console.log('\n============================================================');
  console.log('(2) PRICE EXECUTABLE NO ENTRY ON LIVE BOOKS (VWAP, fee=0 — asserted fee-free)');
  console.log('============================================================');
  const noTokens = inBandVol.map((l) => l.noToken);
  const yesTokens = inBandVol.map((l) => l.yesToken);
  console.log(`# fetching ${noTokens.length} NO books + ${yesTokens.length} YES books (concurrency=${CONC}) ...`);
  const [noBooks, yesBooks] = await Promise.all([
    ob.getBooks(noTokens, { concurrency: CONC }),
    ob.getBooks(yesTokens, { concurrency: CONC }),
  ]);
  const gotNo = Object.values(noBooks).filter(Boolean).length;
  const gotYes = Object.values(yesBooks).filter(Boolean).length;
  console.log(`# got ${gotNo}/${noTokens.length} NO books, ${gotYes}/${yesTokens.length} YES books in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  const screenOpts = {
    maxSpread: MAX_SPREAD, maxSlip: MAX_SLIP,
    minFillUsd: MIN_FILL_USD, minVol24h: MIN_VOL24H, clipShares: CLIP,
  };

  const scored = [];
  for (const leg of inBandVol) {
    const noBook = noBooks[leg.noToken];
    const yesBook = yesBooks[leg.yesToken];
    if (!noBook) continue;

    // ASSERT fee-free at scoring time (never assume): force fee model off.
    leg.feesEnabled = false;
    leg.feeSchedule = null;

    const s = fls.scoreFade(leg, noBook, screenOpts);
    if (s.skip) continue;

    // executableNoCost from scoreFade already has fee=0 (fee-free). Sanity-assert.
    s.feeApplied = s.feePerShare || 0;
    s.feeFree = leg.feeFree;

    // freshness / two-sidedness using BOTH books
    s.fresh = freshness(leg, noBook, yesBook);
    s.yesBestBid = yesBook ? yesBook.bestBid : null;
    s.yesBestAsk = yesBook ? yesBook.bestAsk : null;
    s.lastTradePrice = leg.lastTradePrice;
    s.oneDayPriceChange = leg.oneDayPriceChange;
    s.updatedAt = leg.updatedAt;
    s.groupItemTitle = leg.groupItemTitle;
    s.field = leg.field;

    // executable clip USD (what you'd actually outlay for the clip)
    s.clipUsd = s.executableNoCost != null ? s.executableNoCost * CLIP : null;

    scored.push(s);
  }

  const liquid = scored.filter((s) => s.liquidity.liquid && !s.exhausted);
  const liquidFresh = liquid.filter((s) => s.fresh.fresh);
  // a genuine candidate: fee-free, liquid, fillable, fresh/two-sided, net-positive vs prior
  const candidates = liquidFresh
    .filter((s) => s.feeFree && s.netEdgePerShare != null)
    .sort((a, b) => b.netEdgePerShare - a.netEdgePerShare);
  const tradeable = candidates.filter((s) => s.netEdgePerShare > 0);

  // also surface the ones we DROPPED for staleness — that's the honest part
  const droppedStale = liquid.filter((s) => !s.fresh.fresh);

  console.log(`# scored ${scored.length} fee-free in-band legs with a NO book`);
  console.log(`#   LIQUID + fillable (NO two-sided, spread<=${MAX_SPREAD}, fill>=${money(MIN_FILL_USD)}, vol24>=${money(MIN_VOL24H)}): ${liquid.length}`);
  console.log(`#   of which FRESH + two-sided (both books live, updated<=${FRESH_HOURS}h, has last-trade): ${liquidFresh.length}`);
  console.log(`#   dropped for STALENESS / one-sided (the trap from before): ${droppedStale.length}`);
  console.log(`#   FEE-FREE candidates with net-positive prior edge (TRADEABLE): ${tradeable.length}\n`);

  /* ---- 4) print candidates ---- */
  console.log('--- FEE-FREE LIQUID FRESH FADE CANDIDATES (sorted by implied net edge) ---');
  const show = candidates.slice(0, TOP);
  if (!show.length) {
    console.log('  none — no fee-free, liquid, fresh, in-band leg with net-positive prior edge.\n');
  } else {
    console.log('  edge/sh | band     | YESpx | NOcost | clip$  | priorNO | fillDepth | vol24      | upd(h) | ends       | leg / question');
    for (const s of show) {
      const star = s.netEdgePerShare > 0 ? '*' : ' ';
      const label = s.groupItemTitle ? `${s.groupItemTitle} — ${(s.field && s.field.title) || ''}` : s.question;
      console.log(
        `${star} ${c(s.netEdgePerShare).padStart(8)} | ${s.band.padEnd(8)} | ${f(s.yesPrice, 3).padStart(5)} | ` +
        `${c(s.executableNoCost).padStart(6)} | ${('$' + Math.round(s.clipUsd)).padStart(6)} | ` +
        `${(100 * s.priorRealizedNoRate).toFixed(0).padStart(3)}%    | ${money(s.liquidity.depthBuyUsd).padStart(9)} | ` +
        `${money(s.volume24hr).padStart(10)} | ${String(Math.round(s.fresh.updHours)).padStart(6)} | ` +
        `${String(s.endDate || '').slice(0, 10)} | ${String(label).slice(0, 50)}`
      );
    }
    console.log(`  (* = net-positive vs calibration prior. showing ${show.length}/${candidates.length})\n`);
  }

  // HONEST CAVEAT (same standard as scan-fls): the "edge" is prior-implied, not confirmed.
  console.log('  NOTE: "edge/sh" = priorRealizedNoRate(calibration bucket) - executableNoCost(VWAP, fee=0).');
  console.log('  The bucket NO-rates come from a universe of mutually-exclusive field legs where the mid-band');
  console.log('  YES is structurally overpriced ACROSS THE FIELD — it is NOT a per-market truth. A two-sided');
  console.log('  leg at YES=0.30 with NO ask ~0.70 may be the market FAIRLY pricing this specific candidate.');
  console.log('  Removing the fee makes the edge net IF it is real; whether it pays is decided ONLY at');
  console.log('  resolution. That is why the forward log below exists.\n');

  if (droppedStale.length) {
    console.log(`  (dropped ${droppedStale.length} liquid-but-stale/one-sided legs; e.g. ` +
      droppedStale.slice(0, 3).map((s) => `"${String(s.groupItemTitle || s.question).slice(0, 24)}" [${s.fresh.reason}]`).join('; ') + ')\n');
  }

  /* ---- 5) FORWARD LOG ---- */
  let wrote = null;
  if (WRITE && candidates.length) {
    const tag = todayTag();
    const outPath = path.join(RESEARCH_DIR, `feefree-fade-${tag}.json`);
    const snapshot = {
      generatedAt: new Date().toISOString(),
      strategy: 'FEE-FREE fade: buy NO on overpriced (mid/longshot YES) legs of fee-free liquid fields, hold to resolution',
      rationale: 'EDGES.md killed the fade via 3-7% taker fee + illiquidity. Geopolitics/world-leader markets are fee-free (feesEnabled=false) and liquid; here fee=0, so a real overpricing would be net-tradeable. Forward-scored only (backtesting dead markets fooled us before).',
      params: {
        clip: CLIP, minClipUsd: MIN_CLIP_USD, maxClipUsd: MAX_CLIP_USD,
        minFillUsd: MIN_FILL_USD, maxSpread: MAX_SPREAD, maxSlip: MAX_SLIP,
        minVol24h: MIN_VOL24H, freshHours: FRESH_HOURS,
        longshotBand: fls.LONGSHOT_BAND, midBand: fls.MID_BAND,
        feeModel: 'fee=0 (asserted feesEnabled===false, feeType/feeSchedule null per market)',
      },
      calibrationPrior: fls.CALIB_YESWIN.map(([lo, hi, n, mi, yw]) => ({
        yesLo: lo, yesHi: hi, n, meanImplYes: mi, realizedYesWin: yw, realizedNoRate: 1 - yw,
      })),
      universe: {
        liveEvents: events.length, liveMarkets: standalone.length,
        feeFreeFields, mutexFields, standaloneFeeFree,
        feeFreeLegs: allFeeFreeLegs.length, inBand: inBand.length, inBandLiquidPre: inBandVol.length,
        liquidFillable: liquid.length, liquidFresh: liquidFresh.length,
        droppedStale: droppedStale.length, candidates: candidates.length, netPositive: tradeable.length,
      },
      topFeeFreeFields: topFields.map((fl) => ({
        eventId: fl.eventId, title: fl.title, category: fl.category, negRisk: fl.negRisk,
        nLegs: fl.nLegs, multiCandidate: fl.isMultiCand, vol24hr: fl.vol24,
      })),
      candidates: candidates.map((s) => ({
        id: s.id, question: s.question,
        groupItemTitle: s.groupItemTitle,
        event: s.field ? { id: s.field.eventId, title: s.field.title, category: s.field.category, negRisk: s.field.negRisk, nLegs: s.field.nLegs, multiCandidate: s.field.isMultiCand } : null,
        band: s.band,
        yesPrice: s.yesPrice,
        noToken: s.noToken, yesToken: null,   // yesToken back-filled below from the matching leg
        // books / freshness (the anti-staleness evidence)
        noBestBid: s.noBestBid, noBestAsk: s.noBestAsk, noSpread: s.noSpread,
        yesBestBid: s.yesBestBid, yesBestAsk: s.yesBestAsk,
        lastTradePrice: s.lastTradePrice, oneDayPriceChange: s.oneDayPriceChange,
        updatedAt: s.updatedAt, updatedHoursAgo: Number(isFinite(s.fresh.updHours) ? s.fresh.updHours.toFixed(2) : null),
        twoSidedNo: s.fresh.noTwoSided, twoSidedYes: s.fresh.yesTwoSided, fresh: s.fresh.fresh,
        // executable entry (fee=0)
        feeFree: s.feeFree, feeApplied: s.feeApplied,
        executableNoCost: s.executableNoCost, executableNoCostNoFee: s.executableNoCostNoFee,
        clipShares: s.clipShares, clipUsd: s.clipUsd, fillableShares: s.fillableShares,
        fillableDepthUsd: s.liquidity.depthBuyUsd, fillableDepthShares: s.liquidity.depthBuyShares,
        volume24hr: s.volume24hr, endDate: s.endDate, negRisk: s.negRisk,
        // prior + edge
        priorRealizedNoRate: s.priorRealizedNoRate, calibBucket: s.calibBucket, calibN: s.calibN,
        netEdgePerShare: s.netEdgePerShare, netPositive: s.netEdgePerShare > 0,
        // to score at resolution: NO wins (pays $1) iff the market resolves NO.
        resolved: false, outcomeNoWon: null, realizedPnlPerShare: null, scoredAt: null,
      })),
    };
    // attach yesToken cleanly (we stored noToken on the leg; pull yesToken too)
    for (let i = 0; i < snapshot.candidates.length; i++) {
      const leg = inBandVol.find((l) => l.id === snapshot.candidates[i].id);
      snapshot.candidates[i].yesToken = leg ? leg.yesToken : null;
    }
    try {
      fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
      wrote = outPath;
      console.log(`# FORWARD LOG written: ${outPath}`);
      console.log(`#   ${candidates.length} fee-free liquid fresh candidates snapshotted (${tradeable.length} net-positive) for scoring at resolution.\n`);
    } catch (e) {
      console.log(`# WARN could not write forward log: ${e.message}\n`);
    }
  } else if (!candidates.length) {
    console.log('# no fee-free liquid fresh candidates to log this run.\n');
  } else {
    console.log('# (--no-write) forward log not written.\n');
  }

  /* ---- 6) SUMMARY / VERDICT ---- */
  console.log('============================================================');
  console.log('SUMMARY — is there a NET-TRADEABLE fade edge among FEE-FREE LIQUID markets?');
  console.log('============================================================');
  console.log(`# universe: ${events.length} events + ${standalone.length} markets -> ${feeFreeFields} fee-free fields (${mutexFields} multi-candidate mutex) + ${standaloneFeeFree} standalone -> ${allFeeFreeLegs.length} fee-free legs.`);
  console.log(`# in fade band: ${inBand.length} -> liquid+fillable: ${liquid.length} -> fresh+two-sided: ${liquidFresh.length} -> net-positive vs prior: ${tradeable.length}.`);
  if (tradeable.length) {
    const edges = tradeable.map((s) => s.netEdgePerShare).sort((a, b) => b - a);
    const capUsd = tradeable.reduce((a, s) => a + Math.min(MAX_CLIP_USD, s.liquidity.depthBuyUsd), 0);
    const medEdge = edges[Math.floor(edges.length / 2)];
    console.log(`# NET-POSITIVE candidates: ${tradeable.length}. Implied net edge/sh: max ${c(edges[0])}, median ${c(medEdge)}, min ${c(edges[edges.length - 1])}.`);
    console.log(`# approx fillable capacity (sum of min($${MAX_CLIP_USD}, depth) over net-positive legs): ${money(capUsd)}.`);
    console.log('# HONEST READ: removing the fee makes these net ON THE PRIOR — but the prior NO-rate is a');
    console.log('#   FIELD-LEVEL structural fact (only one candidate wins), NOT a guarantee for any single');
    console.log('#   leg the book quotes two-sided. Only the forward log scored at resolution proves it.');
  } else {
    console.log('# NO net-positive fee-free candidates this run: even with fee=0 and liquidity required,');
    console.log('#   the live NO ask on fresh two-sided legs already covers the prior NO-rate (the book is');
    console.log('#   fairly pricing the fade). Removing the fee did NOT, by itself, open a tradeable edge here.');
  }
  if (wrote) console.log(`# forward log: ${wrote}`);
  console.log(`\n# done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error('FATAL', (e && e.stack) || e); process.exit(1); });

/* helper for the early-exit path */
function finishEmpty(t0, u) {
  console.log('\n============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`# fee-free fields: ${u.feeFreeFields} (mutex ${u.mutexFields}), standalone ${u.standaloneFeeFree}, fee-free legs ${u.allFeeFreeLegs}, in-band ${u.inBand}.`);
  console.log('# 0 net candidates — nothing liquid+in-band to price.');
  console.log(`\n# done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
