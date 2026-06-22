'use strict';
/* ============================================================
   scripts/events-edge.js
   ------------------------------------------------------------
   EXOTIC STRUCTURAL EDGE: the overround / Dutch-book in RESOLVED
   MUTUALLY-EXCLUSIVE (negRisk) Polymarket events.

   THESIS (from data/research/calibration-study.md): in an event where
   EXACTLY ONE of N legs can resolve YES (e.g. "NBA Champion"), the YES
   prices across all legs should sum to ~1. Historically they often sum
   to MORE than 1 (the "overround"): the basket of mid/longshot legs is
   collectively overpriced, so by construction all-but-one settle NO.
   Shorting the basket (buy NO on the legs) then profits.

   This script:
     1) GATHERS resolved negRisk events + per-leg YES price histories
        (cached, offline reruns) via lib/events-data.js.
     2) Measures the historical OVERROUND distribution (sum YES - 1),
        time-aligned hourly, at several entry timings, early vs late.
     3) BACKTESTS two families with an HONEST cost model (cross a
        per-leg spread; settle at par):
          S1 BASKET SHORT  — buy NO on a band of legs when overround>thr
          S2 LEG MID-BAND  — buy NO on legs whose YES is in a band
        across a GRID of configs (legs-bucket, category, timing, volume,
        overround threshold, leg band, spread).
     4) VALIDATES the whole grid through the anti-overfitting harness:
        chronological split by resolution date, selectAndConfirm with
        N = #configs (Bonferroni + White reality-check), then a SINGLE
        touch of the LOCKED holdout requiring bootstrap CI lower bound>0.
     5) Writes data/research/events-edge-report.md.

   Plain Node, zero deps. Polite to the API. cwd-independent.

   Usage:
     node scripts/events-edge.js [--gather] [--refresh]
       [--max-offset=2000] [--max-events=N] [--concurrency=5]
   ============================================================ */

const fs = require('fs');
const path = require('path');

const {
  fetchCandidateEvents,
  fetchEventHistories,
  loadEventsDataset,
  EVENTS_DIR,
  EVENTS_HIST_DIR,
  EVENTS_CACHE,
  EVENTS_MANIFEST,
} = require('../lib/events-data');

const {
  splitByTime,
  selectAndConfirm,
  tradeMetrics,
} = require('../lib/validate');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  if (process.argv.includes(`--${name}`)) return true;
  return def;
}
function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch { /* exists */ } }

const HOUR = 3600; // seconds
const DAY = 86400;

/* ============================================================
   GATHER — build the cached events dataset
   ============================================================ */
async function gather({ maxOffset, maxEvents, concurrency, refresh }) {
  ensureDir(EVENTS_DIR); ensureDir(EVENTS_HIST_DIR);
  console.log('============================================================');
  console.log(' mirofish — EVENTS dataset builder (resolved negRisk events)');
  console.log('============================================================');
  console.log(` maxOffset=${maxOffset} maxEvents=${maxEvents} concurrency=${concurrency} refresh=${!!refresh}`);

  // 1) candidate events (cached metadata)
  let events;
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(EVENTS_CACHE, 'utf8'));
      if (Array.isArray(cached) && cached.length) { events = cached; console.log(`\n[1/3] event metadata from cache: ${events.length} mutually-exclusive resolved events`); }
    } catch { /* fetch below */ }
  }
  if (!events) {
    console.log('\n[1/3] paging RESOLVED negRisk events from Gamma (by volume, multiple orderings)...');
    events = await fetchCandidateEvents({
      maxOffset, maxEvents,
      onProgress: ({ order, ascending, offset, added, total }) => {
        if (offset % 500 === 0 || added > 0) {
          process.stdout.write(`\r   order=${order}/${ascending ? 'asc' : 'desc'} offset=${String(offset).padStart(4)} +${String(added).padStart(3)} usable-events total=${total}     `);
        }
      },
    });
    process.stdout.write('\n');
    try { fs.writeFileSync(EVENTS_CACHE, JSON.stringify(events)); } catch { /* best-effort */ }
    console.log(`   discovered ${events.length} unique mutually-exclusive resolved events`);
  }

  // 2) fetch + cache per-leg histories
  const totalLegs = events.reduce((a, e) => a + e.legs.length, 0);
  console.log(`\n[2/3] fetching + caching YES histories for ${totalLegs} legs across ${events.length} events...`);
  const t0 = Date.now();
  const cov = await fetchEventHistories(events, {
    concurrency, refresh,
    onProgress: ({ done, total, withData }) => {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      process.stdout.write(`\r   ${done}/${total} legs  withData=${withData}  ${secs}s     `);
    },
  });
  process.stdout.write('\n');
  console.log(`   legs=${cov.legs} withData=${cov.withData} (${((cov.withData / (cov.legs || 1)) * 100).toFixed(1)}%)`);

  // 3) manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'gamma-api.polymarket.com (events?closed=true,negRisk) + clob prices-history',
    counts: { events: events.length, legs: cov.legs, legsWithData: cov.withData },
    events: events.map((e) => ({
      id: e.id, title: e.title, category: e.category, negRisk: true,
      nLegs: e.nLegs, winnerIdx: e.winnerIdx, endDate: e.endDate, endMs: e.endMs, volume: e.volume,
      legs: e.legs.map((l) => ({ id: l.id, title: l.title, yesTokenId: l.yesTokenId, yesWon: l.yesWon, volume: l.volume, points: l.points || 0 })),
    })),
  };
  try { fs.writeFileSync(EVENTS_MANIFEST, JSON.stringify(manifest)); console.log(`\n  manifest written: ${EVENTS_MANIFEST}`); }
  catch (e) { console.log(`\n  FAILED to write manifest: ${e.message}`); }
  console.log(' gather done.\n');
}

/* ============================================================
   TIME ALIGNMENT — step-function YES price, no look-ahead
   ============================================================ */
// last observed price at or before time t (seconds). null if t is before first point.
function priceAt(path, t) {
  if (!path.length || t < path[0].t) return null;
  // binary search for last index with path[i].t <= t
  let lo = 0, hi = path.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (path[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (ans < 0) return null;
  const p = path[ans].p;
  return (isFinite(p) && p > 0 && p < 1) ? p : null; // exclude degenerate settled quotes
}

// resolution time for an event (seconds): endMs if present, else last leg point.
function eventResolveT(ev) {
  if (ev.endMs) return Math.floor(ev.endMs / 1000);
  let mx = 0;
  for (const lg of ev.legs) if (lg.path.length) mx = Math.max(mx, lg.path[lg.path.length - 1].t);
  return mx || null;
}

// earliest time at which >=minLive legs simultaneously have a (live) price.
function firstAllLiveT(ev, minLive) {
  // candidate times = each leg's first point; the first time enough legs are live.
  const firsts = ev.legs.filter((l) => l.path.length).map((l) => l.path[0].t).sort((a, b) => a - b);
  for (const t of firsts) {
    let live = 0;
    for (const lg of ev.legs) if (priceAt(lg.path, t) != null) live++;
    if (live >= minLive) return t;
  }
  return null;
}

/* Build the snapshot of YES prices for all legs at time t (only legs live at t).
   Returns { snap:[{leg, yes}], overround, nLive }. */
function snapshotAt(ev, t) {
  const snap = [];
  let sum = 0;
  for (const lg of ev.legs) {
    const yes = priceAt(lg.path, t);
    if (yes == null) continue;
    snap.push({ leg: lg, yes });
    sum += yes;
  }
  return { snap, overround: sum - 1, nLive: snap.length };
}

/* Choose the entry time for an event under a timing rule.
   'first'  : first hour with >=minLive legs live.
   '7d'     : resolveT - 7d (clamped to >= firstAllLive).
   '1d'     : resolveT - 1d.
   Returns t (seconds) or null. No look-ahead: uses only resolveT (known
   ex-ante as the event end) + leg-live structure. */
function entryTime(ev, timing, minLive) {
  const first = firstAllLiveT(ev, minLive);
  if (first == null) return null;
  const res = eventResolveT(ev);
  if (timing === 'first') return first;
  if (res == null) return null;
  const target = timing === '7d' ? res - 7 * DAY : res - 1 * DAY;
  // need the target to be at/after first-live AND strictly before resolution
  if (target < first) return null;
  if (target >= res - HOUR) return null;
  return target;
}

/* ============================================================
   BACKTEST — one event under one config -> { log:[{netPnl}] }
   ------------------------------------------------------------
   Per-leg NO position: cost = (1 - yes) + spread/2 ; crossing the spread.
   Payoff at resolution = 1 if leg LOST (yesWon=false) else 0.
   netPnl = payoff - cost.  (One unit per leg.)

   S1 BASKET: only enter if overround at entry > minOverround. Then short
      NO on every live leg whose YES is within [bandLo,bandHi]. (band can be
      [0,1] for the full basket.) Each shorted leg = one trade.
   S2 MIDBAND: ignore overround; short NO on every live leg whose YES is in
      [bandLo,bandHi]. Each shorted leg = one trade.
   Filters: legsBucket (#legs), category, volume tier applied to the EVENT.
   ============================================================ */
function legsBucketOf(n) {
  if (n <= 5) return '3-5';
  if (n <= 10) return '6-10';
  if (n <= 20) return '11-20';
  return '21+';
}

function backtestEvent(ev, cfg, volTiers) {
  // event-level filters
  if (cfg.legsBucket && cfg.legsBucket !== 'all' && legsBucketOf(ev.nLegs) !== cfg.legsBucket) return { log: [] };
  if (cfg.category && cfg.category !== 'all' && ev.category !== cfg.category) return { log: [] };
  if (cfg.volTier && cfg.volTier !== 'all') {
    const tier = ev.volume <= volTiers.lo ? 'low' : (ev.volume <= volTiers.hi ? 'med' : 'high');
    if (tier !== cfg.volTier) return { log: [] };
  }

  const t = entryTime(ev, cfg.timing, cfg.minLive);
  if (t == null) return { log: [] };
  const { snap, overround, nLive } = snapshotAt(ev, t);
  if (nLive < cfg.minLive) return { log: [] };

  if (cfg.strategy === 'basket' && overround <= cfg.minOverround) return { log: [] };

  const half = cfg.spread / 2;
  const log = [];
  for (const { leg, yes } of snap) {
    if (yes < cfg.bandLo || yes > cfg.bandHi) continue;
    const cost = (1 - yes) + half;      // buy NO, cross the spread
    const payoff = leg.yesWon ? 0 : 1;  // NO pays 1 unless this leg won
    log.push({ netPnl: payoff - cost });
  }
  return { log };
}

/* ============================================================
   OVERROUND DISTRIBUTION — descriptive (not a trade)
   ============================================================ */
function quantiles(xs, ps) {
  if (!xs.length) return ps.map(() => null);
  const s = xs.slice().sort((a, b) => a - b);
  return ps.map((p) => {
    const idx = Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))));
    return s[idx];
  });
}

function overroundStats(events, timing, minLive) {
  const vals = [];
  const covFrac = [];
  for (const ev of events) {
    const t = entryTime(ev, timing, minLive);
    if (t == null) continue;
    const { overround, nLive } = snapshotAt(ev, t);
    if (nLive < minLive) continue;
    vals.push(overround);
    covFrac.push(nLive / ev.nLegs);
  }
  const [p25, p50, p75] = quantiles(vals, [0.25, 0.5, 0.75]);
  return {
    n: vals.length,
    median: p50, p25, p75,
    mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    fracPositive: vals.length ? vals.filter((v) => v > 0).length / vals.length : null,
    medianCoverage: quantiles(covFrac, [0.5])[0],
  };
}

/* ============================================================
   GRID — build ~100-300 configs
   ============================================================ */
function buildGrid() {
  const timings = ['first', '7d', '1d'];
  const spreads = [0.02, 0.01];
  const legsBuckets = ['all', '3-5', '6-10', '11-20', '21+'];
  const cfgs = [];

  // S1 BASKET SHORT — sweep overround threshold + leg band + timing + legsBucket
  const overThr = [0.00, 0.05, 0.10, 0.20];
  const basketBands = [[0, 1], [0.05, 0.65], [0.10, 0.50], [0.15, 0.65]];
  for (const spread of spreads)
    for (const timing of timings)
      for (const lb of legsBuckets)
        for (const thr of overThr)
          for (const [bandLo, bandHi] of basketBands)
            cfgs.push({ strategy: 'basket', spread, timing, legsBucket: lb, category: 'all', volTier: 'all', minOverround: thr, bandLo, bandHi, minLive: 3 });

  // S2 LEG MID-BAND NO — sweep band + timing + legsBucket (+ a couple category cuts)
  const midBands = [[0.15, 0.65], [0.25, 0.55], [0.30, 0.50], [0.35, 0.65], [0.40, 0.60], [0.20, 0.80]];
  const cats = ['all', 'sports', 'politics', 'crypto'];
  for (const spread of spreads)
    for (const timing of timings)
      for (const [bandLo, bandHi] of midBands)
        for (const cat of cats)
          cfgs.push({ strategy: 'midband', spread, timing, legsBucket: 'all', category: cat, volTier: 'all', minOverround: -Infinity, bandLo, bandHi, minLive: 3 });

  return cfgs;
}

function cfgLabel(c) {
  const band = `[${c.bandLo},${c.bandHi}]`;
  if (c.strategy === 'basket') return `BASKET sp=${c.spread} ${c.timing} legs=${c.legsBucket} over>${c.minOverround} band=${band}`;
  return `MIDBAND sp=${c.spread} ${c.timing} cat=${c.category} band=${band}`;
}

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const doGather = !!arg('gather', false);
  const refresh = !!arg('refresh', false);
  const maxOffset = Number(arg('max-offset', 2000));
  const maxEvents = Number(arg('max-events', Infinity));
  const concurrency = Number(arg('concurrency', 5));

  if (doGather || refresh || !fs.existsSync(EVENTS_MANIFEST)) {
    await gather({ maxOffset, maxEvents, concurrency, refresh });
  } else {
    console.log('Using cached events manifest (pass --gather to rebuild).');
  }

  // Load + keep events with enough legs that have usable history (overround meaningful).
  const events = loadEventsDataset({ minLegsWithData: 3, minPoints: 5 });
  console.log(`\nLoaded ${events.length} events with >=3 legs that have usable price history.`);
  if (events.length < 30) {
    console.log('Too few usable events to run the grid honestly. Run with --gather first.');
    return;
  }

  // Volume tertiles (event volume) for the volTier filter.
  const vols = events.map((e) => e.volume).sort((a, b) => a - b);
  const volTiers = { lo: vols[Math.floor(vols.length / 3)], hi: vols[Math.floor((2 * vols.length) / 3)] };

  // ---- Descriptive: overround distribution + early vs late ----
  const orFirst = overroundStats(events, 'first', 3);
  const or7d = overroundStats(events, '7d', 3);
  const or1d = overroundStats(events, '1d', 3);

  // ---- Chronological split by resolution date ----
  // validate.js resolutionTime() reads endDate; events carry endDate.
  const split = splitByTime(events, { trainFrac: 0.5, valFrac: 0.25 });
  console.log(`Split by resolution date: train=${split.train.length} val=${split.validation.length} test=${split.test.length}`);

  // ---- Grid ----
  const grid = buildGrid();
  console.log(`Grid: ${grid.length} configs. Running selectAndConfirm (touches holdout once)...`);

  const backtestFn = (ev, cfg) => backtestEvent(ev, cfg, volTiers);

  // Run the honest pipeline separately at each spread so each verdict is clean
  // and the multiple-testing N reflects the configs at that cost level.
  const results = {};
  for (const spread of [0.02, 0.01]) {
    const subgrid = grid.filter((c) => c.spread === spread);
    const res = selectAndConfirm(subgrid, split, backtestFn, {
      alpha: 0.05, bootIters: 3000, rcIters: 3000, minTrades: 50,
    });
    // Also compute full-sample (all events) stats for the chosen config, for context.
    let allStats = null;
    if (res.bestCandidate) {
      const pnls = [];
      for (const ev of events) { const r = backtestFn(ev, res.bestCandidate); for (const tr of r.log) pnls.push(tr.netPnl); }
      allStats = tradeMetrics(pnls, { bootIters: 3000 });
    }
    results[spread] = { res, subgridN: subgrid.length, allStats };
    console.log(`\n[spread=${spread}] best=${res.bestCandidate ? cfgLabel(res.bestCandidate) : 'n/a'}`);
    console.log(`  ${res.verdict}`);
  }

  // ---- Also: per-config validation leaderboard at each spread (for the report) ----
  function leaderboard(spread, topK = 12) {
    const subgrid = grid.filter((c) => c.spread === spread);
    const rows = subgrid.map((cfg) => {
      const pnls = [];
      for (const ev of split.validation) { const r = backtestFn(ev, cfg); for (const tr of r.log) pnls.push(tr.netPnl); }
      const st = tradeMetrics(pnls, { bootIters: 1500 });
      return { cfg, st };
    }).filter((r) => r.st.n >= 50);
    rows.sort((a, b) => b.st.expectancy - a.st.expectancy);
    return rows.slice(0, topK);
  }
  const lb02 = leaderboard(0.02);
  const lb01 = leaderboard(0.01);

  // ---- Category robustness of the chosen config (full sample, per category) ----
  // The usable sample is coverage-biased toward categories whose CLOB history
  // survived (mostly sports). Decompose the winning config by category so the
  // verdict is honest about WHERE the edge actually lives.
  function categoryBreakdown(cand) {
    const byCatPnl = {};
    for (const ev of events) {
      const r = backtestFn(ev, cand);
      if (!r.log.length) continue;
      (byCatPnl[ev.category] ||= []).push(...r.log.map((t) => t.netPnl));
    }
    const rows = [];
    for (const [cat, pnls] of Object.entries(byCatPnl)) {
      rows.push({ cat, st: tradeMetrics(pnls, { bootIters: 2000 }) });
    }
    rows.sort((a, b) => b.st.n - a.st.n);
    return rows;
  }
  const catRows = categoryBreakdown(results[0.02].res.bestCandidate || buildGrid()[0]);

  // ============================================================
  // WRITE REPORT
  // ============================================================
  const L = [];
  const f = (x, d = 4) => (x == null ? 'n/a' : Number(x).toFixed(d));
  const pc = (x, d = 1) => (x == null ? 'n/a' : (100 * x).toFixed(d) + '%');

  L.push('# Polymarket EVENTS overround / Dutch-book edge — mutually-exclusive (negRisk) fields');
  L.push('');
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push('');
  L.push(`Dataset: **${events.length}** RESOLVED mutually-exclusive (negRisk) events, each with >=3 legs that`);
  L.push('have usable cached YES-price history and EXACTLY ONE winning leg. Each leg\'s YES price is');
  L.push('step-aligned hourly with no look-ahead; the **overround = sum_i(YES_i) - 1** is measured over');
  L.push('the legs that are live at entry. Because many legs\' CLOB histories were purged, coverage is');
  L.push('partial and the measured overround is a CONSERVATIVE FLOOR (missing legs add positive YES mass).');
  L.push('');

  // category / legs-bucket spread of the sample
  const byCat = {}; const byLeg = {};
  for (const ev of events) { byCat[ev.category] = (byCat[ev.category] || 0) + 1; byLeg[legsBucketOf(ev.nLegs)] = (byLeg[legsBucketOf(ev.nLegs)] || 0) + 1; }
  L.push('Sample by category: ' + Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', '));
  L.push('');
  L.push('Sample by #legs bucket: ' + ['3-5', '6-10', '11-20', '21+'].filter((k) => byLeg[k]).map((k) => `${k}:${byLeg[k]}`).join(', '));
  L.push('');
  const medCov = quantiles(events.map((e) => e.legsWithData / e.nLegs), [0.5])[0];
  L.push(`Median leg-coverage per event (legs-with-history / total legs): **${pc(medCov)}**`);
  L.push('');

  L.push('## Historical overround distribution  (sum YES - 1, over live legs)');
  L.push('');
  L.push('| entry timing | n events | median | IQR (p25..p75) | mean | frac overround>0 | median coverage |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  const orRow = (name, s) => `| ${name} | ${s.n} | ${f(s.median, 3)} | ${f(s.p25, 3)} .. ${f(s.p75, 3)} | ${f(s.mean, 3)} | ${pc(s.fracPositive)} | ${pc(s.medianCoverage)} |`;
  L.push(orRow('first-all-live (early)', orFirst));
  L.push(orRow('~7d-pre', or7d));
  L.push(orRow('~1d-pre (late)', or1d));
  L.push('');
  L.push('Interpretation: a median overround **> 0** means the basket of live YES legs is collectively');
  L.push('priced above 1.0 — the structural Dutch-book the thesis predicts. Early vs late shows whether');
  L.push('the overround compresses toward fair (1.0) as resolution approaches.');
  L.push('');

  L.push('## Cost model (honest)');
  L.push('');
  L.push('Only mid-price paths are available, so we CROSS an assumed per-leg spread: buying NO on a leg');
  L.push('costs `(1 - YES) + spread/2`; it pays 1 at resolution iff that leg LOST (it almost always does in');
  L.push('a field where exactly one of N wins), else 0. Net per-leg PnL = payoff - cost. Each shorted leg is');
  L.push('ONE trade. Primary spread = **0.02 (2c)**, secondary **0.01 (1c)**. Costs are never lowered to');
  L.push('manufacture a win. NOTE: the basket needs overround to exceed roughly (#legs-shorted)*spread/2 to');
  L.push('clear costs, which is why narrow overpriced BANDS (not the whole basket) are swept.');
  L.push('');

  L.push('## Validation (anti-overfitting)');
  L.push('');
  L.push('Events are split chronologically by resolution date (train 50% / validation 25% / **locked');
  L.push(`holdout 25%**: train=${split.train.length}, val=${split.validation.length}, test=${split.test.length}). The ENTIRE grid is ranked on validation,`);
  L.push('the single best config is multiple-testing-corrected (Bonferroni with N=#configs AND a White');
  L.push('reality-check best-of-N bootstrap), and ONLY if it survives is the LOCKED holdout touched once,');
  L.push('requiring the bootstrap 95% CI lower bound on held-out per-trade PnL to be **> 0**.');
  L.push('');

  for (const spread of [0.02, 0.01]) {
    const { res, subgridN, allStats } = results[spread];
    L.push(`### Verdict at spread = ${spread} (${spread * 100}c)  — N=${subgridN} configs`);
    L.push('');
    L.push(`- Best config (by validation expectancy): \`${res.bestCandidate ? cfgLabel(res.bestCandidate) : 'n/a'}\``);
    if (res.validationStats) {
      const v = res.validationStats;
      L.push(`- Validation: n=${v.n} trades, expectancy=${f(v.expectancy)} /trade, winRate=${pc(v.winRate)}, t=${f(v.tStat, 2)}, 95% CI [${f(v.bootLo)}, ${f(v.bootHi)}]`);
    }
    if (res.correction) {
      const c = res.correction;
      L.push(`- Multiple-testing: ${c.reason}`);
    }
    if (res.touchedTest && res.testStats) {
      const ts = res.testStats;
      L.push(`- **LOCKED HOLDOUT** (touched once): n=${ts.n} trades, expectancy=${f(ts.expectancy)} /trade, winRate=${pc(ts.winRate)}, 95% CI [${f(ts.bootLo)}, ${f(ts.bootHi)}]`);
    } else {
      L.push('- LOCKED HOLDOUT: not touched (best config rejected on validation correction).');
    }
    if (allStats) {
      L.push(`- (Context) full-sample over all ${events.length} events: n=${allStats.n}, expectancy=${f(allStats.expectancy)}, winRate=${pc(allStats.winRate)}, 95% CI [${f(allStats.bootLo)}, ${f(allStats.bootHi)}]`);
    }
    L.push('');
    L.push(`**${res.profitable ? 'CONFIRMED' : 'NOT CONFIRMED'}** at ${spread * 100}c: ${res.verdict}`);
    L.push('');
  }

  // leaderboards
  function lbTable(title, rows) {
    L.push(`### ${title}`);
    L.push('');
    L.push('| config | n trades | expectancy/trade | win rate | t-stat | val 95% CI lo |');
    L.push('|---|---:|---:|---:|---:|---:|');
    for (const { cfg, st } of rows) {
      L.push(`| ${cfgLabel(cfg)} | ${st.n} | ${f(st.expectancy)} | ${pc(st.winRate)} | ${f(st.tStat, 2)} | ${f(st.bootLo)} |`);
    }
    L.push('');
  }
  L.push('## Validation-set leaderboards (top configs by expectancy — pre-correction, for context)');
  L.push('');
  lbTable('spread = 0.02 (2c)', lb02);
  lbTable('spread = 0.01 (1c)', lb01);

  // category robustness of the winning config
  L.push('## Category robustness of the winning config (full sample, by category)');
  L.push('');
  L.push('The usable events are COVERAGE-BIASED toward categories whose CLOB leg-history survived');
  L.push('(mostly sports futures). This table decomposes the chosen config by category so the verdict');
  L.push('is honest about WHERE the edge actually lives — a category with n<30 trades is not conclusive.');
  L.push('');
  L.push('| category | n trades | expectancy/trade | win rate | 95% CI |');
  L.push('|---|---:|---:|---:|---:|');
  for (const { cat, st } of catRows) {
    L.push(`| ${cat} | ${st.n} | ${f(st.expectancy)} | ${pc(st.winRate)} | [${f(st.bootLo)}, ${f(st.bootHi)}] |`);
  }
  L.push('');

  L.push('## Honest verdict');
  L.push('');
  const any = results[0.02].res.profitable || results[0.01].res.profitable;
  if (any) {
    for (const spread of [0.02, 0.01]) {
      const { res } = results[spread];
      if (res.profitable) {
        const ts = res.testStats;
        L.push(`At **${spread * 100}c** an edge SURVIVED the corrected holdout: \`${cfgLabel(res.bestCandidate)}\``);
        L.push(`— held-out expectancy ${f(ts.expectancy)}/trade, 95% CI [${f(ts.bootLo)}, ${f(ts.bootHi)}], n=${ts.n} trades, win rate ${pc(ts.winRate)}.`);
        L.push('');
      }
    }
    // Honesty caveat: where the edge actually lives.
    const sportsRow = catRows.find((r) => r.cat === 'sports');
    const nonSports = catRows.filter((r) => r.cat !== 'sports');
    const nonSportsN = nonSports.reduce((a, r) => a + r.st.n, 0);
    L.push('**Caveat — this is, honestly, a SPORTS-FUTURES edge.** The usable sample is ' +
      `${Math.round(100 * (byCat.sports || 0) / events.length)}% sports because sports-futures legs retain CLOB history while ` +
      'most politics/crypto event legs were purged. Per the category breakdown above, essentially all of the ' +
      `expectancy comes from sports${sportsRow ? ` (n=${sportsRow.st.n}, exp=${f(sportsRow.st.expectancy)}, CI [${f(sportsRow.st.bootLo)}, ${f(sportsRow.st.bootHi)}])` : ''}; ` +
      `the non-sports usable sample (n=${nonSportsN} trades total) is too thin to confirm or deny the edge there. ` +
      'The structural mechanism (one-of-N field => mid-band YES legs collectively overpriced => settle NO) is ' +
      'general, but only the sports slice is established out-of-sample on this data.');
    L.push('');
  } else {
    L.push('NO config survived the multiple-testing-corrected locked holdout at either 2c or 1c.');
    L.push('The structural overround is REAL and visible in the descriptive table, but once an honest per-leg');
    L.push('spread is crossed and the grid is penalized for its size, the best config does not establish a');
    L.push('positive out-of-sample expectancy with a CI lower bound above zero. See the near-miss below.');
    L.push('');
    // near miss = best validation config at the cheaper 1c spread
    const nm = lb01[0];
    if (nm) {
      L.push(`Best NEAR-MISS (1c, validation): \`${cfgLabel(nm.cfg)}\` — expectancy ${f(nm.st.expectancy)}/trade, n=${nm.st.n}, t=${f(nm.st.tStat, 2)}, val 95% CI [${f(nm.st.bootLo)}, ${f(nm.st.bootHi)}]. ` +
        (nm.st.bootLo > 0 ? 'Positive in-sample but did not clear Bonferroni/reality-check + holdout.' : 'Its own validation CI already includes zero.'));
      L.push('');
    }
  }

  const reportPath = path.join(EVENTS_DIR, '..', 'events-edge-report.md');
  fs.writeFileSync(reportPath, L.join('\n'));
  console.log(`\nReport written: ${reportPath}`);

  // console summary
  console.log('\n=================== SUMMARY ===================');
  console.log(`events=${events.length}  overround median: first=${f(orFirst.median, 3)} 7d=${f(or7d.median, 3)} 1d=${f(or1d.median, 3)}`);
  for (const spread of [0.02, 0.01]) {
    const { res } = results[spread];
    console.log(`spread ${spread}: ${res.profitable ? 'CONFIRMED' : 'not confirmed'} — ${res.bestCandidate ? cfgLabel(res.bestCandidate) : 'n/a'}`);
  }
  console.log('==============================================');
}

main().catch((e) => { console.error('\nFATAL:', e); process.exit(1); });
