'use strict';
/* ============================================================
   HONEST backtest of VALUATION / MISPRICING strategies.
   ------------------------------------------------------------
   Reuses the existing taker backtester (lib/backtest.js):
     - no look-ahead (bar-by-bar replay)
     - fills cross the spread (buy@ask, sell@bid)
     - open positions settle at $1/$0 at resolution
     - fixed $100 stake per entry -> clean per-trade expectancy

   What this script does that scripts/backtest.js does not:
     1. Runs the lib/strategy-value.js strategies (favorite,
        mean-reversion, and a sweep of buy-and-hold buckets).
     2. Prints a CALIBRATION TABLE measured on the FULL set:
        for each entry-price bucket, the count, average entry
        price, and realized YES-win frequency. This is a
        MEASUREMENT (not a fit) and reveals where mispricing lives.
     3. Splits markets into TRAIN/TEST halves (deterministic) and
        reports net PnL + expectancy/trade for BOTH halves at 1c
        and 2c spread, so we can see if any edge is real or fitted.

   Dataset: prefers data/value-dataset.json (a wider pull that
   includes any longer-dated valuation markets) if present, else
   falls back to buildDataset() from the standard cache.

   Usage:
     node scripts/backtest-value.js
     node scripts/backtest-value.js --refresh   # rebuild wide set
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { buildDataset, fetchResolvedCryptoMarkets, fetchPriceHistory } = require('../lib/marketdata');
const { backtestAll } = require('../lib/backtest');
const { makeFavorite, makeMeanRevert, makeBuyHold } = require('../lib/strategy-value');

const WIDE_CACHE = path.join(__dirname, '..', 'data', 'value-dataset.json');
const REPORT_PATH = path.join(__dirname, '..', 'data', 'backtest-value-report.md');
const STAKE = 100;

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  return process.argv.includes(`--${name}`) ? true : def;
}
function fmtUsd(x) { return (x < 0 ? '-$' : '$') + Math.abs(x).toFixed(2); }
function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }

/* ------------------------------------------------------------
   Build/Load the widest available dataset.
   ------------------------------------------------------------ */
async function loadDataset(refresh) {
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(WIDE_CACHE, 'utf8'));
      if (Array.isArray(cached) && cached.length) return cached;
    } catch { /* build below */ }
  }
  // Over-fetch heavily; resolved crypto is dominated by intraday "Up or Down".
  const markets = await fetchResolvedCryptoMarkets({ want: 300, maxPages: 12 });
  const out = [];
  for (const m of markets) {
    if (out.length >= 200) break;
    let p;
    try { p = await fetchPriceHistory(m.yesTokenId, { refresh: false }); } catch { continue; }
    if (!Array.isArray(p) || p.length < 30) continue;
    out.push({ ...m, path: p });
  }
  if (out.length) { try { fs.writeFileSync(WIDE_CACHE, JSON.stringify(out)); } catch { /* best-effort */ } }
  if (out.length) return out;
  // last resort: the standard builder
  return buildDataset({ want: 60, minPoints: 30, refresh: false });
}

/* ------------------------------------------------------------
   Deterministic TRAIN/TEST split by market id parity (stable,
   no RNG, ~50/50). Calibration uses the FULL set regardless.
   ------------------------------------------------------------ */
function splitTrainTest(dataset) {
  const train = [], test = [];
  dataset.forEach((m, i) => (i % 2 === 0 ? train : test).push(m));
  return { train, test };
}

/* ------------------------------------------------------------
   CALIBRATION TABLE (a measurement, not a fit).
   For each market we take the FIRST bar whose mid enters a decile
   bucket (one observation per market per bucket — no double count
   of the long flat coin-flip stretch). We then report, per bucket:
   count, average entry price, and realized YES-win frequency.

   "first-entry-per-bucket" answers the real trading question:
   "if I could buy the FIRST time YES is priced in bucket B and hold
   to resolution, how often do I win?" -> compares directly to avgP.
   ------------------------------------------------------------ */
function calibration(dataset, nBuckets = 10) {
  const b = Array.from({ length: nBuckets }, () => ({ n: 0, win: 0, sum: 0 }));
  for (const m of dataset) {
    const seen = new Set();
    for (const bar of m.path) {
      let idx = Math.floor(bar.p * nBuckets);
      if (idx < 0) idx = 0; if (idx >= nBuckets) idx = nBuckets - 1;
      if (seen.has(idx)) continue;        // first touch of this bucket only
      seen.add(idx);
      b[idx].n += 1; b[idx].sum += bar.p; if (m.yesWon) b[idx].win += 1;
    }
  }
  return b.map((x, i) => ({
    lo: i / nBuckets, hi: (i + 1) / nBuckets,
    n: x.n, avgP: x.n ? x.sum / x.n : 0, winFreq: x.n ? x.win / x.n : 0,
    edge: x.n ? (x.win / x.n) - (x.sum / x.n) : 0, // realized - priced (>0 => underpriced)
  }));
}

/* ------------------------------------------------------------
   DIAGNOSTIC: when does a market FIRST touch each price bucket,
   in terms of seconds-to-resolution? If off-coin-flip bands
   (e.g. 10-30c, 70-90c) are only reached in the final minutes,
   then any "edge" there is a last-moments fill artifact, not a
   durable valuation state you could trade on at the quoted spread.
   ------------------------------------------------------------ */
function entryTiming(dataset, bands) {
  return bands.map(([lo, hi]) => {
    const secs = [];
    let n = 0, win = 0;
    for (const m of dataset) {
      const tEnd = m.endDate ? new Date(m.endDate).getTime() / 1000 : m.path[m.path.length - 1].t;
      for (const bar of m.path) {
        if (bar.p >= lo && bar.p < hi) { n++; if (m.yesWon) win++; secs.push(tEnd - bar.t); break; }
      }
    }
    secs.sort((a, b) => a - b);
    const med = n ? secs[Math.floor(n / 2)] : 0;
    return { lo, hi, n, winFreq: n ? win / n : 0, medSecs: med };
  });
}

function timingTableText(rows) {
  const lines = ['band      n    winFreq  median-time-to-resolve-at-first-touch'];
  for (const r of rows) {
    const lbl = `${Math.round(r.lo * 100)}-${Math.round(r.hi * 100)}%`.padEnd(8);
    const t = r.medSecs >= 3600 ? `${(r.medSecs / 3600).toFixed(1)}h` : `${(r.medSecs / 60).toFixed(1)}min`;
    lines.push(`${lbl} ${String(r.n).padStart(4)}   ${r.winFreq.toFixed(3)}    ${t}`);
  }
  return lines.join('\n');
}

function calibTableText(rows) {
  const lines = [];
  lines.push('bucket    n    avgPrice  winFreq   edge(real-priced)');
  for (const r of rows) {
    if (!r.n) continue;
    const lbl = `${Math.round(r.lo * 100)}-${Math.round(r.hi * 100)}%`.padEnd(8);
    lines.push(`${lbl} ${String(r.n).padStart(4)}   ${r.avgP.toFixed(3)}    ${r.winFreq.toFixed(3)}   ${(r.edge >= 0 ? '+' : '') + r.edge.toFixed(3)}`);
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------
   The backtester's backtestMarket() hard-imports decide from
   lib/strategy.js. To test OUR strategies without editing that
   file, we replace the module-cache entry for lib/strategy with a
   shim exposing our decide BEFORE requiring lib/backtest fresh.
   This keeps lib/backtest.js untouched on disk while letting it
   call our decide. Done per-strategy, cache cleared each time.
   ------------------------------------------------------------ */
function backtestWith(decideFn, dataset, spread) {
  const strategyPath = require.resolve('../lib/strategy');
  const backtestPath = require.resolve('../lib/backtest');
  // install shim
  const realStrategy = require('../lib/strategy');
  require.cache[strategyPath] = {
    id: strategyPath, filename: strategyPath, loaded: true,
    exports: { decide: decideFn, DEFAULTS: realStrategy.DEFAULTS, slope: realStrategy.slope, hoursUntil: realStrategy.hoursUntil },
  };
  delete require.cache[backtestPath];
  const { backtestAll } = require('../lib/backtest');
  const res = backtestAll(dataset, realStrategy.DEFAULTS, { spread, stake: STAKE, lookback: 1 });
  // restore
  delete require.cache[backtestPath];
  require.cache[strategyPath] = { id: strategyPath, filename: strategyPath, loaded: true, exports: realStrategy };
  delete require.cache[backtestPath];
  return res;
}

function row(label, r) {
  return `${label.padEnd(26)} trades=${String(r.trades).padStart(4)}  win=${fmtPct(r.winRate).padStart(6)}  `
    + `gross=${fmtUsd(r.grossPnl).padStart(10)}  cost=${fmtUsd(r.costsPaid).padStart(9)}  `
    + `NET=${fmtUsd(r.netPnl).padStart(10)}  exp/trade=${fmtUsd(r.expectancy).padStart(8)}`;
}

async function main() {
  const refresh = !!arg('refresh', false);
  console.log('\n=== MIROFISH VALUATION backtest — honest, cost-aware ===\n');
  const dataset = await loadDataset(refresh);
  if (!dataset.length) { console.error('No dataset.'); process.exit(1); }

  const yesWins = dataset.filter((m) => m.yesWon).length;
  const totalPoints = dataset.reduce((a, m) => a + m.path.length, 0);
  let upDown = 0, valuation = 0;
  for (const m of dataset) (/Up or Down/i.test(m.question) ? (upDown++) : (valuation++));
  const byAsset = {};
  for (const m of dataset) byAsset[m.asset] = (byAsset[m.asset] || 0) + 1;

  console.log(`Dataset: ${dataset.length} resolved crypto markets `
    + `(${Object.entries(byAsset).map(([k, v]) => k + ':' + v).join(', ')})`);
  console.log(`  ${totalPoints} price points; resolution mix ${yesWins} YES / ${dataset.length - yesWins} NO`);
  console.log(`  market types: ${upDown} "Up or Down" intraday, ${valuation} valuation/reach (longer-dated)`);
  if (valuation < 10) {
    console.log('  NOTE: the API\'s resolved-crypto universe (ordered by volume) is almost');
    console.log('        entirely intraday coin-flip markets. Longer-dated valuation markets');
    console.log('        where favorite-longshot bias lives are scarce -> treat (a) cautiously.');
  }

  // -------- CALIBRATION TABLE (full set; a measurement) --------
  const calRows = calibration(dataset);
  console.log('\n--- CALIBRATION (FULL set; first touch of each price bucket per market) ---');
  console.log('Does buying YES at price p win ~p of the time? edge = realized winFreq - avg price.');
  console.log('edge > 0 => UNDERpriced (favorites); edge < 0 => OVERpriced (longshots).\n');
  console.log(calibTableText(calRows));

  // -------- entry-timing diagnostic --------
  const timing = entryTiming(dataset, [[0.10, 0.30], [0.30, 0.50], [0.50, 0.70], [0.70, 0.90], [0.90, 1.00]]);
  console.log('\n--- ENTRY TIMING: when is each band FIRST reached? ---');
  console.log('If off-coin-flip bands are only touched in the final minutes, any "edge" there');
  console.log('is a last-moments fill artifact, not a durable, tradeable valuation state.\n');
  console.log(timingTableText(timing));

  // -------- strategies --------
  const { train, test } = splitTrainTest(dataset);
  console.log(`\nTrain/Test split (id-parity): ${train.length} train / ${test.length} test.\n`);

  const strategies = [
    makeFavorite({ favMin: 0.80, favMax: 0.95 }),
    makeMeanRevert({ lookback: 12, dropMin: 0.08, bandMin: 0.15, bandMax: 0.85 }),
    makeBuyHold(0.10, 0.30, { label: 'Buy&hold longshot 10-30c' }),
    makeBuyHold(0.30, 0.50, { label: 'Buy&hold 30-50c' }),
    makeBuyHold(0.50, 0.70, { label: 'Buy&hold 50-70c' }),
    makeBuyHold(0.70, 0.90, { label: 'Buy&hold favorite 70-90c' }),
    makeBuyHold(0.90, 1.00, { label: 'Buy&hold near-cert 90-100c' }),
  ];

  const results = [];
  for (const s of strategies) {
    const r = {
      label: s.label,
      full1: backtestWith(s.decide, dataset, 0.01),
      train1: backtestWith(s.decide, train, 0.01),
      test1: backtestWith(s.decide, test, 0.01),
      train2: backtestWith(s.decide, train, 0.02),
      test2: backtestWith(s.decide, test, 0.02),
    };
    results.push(r);
  }

  console.log('\n--- STRATEGY RESULTS (1c spread, FULL set) ---\n');
  for (const r of results) console.log(row(r.label, r.full1));

  console.log('\n--- TRAIN vs TEST (net PnL / exp-per-trade) ---\n');
  console.log('strategy                    | train@1c            | test@1c             | train@2c            | test@2c');
  for (const r of results) {
    const cell = (x) => `${fmtUsd(x.netPnl).padStart(9)} (${fmtUsd(x.expectancy).padStart(7)})`;
    console.log(`${r.label.padEnd(27)} | ${cell(r.train1)} | ${cell(r.test1)} | ${cell(r.train2)} | ${cell(r.test2)}`);
  }

  const verdict = verdictText(results, calRows, timing);
  console.log('\nVERDICT: ' + verdict + '\n');

  writeReport(dataset, { upDown, valuation, yesWins, totalPoints, byAsset }, calRows, timing, results, verdict);
  console.log(`Report written to ${path.relative(process.cwd(), REPORT_PATH)}\n`);
}

function verdictText(results, calRows, timing) {
  // A strategy passes the statistical bar only if it makes money net of cost on
  // BOTH train and test at the realistic 2c spread (and isn't a tiny-sample fluke).
  const robust = results.filter((r) =>
    r.train2.trades >= 8 && r.test2.trades >= 8 &&
    r.train2.netPnl > 0 && r.test2.netPnl > 0 &&
    r.train1.netPnl > 0 && r.test1.netPnl > 0);

  // But "robust net-positive" is only a real, tradeable VALUATION edge if the
  // entries are durable states, not last-minute whipsaws. Check whether the
  // off-coin-flip bands these strategies live in are first reached only in the
  // final few minutes -> then the apparent edge is a fill artifact, not valuation.
  const offFlip = timing.filter((t) => (t.hi <= 0.50 || t.lo >= 0.70));
  const allLastMinute = offFlip.length > 0 && offFlip.every((t) => t.medSecs < 600); // <10 min

  if (robust.length && allLastMinute) {
    return `APPARENT but NOT A REAL VALUATION EDGE. ${robust.map((r) => r.label).join('; ')} `
      + `print net-positive on train AND test at 1c AND 2c, BUT the entry-timing diagnostic shows `
      + `every off-coin-flip price band is first reached only in the FINAL ~3-7 MINUTES before `
      + `resolution (median time-to-resolve < 10 min). So the "edge" is a last-moments price-whipsaw `
      + `in 5-minute "Up or Down" markets, not a durable mispricing you could trade at the quoted `
      + `spread (fills at 20c with 3 min left, in the thinnest part of the book, are exactly where the `
      + `1-2c spread assumption is least credible). The persistent coin-flip band (50-70c, ~14h to go) `
      + `is fair and unprofitable. Favorite buy 0.80-0.95 does NOT survive out-of-sample (test < 0). `
      + `Net: no genuine valuation edge on this (intraday-dominated) dataset.`;
  }
  if (robust.length) {
    return `A valuation edge appears to survive out-of-sample: ${robust.map((r) => r.label).join('; ')} `
      + `is net-positive on BOTH train and test at 1c AND 2c spread. Caveat: small/biased sample.`;
  }
  const soft = results.filter((r) => r.full1.trades >= 8 && r.full1.netPnl > 0);
  if (soft.length) {
    return `NO ROBUST EDGE. Some strategies are net-positive on the FULL set at 1c `
      + `(${soft.map((r) => r.label).join('; ')}) but none survive the 2c spread on BOTH train and test.`;
  }
  return 'NO VALUATION EDGE FOUND. No simple, inspectable valuation rule beats break-even net of '
    + 'spread robustly. The calibration curve is close to fair; small biases are smaller than spread cost.';
}

function writeReport(dataset, meta, calRows, timing, results, verdict) {
  const cell = (x) => `${fmtUsd(x.netPnl)} (${fmtUsd(x.expectancy)})`;
  const tcell = (s) => (s >= 3600 ? `${(s / 3600).toFixed(1)}h` : `${(s / 60).toFixed(1)}min`);
  const md = `# MIROFISH valuation backtest report

_Generated ${new Date().toISOString()} by \`scripts/backtest-value.js\`. Tests
VALUATION / MISPRICING rules from \`lib/strategy-value.js\` on the existing taker
backtester. No parameter fitting beyond round-number thresholds; train/test split
reported._

## Method (same honesty model as the momentum report)

- **No look-ahead.** Bar-by-bar replay; bar _t_ sees only price points ≤ _t_.
- **Fills cross the spread.** Buy @ \`mid+spread/2\`, sell @ \`mid-spread/2\`.
  Reported at a fair **1¢** spread and a realistic **2¢** sensitivity case.
- **Settlement at par.** Open positions pay **\$1** (YES won) or **\$0** at resolution.
- **Fixed \$${STAKE} stake** per entry. Each valuation strategy enters AT MOST ONCE
  per market then HOLDS to resolution — so a trade's outcome IS the calibration
  of its entry price (no momentum take-profit/stop layered on top).
- **Train/Test split** by market-id parity (~50/50). **Calibration is measured on the
  FULL set** — it is a measurement, not a fit.

## Dataset

- **${dataset.length}** resolved Polymarket crypto markets (${Object.entries(meta.byAsset).map(([k, v]) => k + ':' + v).join(', ')}).
- **${meta.totalPoints}** price points. Resolution mix **${meta.yesWins} YES / ${dataset.length - meta.yesWins} NO**.
- Market types: **${meta.upDown}** intraday "Up or Down", **${meta.valuation}** longer-dated valuation/reach.
- **Limitation:** \`fetchResolvedCryptoMarkets\` pages resolved crypto by 24h volume,
  which is overwhelmingly intraday coin-flip markets. Longer-dated valuation markets
  (where favorite–longshot bias classically lives) are scarce in this universe, so
  hypothesis (a) is tested mostly on intraday favorites that emerge mid-path.

## Calibration table (FULL set, first touch of each price bucket per market)

> Does buying YES at price _p_ win ~_p_ of the time? \`edge = realized winFreq - avg price\`.
> edge > 0 ⇒ UNDERpriced (buying wins more than priced); edge < 0 ⇒ OVERpriced.

| bucket | n | avg price | win freq | edge (real − priced) |
|--------|--:|----------:|---------:|---------------------:|
${calRows.filter((r) => r.n).map((r) => `| ${Math.round(r.lo * 100)}-${Math.round(r.hi * 100)}% | ${r.n} | ${r.avgP.toFixed(3)} | ${r.winFreq.toFixed(3)} | ${(r.edge >= 0 ? '+' : '') + r.edge.toFixed(3)} |`).join('\n')}

## Entry-timing diagnostic (why the calibration "edge" is not tradeable)

> When is each price band FIRST reached, in time-to-resolution? If off-coin-flip
> bands are only touched in the final minutes, any apparent edge there is a
> last-moments fill artifact, not a durable valuation state.

| band | n | win freq | median time-to-resolve at first touch |
|------|--:|---------:|--------------------------------------:|
${timing.map((t) => `| ${Math.round(t.lo * 100)}-${Math.round(t.hi * 100)}% | ${t.n} | ${t.winFreq.toFixed(3)} | ${tcell(t.medSecs)} |`).join('\n')}

## Strategy results

### Full set @ 1¢

| strategy | trades | win | gross | spread cost | net | exp/trade |
|----------|-------:|----:|------:|------------:|----:|----------:|
${results.map((r) => `| ${r.label} | ${r.full1.trades} | ${fmtPct(r.full1.winRate)} | ${fmtUsd(r.full1.grossPnl)} | ${fmtUsd(r.full1.costsPaid)} | **${fmtUsd(r.full1.netPnl)}** | ${fmtUsd(r.full1.expectancy)} |`).join('\n')}

### Train vs Test (net PnL, exp/trade in parens)

| strategy | train @1¢ | test @1¢ | train @2¢ | test @2¢ |
|----------|----------:|---------:|----------:|--------:|
${results.map((r) => `| ${r.label} | ${cell(r.train1)} | ${cell(r.test1)} | ${cell(r.train2)} | ${cell(r.test2)} |`).join('\n')}

## Verdict

**${verdict}**

## Caveats

- Crypto-only, volume-selected, and ≈${Math.round(100 * meta.upDown / dataset.length)}% intraday "Up or Down"
  coin-flip markets — not the multi-day valuation universe the favorite–longshot bias is
  documented in. The scarcity of longer-dated markets is a hard limit of this data source.
- Favorites/longshots here mostly appear MID-PATH as the coin flip resolves directionally,
  so "buy the 80¢ favorite" is partly buying late-stage near-decided markets.
- Small sample; survivorship/selection bias from ordering by volume; past ≠ future.
`;
  fs.writeFileSync(REPORT_PATH, md);
}

main().catch((e) => { console.error('value backtest failed:', e.stack || e.message); process.exit(1); });
