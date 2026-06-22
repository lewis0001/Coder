'use strict';
/* ============================================================
   scripts/scan-mm.js — LIVE passive spread-capture scanner.
   ------------------------------------------------------------
   Pipeline:
     1) SCREEN the live Gamma universe for the wide-spread /
        liquid / slow-resolution profile (mm-live.screenMarkets).
     2) SAMPLE each surviving market's CLOB book repeatedly over a
        short live window (default ~12 min, every ~45s).
     3) ESTIMATE realized maker edge net of adverse selection from
        the time series (mm-live.estimateMarket): trade-through-only
        fills, marked to the subsequent mid.
     4) PRINT the markets where passive spread-capture is net
        positive, with numbers, plus the segment verdict.

   Honesty standard (same as the backtest that killed naive MM):
     - fill ONLY when the mid trades THROUGH our one-tick-inside quote
     - charge the FULL adverse move (mark to next mid)
     - never claim a fill the tape didn't justify

   Plain Node, zero deps. Polite: concurrency<=5, paced sampling.

   ENV overrides (all optional):
     MM_WINDOW_MIN   sampling window in minutes      (default 12)
     MM_INTERVAL_SEC seconds between snapshots        (default 45)
     MM_MAX_MARKETS  cap markets sampled              (default 24)
     MM_MIN_SPREAD   spread floor for screen          (default 0.03)
     MM_MIN_DAYS     days-to-resolution floor         (default 3)
     MM_MIN_VOL24    24h volume floor                 (default 500)
     MM_UNIVERSE     gamma markets to pull            (default 1500)
     MM_FAST         set=1 to do a 3-snapshot smoke run (debug)
   ============================================================ */

const ob = require('../lib/orderbook');
const mm = require('../lib/mm-live');

const ENV = process.env;
const FAST = ENV.MM_FAST === '1';
const WINDOW_MIN = num(ENV.MM_WINDOW_MIN, FAST ? 1 : 12);
const INTERVAL_SEC = num(ENV.MM_INTERVAL_SEC, FAST ? 20 : 45);
const MAX_MARKETS = num(ENV.MM_MAX_MARKETS, 24);
const MIN_SPREAD = num(ENV.MM_MIN_SPREAD, 0.03);
const MIN_DAYS = num(ENV.MM_MIN_DAYS, 3);
const MIN_VOL24 = num(ENV.MM_MIN_VOL24, 500);
const UNIVERSE = num(ENV.MM_UNIVERSE, 1500);
const CONCURRENCY = 5;

function num(v, d) { const n = +v; return Number.isFinite(n) ? n : d; }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function c(x) { return (x * 100).toFixed(2) + 'c'; }       // dollars -> cents string
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

async function main() {
  console.log('============================================================');
  console.log(' LIVE PASSIVE SPREAD-CAPTURE SCAN (market-making edge test)');
  console.log('============================================================');
  console.log(`start ${ts()}  window=${WINDOW_MIN}min  interval=${INTERVAL_SEC}s  maxMarkets=${MAX_MARKETS}`);
  console.log(`screen: spread>=${c(MIN_SPREAD)}  days>=${MIN_DAYS}  vol24>=$${MIN_VOL24}  price in [0.10,0.90]`);
  console.log('');

  /* ---- 1) SCREEN ---- */
  console.log(`[1/4] fetching live universe (up to ${UNIVERSE} markets by 24h volume)...`);
  const universe = await ob.liveMarkets({ limit: UNIVERSE });
  console.log(`      fetched ${universe.length} live markets`);

  const { kept, stats, params } = mm.screenMarkets(universe, {
    minSpread: MIN_SPREAD, minDays: MIN_DAYS, minVol24: MIN_VOL24,
  });
  console.log('      screen funnel:');
  console.log(`        total=${stats.total}  noBook=${stats.noBook}  tightSpread=${stats.tight}` +
    `  priceTail=${stats.tail}  tooSoon=${stats.tooSoon}  notAccepting=${stats.notAccepting}` +
    `  thinVol=${stats.thin}  noToken=${stats.noTok}`);
  console.log(`      => ${kept.length} markets clear the wide/liquid/slow profile`);
  if (!kept.length) { console.log('\nNo markets to sample. Done.'); return; }

  const sampleSet = kept.slice(0, MAX_MARKETS);
  console.log(`      sampling top ${sampleSet.length} by 24h volume:`);
  for (const m of sampleSet) {
    console.log(`        - [${m.days.toFixed(0)}d] spr~${c(m.spreadHint)} v24=$${Math.round(m.vol24)}` +
      `  ${m.question.slice(0, 54)}`);
  }
  console.log('');

  /* ---- 2) SAMPLE books over the live window ---- */
  const snapshots = num(ENV.MM_SNAPS, FAST ? 3 : Math.max(2, Math.round((WINDOW_MIN * 60) / INTERVAL_SEC) + 1));
  console.log(`[2/4] sampling ${snapshots} book snapshots per market over ~${WINDOW_MIN}min ` +
    `(every ${INTERVAL_SEC}s, concurrency=${CONCURRENCY})...`);

  const series = new Map();              // id -> [snapshot,...]
  for (const m of sampleSet) series.set(m.id, []);
  const tokenIds = sampleSet.map((m) => m.yesToken);

  for (let s = 0; s < snapshots; s++) {
    const t0 = Date.now();
    const books = await ob.getBooks(tokenIds, { concurrency: CONCURRENCY });
    let ok = 0;
    for (const m of sampleSet) {
      const book = books[m.yesToken];
      const snap = mm.snapshot(book, m.tick);
      if (snap) { series.get(m.id).push(snap); ok++; }
    }
    console.log(`      snap ${s + 1}/${snapshots} @ ${ts()}  books=${ok}/${sampleSet.length}` +
      `  (${Date.now() - t0}ms)`);
    if (s < snapshots - 1) {
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, INTERVAL_SEC * 1000 - elapsed);
      await sleep(wait);
    }
  }
  console.log('');

  /* ---- 3) ESTIMATE ---- */
  console.log('[3/4] estimating realized maker edge net of adverse selection...');
  const estimates = [];
  for (const m of sampleSet) {
    const e = mm.estimateMarket(series.get(m.id), { id: m.id, question: m.question, days: m.days });
    if (e) {
      e.spreadHint = m.spreadHint; e.vol24 = m.vol24; e.tick = m.tick;
      estimates.push(e);
    }
  }
  console.log(`      ${estimates.length} markets produced a usable time series`);
  console.log('');

  /* ---- 4) REPORT ---- */
  console.log('[4/4] RESULTS');
  console.log('------------------------------------------------------------');

  // Markets where passive spread-capture is NET POSITIVE per round-trip
  // AND actually traded on both sides (otherwise the round-trip is fiction).
  const tradablePos = estimates.filter((e) =>
    e.netRoundTrip > 0 && e.bidFills > 0 && e.askFills > 0);
  // Markets net positive but only one side observed trading (suggestive, not a full RT).
  const oneSidedPos = estimates.filter((e) =>
    e.netRoundTrip > 0 && !(e.bidFills > 0 && e.askFills > 0));

  console.log('\nPER-MARKET (sorted by net edge / round-trip):');
  console.log('  netRT = grossSpreadCaptured - adverseMove, per buy+sell round-trip');
  const sorted = [...estimates].sort((a, b) => b.netRoundTrip - a.netRoundTrip);
  console.log('  ' + ['days', 'spr', 'fills(b/a)', 'fillRt(b/a)', 'gross', 'adverse', 'netRT', 'cap(sh)', 'question'].join('\t'));
  for (const e of sorted) {
    console.log('  ' + [
      e.days.toFixed(0),
      c(e.medSpread),
      `${e.bidFills}/${e.askFills}`,
      `${pct(e.bidFillRate)}/${pct(e.askFillRate)}`,
      c(e.grossRoundTrip),
      c(e.adverseRoundTrip),
      c(e.netRoundTrip),
      Math.round(e.capacityShares),
      e.question.slice(0, 40),
    ].join('\t'));
  }

  console.log('\nMARKETS WHERE PASSIVE SPREAD-CAPTURE IS NET-POSITIVE (both sides traded):');
  if (!tradablePos.length) {
    console.log('  (none) — no market had a full positive round-trip in this window.');
  } else {
    for (const e of tradablePos.sort((a, b) => b.netRoundTrip - a.netRoundTrip)) {
      console.log(`  + ${e.question.slice(0, 50)}`);
      console.log(`      ${e.days.toFixed(0)}d to resolution | med spread ${c(e.medSpread)} | tick ${c(e.tick)}`);
      console.log(`      fills b/a: ${e.bidFills}/${e.askFills} over ${e.intervals} intervals ` +
        `(fillRate ${pct(e.bidFillRate)}/${pct(e.askFillRate)})`);
      console.log(`      gross capture ${c(e.grossRoundTrip)}/RT - adverse ${c(e.adverseRoundTrip)}/RT ` +
        `= NET ${c(e.netRoundTrip)}/RT`);
      console.log(`      capacity ~${Math.round(e.capacityShares)} sh at best | ` +
        `net $/RT @ that size ~ $${(e.netRoundTrip * e.capacityShares).toFixed(2)}`);
    }
  }

  if (oneSidedPos.length) {
    console.log('\n(one-sided positive — only one leg observed trading; NOT a confirmed round-trip):');
    for (const e of oneSidedPos.sort((a, b) => b.netRoundTrip - a.netRoundTrip)) {
      const side = e.bidFills > 0 ? 'bid' : (e.askFills > 0 ? 'ask' : 'none');
      console.log(`  ? ${e.question.slice(0, 50)} | ${side}-only net/leg ` +
        `${c(e.netBidPer || e.netAskPer)} | ${e.days.toFixed(0)}d`);
    }
  }

  /* ---- segment verdict ---- */
  const agg = mm.aggregate(estimates);
  console.log('\n------------------------------------------------------------');
  console.log('SEGMENT VERDICT (fill-weighted across all sampled markets):');
  console.log(`  markets sampled (usable):   ${agg.markets}`);
  console.log(`  total intervals observed:   ${agg.totIntervals}`);
  console.log(`  total fills bid/ask:        ${agg.totBidFills}/${agg.totAskFills}`);
  console.log(`  avg captured  bid/ask:      ${c(agg.capBid)} / ${c(agg.capAsk)} per fill`);
  console.log(`  avg adverse   bid/ask:      ${c(agg.advBid)} / ${c(agg.advAsk)} per fill`);
  console.log(`  GROSS spread / round-trip:  ${c(agg.grossRoundTrip)}`);
  console.log(`  ADVERSE move / round-trip:  ${c(agg.adverseRoundTrip)}`);
  console.log(`  NET edge     / round-trip:  ${c(agg.netRoundTrip)}`);
  console.log(`  median capacity at best:    ${Math.round(agg.medCapacity)} shares`);

  // Horizon breakdown — is the slow-resolution premise borne out?
  const byHoriz = [
    { name: 'short  (3-10d)', f: (e) => e.days >= 3 && e.days < 10 },
    { name: 'medium (10-60d)', f: (e) => e.days >= 10 && e.days < 60 },
    { name: 'long   (>=60d)', f: (e) => e.days >= 60 },
  ];
  console.log('\n  by horizon (fill-weighted net/round-trip):');
  for (const h of byHoriz) {
    const seg = estimates.filter(h.f);
    if (!seg.length) { console.log(`    ${h.name}: (no markets)`); continue; }
    const a = mm.aggregate(seg);
    console.log(`    ${h.name}: markets=${seg.length} fills=${a.totBidFills}/${a.totAskFills} ` +
      `gross=${c(a.grossRoundTrip)} adverse=${c(a.adverseRoundTrip)} NET=${c(a.netRoundTrip)}`);
  }

  console.log('\n------------------------------------------------------------');
  const verdict = agg.netRoundTrip > 0 && (agg.totBidFills > 0 && agg.totAskFills > 0);
  if (verdict) {
    console.log(`VERDICT: segment net edge ~${c(agg.netRoundTrip)}/round-trip POSITIVE ` +
      `across ${tradablePos.length} two-sided markets.`);
  } else {
    console.log('VERDICT: no net-positive spread-capture edge confirmed on this live segment.');
  }
  console.log(`done ${ts()}`);
}

main().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
