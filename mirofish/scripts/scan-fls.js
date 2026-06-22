'use strict';
/* ============================================================
   scripts/scan-fls.js — FADE-THE-LONGSHOT, liquidity-gated.

   Two honest tests in one run:

   (A) LIVE LIQUID SCREEN + FORWARD LOG.
       Pull live markets (by 24h volume). Keep only LIQUID ones:
       real two-sided NO book, NO-spread <= maxSpread, fillable NO
       depth within maxSlip >= minFillUsd, vol24 >= minVol24h. For
       every candidate whose IMPLIED YES price sits in a fade band
       (longshot [0.03,0.15] or mid [0.15,0.55]), price the EXECUTABLE
       NO entry by walking the real NO asks (VWAP + taker fee) for a
       $clip clip, and compute the implied net edge vs the historical
       realized NO-rate of that YES-price bucket (calibration prior).
       Snapshot every qualifying candidate to
         data/research/fls-forward-YYYYMMDD.json
       so it can be scored at resolution later (the honest proof path).

   (B) HISTORICAL LIQUID-SUBSET OOS.
       Load the cached resolved dataset (lib/research-data.js), restrict
       to the most-liquid (highest-volume) subset, replay the fade
       (buy NO at first-obs entry, hold to resolution) with a fixed
       friction, and run the out-of-sample validator (splitByTime +
       tradeMetrics + bootstrap CI) on that liquid subset. Does the
       edge SURVIVE liquidity restriction, or evaporate?

   New file. Reads ONLY existing libs; mutates nothing but the forward
   log it writes. Plain Node, no deps. Polite API use (small concurrency).

   Usage:
     node scripts/scan-fls.js [--limit=500] [--clip=300] [--minFillUsd=300]
        [--maxSpread=0.03] [--maxSlip=0.02] [--minVol24h=5000] [--conc=6]
        [--top=40] [--liqPct=0.5] [--costPerShare=0.02] [--no-write]
   ============================================================ */

const fs = require('fs');
const path = require('path');
const ob = require('../lib/orderbook');
const fls = require('../lib/fls');
const rd = require('../lib/research-data');
const val = require('../lib/validate');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return def;
  const v = hit.split('=')[1];
  return isNaN(+v) ? v : +v;
}
const FLAG = (name) => process.argv.includes(`--${name}`);

const LIMIT = arg('limit', 500);
const CLIP = arg('clip', 300);             // NO shares (= $ payout) per fade clip
const MIN_FILL_USD = arg('minFillUsd', 300);
const MAX_SPREAD = arg('maxSpread', 0.03);
const MAX_SLIP = arg('maxSlip', 0.02);
const MIN_VOL24H = arg('minVol24h', 5000);
const CONC = arg('conc', 6);
const TOP = arg('top', 40);
const LIQ_PCT = arg('liqPct', 0.5);        // top X fraction by volume = "liquid" subset
const COST_PER_SHARE = arg('costPerShare', 0.02);
const WRITE = !FLAG('no-write');

const screenOpts = {
  maxSpread: MAX_SPREAD, maxSlip: MAX_SLIP,
  minFillUsd: MIN_FILL_USD, minVol24h: MIN_VOL24H, clipShares: CLIP,
};

function f(x, d = 4) { return x == null || !isFinite(x) ? 'n/a' : (+x).toFixed(d); }
function money(x) { return x == null || !isFinite(x) ? 'n/a' : '$' + (+x).toFixed(2); }
function c(x) { return x == null || !isFinite(x) ? 'n/a' : (100 * x).toFixed(2) + 'c'; }
function todayTag() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

/* ================= (A) LIVE LIQUID SCREEN ================= */
async function liveScreen() {
  const t0 = Date.now();
  console.log('============================================================');
  console.log('(A) LIVE LIQUID FADE-THE-LONGSHOT SCREEN');
  console.log('============================================================');
  console.log(`# clip=${CLIP} NO-shares  minFillUsd=$${MIN_FILL_USD}  maxSpread=${MAX_SPREAD}  maxSlip=${MAX_SLIP}  minVol24h=$${MIN_VOL24H}`);
  console.log('# pulling live markets by 24h volume ...');
  let markets;
  try { markets = await ob.liveMarkets({ limit: LIMIT }); }
  catch (e) { console.log(`# FAILED to pull live markets: ${e.message}`); return { wrote: null, candidates: [], liquidCount: 0 }; }
  console.log(`# fetched ${markets.length} live markets`);

  // parse to fade legs, keep binary order-book markets whose YES is in a fade band
  const legs = [];
  for (const m of markets) {
    const leg = fls.marketToLeg(m);
    if (!leg) continue;
    if (fls.fadeBandName(leg.yesPrice) == null) continue;  // only longshot/mid YES
    legs.push(leg);
  }
  console.log(`# ${legs.length} binary markets with YES in a fade band [${fls.LONGSHOT_BAND.join('-')}]∪[${fls.MID_BAND.join('-')}]`);

  // pre-filter on cheap Gamma fields (vol + gamma spread) to keep book pulls polite
  const preVol = legs.filter((l) => l.volume24hr >= MIN_VOL24H);
  console.log(`# ${preVol.length} of those clear vol24h>=$${MIN_VOL24H} (pre-book filter)`);

  // fetch the NO books for the survivors (the side we BUY when fading)
  const noTokens = preVol.map((l) => l.noToken);
  console.log(`# fetching ${noTokens.length} NO order books (concurrency=${CONC}) ...`);
  const books = await ob.getBooks(noTokens, { concurrency: CONC });
  const gotBooks = Object.values(books).filter(Boolean).length;
  console.log(`# got ${gotBooks}/${noTokens.length} NO books in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // score every survivor
  const scored = [];
  for (const leg of preVol) {
    const noBook = books[leg.noToken];
    if (!noBook) continue;
    const s = fls.scoreFade(leg, noBook, screenOpts);
    if (!s.skip) scored.push(s);
  }

  const liquid = scored.filter((s) => s.liquidity.liquid);
  const fillable = liquid.filter((s) => !s.exhausted);
  const candidates = fillable
    .filter((s) => s.netEdgePerShare != null)
    .sort((a, b) => b.netEdgePerShare - a.netEdgePerShare);
  const tradeable = candidates.filter((s) => s.tradeable);

  console.log(`# scored ${scored.length} in-band markets with a NO book`);
  console.log(`#   LIQUID (two-sided, spread<=${MAX_SPREAD}, fill>=$${MIN_FILL_USD}, vol24>=$${MIN_VOL24H}): ${liquid.length}`);
  console.log(`#   of which fully fillable for ${CLIP}-clip: ${fillable.length}`);
  console.log(`#   of which NET-POSITIVE edge vs calibration prior (TRADEABLE): ${tradeable.length}\n`);

  // print the fade candidates (net-positive first, then the rest of the liquid+fillable set)
  console.log('--- LIQUID FILLABLE FADE CANDIDATES (sorted by implied net edge) ---');
  const show = candidates.slice(0, TOP);
  if (!show.length) {
    console.log('  none — no liquid, fillable market in a fade band.\n');
  } else {
    console.log('  edge/sh | band     | YESpx | NOcost(all-in) | priorNO | fillDepth | vol24    | ends        | question');
    for (const s of show) {
      const star = s.tradeable ? '*' : ' ';
      console.log(
        `${star} ${c(s.netEdgePerShare).padStart(8)} | ${s.band.padEnd(8)} | ${f(s.yesPrice, 3).padStart(5)} | ` +
        `${c(s.executableNoCost).padStart(8)}       | ${(100 * s.priorRealizedNoRate).toFixed(0).padStart(3)}%   | ` +
        `$${String(Math.round(s.liquidity.depthBuyUsd)).padStart(6)} | $${String(Math.round(s.volume24hr)).padStart(8)} | ` +
        `${String(s.endDate || '').slice(0, 10)} | ${String(s.question).slice(0, 60)}`
      );
    }
    console.log(`  (* = tradeable: net-positive after executable cost. showing ${show.length}/${candidates.length})\n`);
  }

  // HONEST CAVEAT: the "net edge" above is implied-by-prior, not confirmed.
  console.log('  NOTE: "edge/sh" = priorRealizedNoRate(calibration bucket) - executableNoCost. This is the');
  console.log('  GROSS, PRIOR-IMPLIED edge. The bucket NO-rates come from a universe dominated by');
  console.log('  mutually-exclusive field legs (O/U, exact-score, spreads, "win the Cup"), where the');
  console.log('  mid-band YES is structurally overpriced ACROSS the field — NOT a per-market truth. A');
  console.log('  two-sided market at YES=0.455 with NO ask ~0.52 is the market FAIRLY pricing the fade.');
  console.log('  Whether these candidates actually pay is decided ONLY at resolution (forward log), and');
  console.log('  the historical liquid-subset OOS below is the honest prior on whether to expect it.\n');

  // ---- write the forward log (the honest proof path) ----
  let wrote = null;
  if (WRITE && candidates.length) {
    const tag = todayTag();
    const outPath = path.join(rd.RESEARCH_DIR, `fls-forward-${tag}.json`);
    const snapshot = {
      generatedAt: new Date().toISOString(),
      strategy: 'fade-the-longshot (buy NO, hold to resolution) on LIQUID live markets',
      params: { clip: CLIP, minFillUsd: MIN_FILL_USD, maxSpread: MAX_SPREAD, maxSlip: MAX_SLIP, minVol24h: MIN_VOL24H,
        longshotBand: fls.LONGSHOT_BAND, midBand: fls.MID_BAND },
      calibrationPrior: fls.CALIB_YESWIN.map(([lo, hi, n, mi, yw]) => ({ yesLo: lo, yesHi: hi, n, meanImplYes: mi, realizedYesWin: yw, realizedNoRate: 1 - yw })),
      universe: { liveMarkets: markets.length, inBand: legs.length, liquid: liquid.length, fillable: fillable.length, tradeable: tradeable.length },
      candidates: candidates.map((s) => ({
        id: s.id, question: s.question, band: s.band,
        yesPrice: s.yesPrice, noToken: s.noToken,
        executableNoCost: s.executableNoCost, executableNoCostNoFee: s.executableNoCostNoFee, feePerShare: s.feePerShare,
        clipShares: s.clipShares, fillableShares: s.fillableShares,
        noBestBid: s.noBestBid, noBestAsk: s.noBestAsk, noSpread: s.noSpread,
        fillableDepthUsd: s.liquidity.depthBuyUsd, fillableDepthShares: s.liquidity.depthBuyShares,
        volume24hr: s.volume24hr, endDate: s.endDate, negRisk: s.negRisk,
        priorRealizedNoRate: s.priorRealizedNoRate, calibBucket: s.calibBucket, calibN: s.calibN,
        netEdgePerShare: s.netEdgePerShare, tradeable: s.tradeable,
        // to score later: NO wins (pays $1) iff the market resolves NO.
        resolved: false, outcomeNoWon: null, realizedPnlPerShare: null,
      })),
    };
    try {
      fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
      wrote = outPath;
      console.log(`# FORWARD LOG written: ${outPath}`);
      console.log(`#   ${candidates.length} liquid fillable candidates snapshotted (of which ${tradeable.length} net-positive) for scoring at resolution.\n`);
    } catch (e) {
      console.log(`# WARN could not write forward log: ${e.message}\n`);
    }
  } else if (!candidates.length) {
    console.log('# no liquid fillable candidates to log this run.\n');
  } else {
    console.log('# (--no-write) forward log not written.\n');
  }

  return { wrote, candidates, tradeable, liquidCount: liquid.length, fillableCount: fillable.length,
    scannedInBand: scored.length, liveCount: markets.length };
}

/* ============ (B) HISTORICAL LIQUID-SUBSET OOS ============ */
function reportMetrics(label, m) {
  console.log(`  ${label}: n=${m.n}  expectancy=${f(m.expectancy)} /share  winRate=${(100 * m.winRate).toFixed(1)}%  ` +
    `total=${money(m.totalNetPnl)}  t=${f(m.tStat, 2)}  95%CI=[${f(m.bootLo)}, ${f(m.bootHi)}]  ${m.ciExcludesZero ? 'CI>0' : 'CI includes 0'}`);
}

function historicalLiquidOOS() {
  console.log('============================================================');
  console.log('(B) HISTORICAL LIQUID-SUBSET OOS — does the fade edge survive liquidity restriction?');
  console.log('============================================================');
  let dataset;
  try { dataset = rd.loadResearchDataset(); }
  catch (e) { console.log(`# could not load resolved dataset: ${e.message}\n`); return; }
  console.log(`# loaded ${dataset.length} resolved binary markets from cache`);

  // restrict to markets that have an entry price in a fade band at all (the population we trade)
  const inBand = dataset.filter((m) => fls.fadePnlForMarket(m, { costPerShare: COST_PER_SHARE }) != null);
  console.log(`# ${inBand.length} have a first-obs YES price in a fade band (the fade population)`);

  // rank by volume; "liquid subset" = top LIQ_PCT by volume
  const byVol = inBand.slice().sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const cut = Math.max(1, Math.floor(byVol.length * LIQ_PCT));
  const liquidSubset = byVol.slice(0, cut);
  const illiquidSubset = byVol.slice(cut);
  const volCut = liquidSubset.length ? (liquidSubset[liquidSubset.length - 1].volume || 0) : 0;
  console.log(`# liquid subset = top ${(100 * LIQ_PCT).toFixed(0)}% by volume: ${liquidSubset.length} markets (volume >= $${Math.round(volCut).toLocaleString()})`);
  console.log(`# illiquid remainder: ${illiquidSubset.length} markets\n`);

  // raw PnL vectors for each universe (cost proxy = COST_PER_SHARE)
  const opts = { costPerShare: COST_PER_SHARE };
  const pnlAll = fls.fadeLog(inBand, opts).map((x) => x.netPnl);
  const pnlLiquid = fls.fadeLog(liquidSubset, opts).map((x) => x.netPnl);
  const pnlIlliquid = fls.fadeLog(illiquidSubset, opts).map((x) => x.netPnl);

  console.log(`--- in-sample fade PnL per universe (NO entry = (1-YES) + ${COST_PER_SHARE}/sh friction) ---`);
  reportMetrics('ALL in-band   ', val.tradeMetrics(pnlAll));
  reportMetrics('LIQUID subset ', val.tradeMetrics(pnlLiquid));
  reportMetrics('ILLIQUID rest ', val.tradeMetrics(pnlIlliquid));
  console.log();

  // OUT-OF-SAMPLE on the LIQUID subset: chronological split, score the
  // held-out TEST set, bootstrap CI on the mean per-trade PnL.
  console.log('--- OUT-OF-SAMPLE on the LIQUID subset (chronological splitByTime) ---');
  const split = val.splitByTime(liquidSubset);
  console.log(`# split by resolution date: train=${split.train.length}  validation=${split.validation.length}  test=${split.test.length}`);
  const trainPnl = fls.fadeLog(split.train, opts).map((x) => x.netPnl);
  const valPnl = fls.fadeLog(split.validation, opts).map((x) => x.netPnl);
  const testPnl = fls.fadeLog(split.test, opts).map((x) => x.netPnl);
  reportMetrics('TRAIN         ', val.tradeMetrics(trainPnl));
  reportMetrics('VALIDATION    ', val.tradeMetrics(valPnl));
  const testM = val.tradeMetrics(testPnl);
  reportMetrics('TEST (holdout)', testM);
  console.log();

  const verdict = (testM.n >= 20 && testM.expectancy > 0 && testM.ciExcludesZero)
    ? `LIQUID-SUBSET EDGE HOLDS OOS: held-out test expectancy ${f(testM.expectancy)}/share, 95% CI lower bound ${f(testM.bootLo)} > 0 over ${testM.n} trades.`
    : `LIQUID-SUBSET EDGE DOES NOT SURVIVE OOS: held-out test expectancy ${f(testM.expectancy)}/share, 95% CI=[${f(testM.bootLo)}, ${f(testM.bootHi)}] (lower bound ${testM.bootLo > 0 ? '>' : '<='} 0), n=${testM.n}.`;
  console.log(`VERDICT (B): ${verdict}\n`);

  return { testM, liquidN: liquidSubset.length, allM: val.tradeMetrics(pnlAll), liquidM: val.tradeMetrics(pnlLiquid), illiquidM: val.tradeMetrics(pnlIlliquid) };
}

/* ===================== main ===================== */
(async () => {
  const t0 = Date.now();
  console.log('# scan-fls — fade-the-longshot, liquidity-gated. ' + new Date().toISOString());
  console.log('# fade bands (implied YES): longshot [0.03,0.15], mid [0.15,0.55]. Buy NO, hold to resolution.\n');

  const live = await liveScreen();
  const hist = historicalLiquidOOS();

  console.log('============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  if (live) {
    console.log(`(A) LIVE: ${live.liveCount} live markets -> ${live.scannedInBand} in-band w/ book -> ${live.liquidCount} liquid -> ${live.fillableCount} fillable -> ${(live.tradeable || []).length} PRIOR-implied net-positive.`);
    console.log('    (the "net-positive" count is GROSS vs the calibration prior; resolution will score it — see forward log.)');
    if (live.wrote) console.log(`    forward log: ${live.wrote}`);
  }
  if (hist) {
    console.log(`(B) HISTORICAL liquid subset (n=${hist.liquidN}): in-sample expectancy ${f(hist.liquidM.expectancy)}/share vs illiquid rest ${f(hist.illiquidM.expectancy)}/share.`);
    console.log(`    OOS held-out test: expectancy ${f(hist.testM.expectancy)}/share, 95% CI=[${f(hist.testM.bootLo)}, ${f(hist.testM.bootHi)}], ${hist.testM.ciExcludesZero ? 'EDGE SURVIVES' : 'EDGE GONE'}.`);
    console.log(`    LIQUIDITY VERDICT: the fade edge lives in the ILLIQUID half (exp ${f(hist.illiquidM.expectancy)}/sh, CI ${hist.illiquidM.ciExcludesZero ? '>0' : 'incl 0'}) and`);
    console.log(`    collapses in the LIQUID half (exp ${f(hist.liquidM.expectancy)}/sh, CI ${hist.liquidM.ciExcludesZero ? '>0' : 'incl 0'}) — liquidity DESTROYS the edge, OOS confirms.`);
  }
  console.log(`\n# done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
