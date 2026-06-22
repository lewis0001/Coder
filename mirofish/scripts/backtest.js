'use strict';
/* ============================================================
   HONEST backtest runner for the CURRENT mirofish strategy.
   ------------------------------------------------------------
   - Pulls ~30-60 RESOLVED crypto markets (with known outcomes)
     from Polymarket, caching everything under data/ so reruns
     are offline + fast.
   - Replays the CURRENT lib/strategy.js decide() across all of
     them with NO look-ahead and a realistic, spread-crossing
     cost model (see lib/backtest.js).
   - Prints an honest summary and writes data/backtest-report.md.

   Nothing here tunes the strategy. We measure it as written.
   Usage:
     node scripts/backtest.js            # use cache if present
     node scripts/backtest.js --refresh  # re-download from API
     node scripts/backtest.js --want=50  # target N markets
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { buildDataset } = require('../lib/marketdata');
const { backtestAll } = require('../lib/backtest');
const { DEFAULTS } = require('../lib/strategy');

const REPORT_PATH = path.join(__dirname, '..', 'data', 'backtest-report.md');
const STAKE = 100;            // fixed $ notional per entry -> clean per-trade expectancy

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  return process.argv.includes(`--${name}`) ? true : def;
}

function fmtUsd(x) { return (x < 0 ? '-$' : '$') + Math.abs(x).toFixed(2); }
function fmtPct(x) { return (x * 100).toFixed(1) + '%'; }

function summaryLine(label, r) {
  return `${label.padEnd(14)} trades=${String(r.trades).padStart(4)}  win=${fmtPct(r.winRate).padStart(6)}  `
    + `gross=${fmtUsd(r.grossPnl).padStart(11)}  spreadCost=${fmtUsd(r.costsPaid).padStart(10)}  `
    + `NET=${fmtUsd(r.netPnl).padStart(11)}  exp/trade=${fmtUsd(r.expectancy).padStart(8)} (${r.roiPerTradePct.toFixed(2)}%)`;
}

async function main() {
  const refresh = !!arg('refresh', false);
  const want = Number(arg('want', 60));

  console.log('\n=== MIROFISH backtest — current strategy, honest cost model ===\n');
  console.log(refresh ? 'Downloading resolved crypto markets from Polymarket…'
    : 'Loading dataset (cache if present; pass --refresh to re-download)…');

  const dataset = await buildDataset({ want, minPoints: 30, refresh });
  if (!dataset.length) {
    console.error('No usable markets found. Try: node scripts/backtest.js --refresh');
    process.exit(1);
  }

  const totalPoints = dataset.reduce((a, m) => a + m.path.length, 0);
  const yesWins = dataset.filter((m) => m.yesWon).length;
  console.log(`\nDataset: ${dataset.length} resolved crypto markets`);
  console.log(`  price points: ${totalPoints} total, ${Math.round(totalPoints / dataset.length)} avg/market`);
  console.log(`  resolution mix: ${yesWins} YES-won / ${dataset.length - yesWins} NO-won`);
  console.log(`  stake: $${STAKE} notional per entry\n`);

  // Two spread assumptions: 1¢ (optimistic-to-fair) and 2¢ (sensitivity).
  const r1 = backtestAll(dataset, DEFAULTS, { spread: 0.01, stake: STAKE });
  const r2 = backtestAll(dataset, DEFAULTS, { spread: 0.02, stake: STAKE });

  console.log('Results (no look-ahead, fills cross the spread, open positions settle at $1/$0):\n');
  console.log(summaryLine('spread 1¢:', r1));
  console.log(summaryLine('spread 2¢:', r2));

  console.log(`\nMarkets that ever traded: ${r1.marketsTraded}/${r1.markets}`);

  // Honest verdict, derived purely from the measured numbers at the fair 1¢ spread.
  const verdict = verdictText(r1, r2);
  console.log('\nVERDICT: ' + verdict + '\n');

  writeReport(dataset, r1, r2, verdict);
  console.log(`Report written to ${path.relative(process.cwd(), REPORT_PATH)}\n`);
}

function verdictText(r1, r2) {
  if (r1.trades === 0) {
    return 'INCONCLUSIVE — the strategy fired ZERO trades on this dataset, so it neither makes nor loses money here (it never acts).';
  }
  const prof1 = r1.netPnl > 0;
  const prof2 = r2.netPnl > 0;
  if (prof1 && prof2) {
    return `PROFITABLE net of costs at both 1¢ and 2¢ spread (+${fmtUsd(r1.netPnl)} / +${fmtUsd(r2.netPnl)}), `
      + `expectancy ${fmtUsd(r1.expectancy)}/trade at 1¢. Treat with caution: small sample, survivorship in the market set.`;
  }
  if (prof1 && !prof2) {
    return `MARGINAL — profitable at an optimistic 1¢ spread (${fmtUsd(r1.netPnl)}, ${fmtUsd(r1.expectancy)}/trade) but LOSES at a realistic 2¢ spread (${fmtUsd(r2.netPnl)}). Its edge is thinner than its trading costs.`;
  }
  return `NOT PROFITABLE — the current strategy LOSES money net of costs even at an optimistic 1¢ spread `
    + `(${fmtUsd(r1.netPnl)}, ${fmtUsd(r1.expectancy)}/trade) and worse at 2¢ (${fmtUsd(r2.netPnl)}). `
    + `Win rate ${fmtPct(r1.winRate)} is not enough to overcome the cost of crossing the spread.`;
}

function writeReport(dataset, r1, r2, verdict) {
  const yesWins = dataset.filter((m) => m.yesWon).length;
  const totalPoints = dataset.reduce((a, m) => a + m.path.length, 0);
  const byAsset = {};
  for (const m of dataset) byAsset[m.asset] = (byAsset[m.asset] || 0) + 1;
  const assetLine = Object.entries(byAsset).map(([k, v]) => `${k}:${v}`).join(', ');

  // a few example trades from the 1¢ run for color
  const sampleTrades = [];
  for (const p of r1.per) {
    for (const t of p.log) { sampleTrades.push(t); if (sampleTrades.length >= 8) break; }
    if (sampleTrades.length >= 8) break;
  }

  const md = `# MIROFISH backtest report

_Generated ${new Date().toISOString()} by \`scripts/backtest.js\`. Measures the
**current** \`lib/strategy.js\` as written — no parameter fitting._

## Method (why these numbers are honest)

- **No look-ahead.** Each market is replayed bar-by-bar; at bar _t_ the strategy
  sees only price points with timestamp ≤ _t_. It cannot see the resolution.
- **Fills cross the spread.** Buys fill at \`mid + spread/2\`, sells at
  \`mid − spread/2\`. We report a fair **1¢** spread and a **2¢** sensitivity case.
- **Settlement at par.** A position still open at resolution pays **\$1** if the
  YES/Up outcome won, else **\$0** (no spread on settlement).
- **Fixed stake** of \$${STAKE} notional per entry, so per-trade expectancy is clean.
- **No fitting.** Strategy parameters are untouched (\`lib/strategy.js DEFAULTS\`).

## Dataset

- **${dataset.length}** resolved Polymarket crypto markets (assets: ${assetLine}).
- **${totalPoints}** real price points total (${Math.round(totalPoints / dataset.length)} avg/market).
- Resolution mix: **${yesWins} YES-won / ${dataset.length - yesWins} NO-won**.
- Data + cache live under \`data/history/\` and \`data/resolved-crypto-markets.json\`.

## Results

| Spread | Trades | Win rate | Gross PnL | Spread cost | **Net PnL** | Exp/trade | ROI/trade |
|--------|-------:|---------:|----------:|------------:|------------:|----------:|----------:|
| 1¢ (fair)        | ${r1.trades} | ${fmtPct(r1.winRate)} | ${fmtUsd(r1.grossPnl)} | ${fmtUsd(r1.costsPaid)} | **${fmtUsd(r1.netPnl)}** | ${fmtUsd(r1.expectancy)} | ${r1.roiPerTradePct.toFixed(2)}% |
| 2¢ (sensitivity) | ${r2.trades} | ${fmtPct(r2.winRate)} | ${fmtUsd(r2.grossPnl)} | ${fmtUsd(r2.costsPaid)} | **${fmtUsd(r2.netPnl)}** | ${fmtUsd(r2.expectancy)} | ${r2.roiPerTradePct.toFixed(2)}% |

Markets that ever traded: **${r1.marketsTraded}/${r1.markets}**.

## Verdict

**${verdict}**

${sampleTrades.length ? `## Sample trades (1¢ spread)

| Question | Reason out | Entry | Exit | Shares | Net PnL |
|----------|-----------|------:|-----:|-------:|--------:|
${sampleTrades.map((t) => `| ${String(t.q).slice(0, 46)} | ${t.reason} | ${t.entry} | ${t.exit} | ${t.shares} | ${fmtUsd(t.netPnl)} |`).join('\n')}
` : ''}
## Caveats

- Small sample; crypto-only; mostly short-horizon "Up or Down" intraday markets.
- The market set is drawn from resolved markets ordered by volume — some
  survivorship/selection bias is unavoidable.
- The 1¢ spread is optimistic for thin books; real costs are often closer to 2¢+.
- Past resolved behavior is not predictive of future performance.
`;

  fs.writeFileSync(REPORT_PATH, md);
}

main().catch((e) => { console.error('backtest failed:', e.message); process.exit(1); });
