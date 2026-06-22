'use strict';
/* ============================================================
   HONEST MAKER backtest runner.
   ------------------------------------------------------------
   Replays a passive two-sided market maker across the SAME
   resolved crypto markets used by the taker backtest (reuses
   buildDataset from lib/marketdata.js), under a CONSERVATIVE
   fill model (strict cross-through + adverse selection +
   inventory settlement). See lib/backtest-maker.js for the model.

   Anti-overfitting:
     - We split the market set into TRAIN (first half) and TEST
       (second half) and report BOTH. No parameter is fitted on
       either — the model has no free knobs beyond the edge we're
       probing, which we fix in advance (0.5¢ and 1¢).
     - We ALSO run an OPTIMISTIC variant (touch=fill, no adverse
       selection) so the report can show exactly how much the
       "edge" depends on telling those two lies. That gap is the
       honesty check.

   Usage:
     node scripts/backtest-maker.js
     node scripts/backtest-maker.js --refresh   # re-download data
     node scripts/backtest-maker.js --want=60
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { buildDataset } = require('../lib/marketdata');
const { makerBacktestAll } = require('../lib/backtest-maker');

const REPORT_PATH = path.join(__dirname, '..', 'data', 'backtest-maker-report.md');
const SIZE = 100;      // shares per fill (fixed, for comparability)
const MAXINV = 3;      // hard inventory cap = ±300 shares

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  return process.argv.includes(`--${name}`) ? true : def;
}

function fmtUsd(x) { return (x < 0 ? '-$' : '$') + Math.abs(x).toFixed(2); }

/* ---- OPTIMISTIC (dishonest) maker model, for contrast only ----
   Fills on a TOUCH (price reaches the level, no cross required) and
   assumes the spread is captured RISK-FREE (no adverse mark). This
   is the model naive maker backtests use to "prove" profitability.
   We include it ONLY to quantify the lie. */
function optimisticAll(dataset, edge, size, maxInv) {
  let fills = 0, gross = 0, netPnl = 0, marketsTraded = 0;
  const capShares = maxInv * size;
  for (const m of dataset) {
    const p = m.path; let inv = 0, cash = 0, mf = 0;
    for (let i = 1; i < p.length; i++) {
      const prev = p[i - 1].p, cur = p[i].p;
      const bid = prev - edge, ask = prev + edge;
      // TOUCH = fill (>=/<=), and we book the edge as if risk-free against `prev`.
      if (cur <= bid && bid > 0 && inv + size <= capShares) {
        cash -= size * bid; inv += size; fills++; mf++; gross += size * edge;
      } else if (cur >= ask && ask < 1 && inv - size >= -capShares) {
        cash += size * ask; inv -= size; fills++; mf++; gross += size * edge;
      }
    }
    cash += inv * (m.yesWon ? 1 : 0);
    netPnl += cash; if (mf > 0) marketsTraded++;
  }
  return { fills, grossSpread: gross, netPnl, marketsTraded,
    expectancy: fills ? netPnl / fills : 0 };
}

function runBlock(name, ds, edge) {
  const honest = makerBacktestAll(ds, { edge, size: SIZE, maxInv: MAXINV });
  const opt = optimisticAll(ds, edge, SIZE, MAXINV);
  return { name, edge, honest, opt };
}

function printBlock(label, b) {
  const h = b.honest, o = b.opt;
  console.log(`\n  [${label}] edge=${(b.edge * 100).toFixed(2)}¢  (${h.markets} markets, ${h.marketsTraded} traded)`);
  console.log(`    HONEST (strict cross + adverse selection + inventory settle):`);
  console.log(`      fills=${h.fills} (bid ${h.bidFills}/ask ${h.askFills})  leftover|inv|=${h.leftoverAbs} sh`);
  console.log(`      gross spread captured = ${fmtUsd(h.grossSpread)}`);
  console.log(`      adverse-selection loss = ${fmtUsd(-h.adverseLoss)}`);
  console.log(`      inventory settlement  = ${fmtUsd(h.settlementPnl)}`);
  console.log(`      NET PnL = ${fmtUsd(h.netPnl)}   expectancy/fill = ${fmtUsd(h.expectancy)}`);
  console.log(`    OPTIMISTIC (touch=fill, no adverse selection) — the LIE for contrast:`);
  console.log(`      fills=${o.fills}  NET PnL = ${fmtUsd(o.netPnl)}  expectancy/fill = ${fmtUsd(o.expectancy)}`);
}

async function main() {
  const refresh = !!arg('refresh', false);
  const want = Number(arg('want', 60));

  console.log('\n=== MIROFISH MAKER backtest — honest market-making cost model ===\n');
  console.log(refresh ? 'Downloading resolved crypto markets…' : 'Loading dataset (cache if present)…');

  const dataset = await buildDataset({ want, minPoints: 30, refresh });
  if (!dataset.length) {
    console.error('No usable markets. Try: node scripts/backtest-maker.js --refresh');
    process.exit(1);
  }

  // Deterministic train/test split: first half / second half of the cached set.
  const mid = Math.floor(dataset.length / 2);
  const train = dataset.slice(0, mid);
  const test = dataset.slice(mid);

  const totalPoints = dataset.reduce((a, m) => a + m.path.length, 0);
  const yesWins = dataset.filter((m) => m.yesWon).length;
  console.log(`\nDataset: ${dataset.length} resolved crypto markets (${train.length} train / ${test.length} test)`);
  console.log(`  price points: ${totalPoints} total, ${Math.round(totalPoints / dataset.length)} avg/market`);
  console.log(`  resolution mix: ${yesWins} YES-won / ${dataset.length - yesWins} NO-won`);
  console.log(`  fixed size: ${SIZE} shares/fill, inventory cap ±${MAXINV * SIZE} shares\n`);

  const edges = [0.005, 0.01];
  const blocks = {};
  for (const edge of edges) {
    blocks[edge] = {
      all: runBlock('ALL', dataset, edge),
      train: runBlock('TRAIN', train, edge),
      test: runBlock('TEST', test, edge),
    };
    console.log(`================ edge = ${(edge * 100).toFixed(2)}¢ ================`);
    printBlock('ALL  ', blocks[edge].all);
    printBlock('TRAIN', blocks[edge].train);
    printBlock('TEST ', blocks[edge].test);
  }

  const verdict = verdictText(blocks);
  console.log('\nVERDICT: ' + verdict + '\n');

  writeReport(dataset, train, test, blocks, edges, verdict);
  console.log(`Report written to ${path.relative(process.cwd(), REPORT_PATH)}\n`);
}

function verdictText(blocks) {
  // Profitable only if HONEST net > 0 on BOTH train and test at BOTH edges.
  let honestWinsEverywhere = true;
  let optWinsSomewhere = false;
  for (const edge of Object.keys(blocks)) {
    const b = blocks[edge];
    if (b.train.honest.netPnl <= 0 || b.test.honest.netPnl <= 0) honestWinsEverywhere = false;
    if (b.train.opt.netPnl > 0 || b.test.opt.netPnl > 0) optWinsSomewhere = true;
  }
  if (honestWinsEverywhere) {
    return 'PROFITABLE — the honest maker model nets positive on BOTH train and test at both edges. '
      + 'Edge survives strict-cross fills and adverse selection. Still treat with caution (small, '
      + 'volume-selected crypto sample).';
  }
  if (optWinsSomewhere) {
    return 'NOT GENUINELY PROFITABLE — market-making only "wins" under the OPTIMISTIC model '
      + '(touch=fill, no adverse selection). Once fills require a strict cross-through and each fill '
      + 'is marked against the price that ran through it (adverse selection), the edge evaporates. '
      + 'This is the classic way maker backtests lie: the gross spread captured is real, but adverse '
      + 'selection plus settlement of the toxic inventory you accumulate more than eats it.';
  }
  return 'NOT PROFITABLE — the maker loses under both the honest and the optimistic model on this dataset.';
}

function blockRow(tag, b) {
  const h = b.honest, o = b.opt;
  return `| ${tag} | ${h.fills} | ${fmtUsd(h.grossSpread)} | ${fmtUsd(-h.adverseLoss)} | ${fmtUsd(h.settlementPnl)} | **${fmtUsd(h.netPnl)}** | ${fmtUsd(h.expectancy)} | ${fmtUsd(o.netPnl)} | ${fmtUsd(o.expectancy)} |`;
}

function writeReport(dataset, train, test, blocks, edges, verdict) {
  const yesWins = dataset.filter((m) => m.yesWon).length;
  const totalPoints = dataset.reduce((a, m) => a + m.path.length, 0);
  const byAsset = {};
  for (const m of dataset) byAsset[m.asset] = (byAsset[m.asset] || 0) + 1;
  const assetLine = Object.entries(byAsset).map(([k, v]) => `${k}:${v}`).join(', ');

  const tables = edges.map((edge) => {
    const b = blocks[edge];
    return `### edge = ${(edge * 100).toFixed(2)}¢ (quoted half-spread)

| Split | Fills | Gross spread | Adverse loss | Inv. settle | **NET PnL** | Exp/fill | _Optimistic NET_ | _Opt exp/fill_ |
|-------|------:|-------------:|-------------:|------------:|------------:|---------:|----------------:|--------------:|
${blockRow('ALL', b.all)}
${blockRow('TRAIN', b.train)}
${blockRow('TEST', b.test)}`;
  }).join('\n\n');

  const md = `# MIROFISH maker (market-making) backtest report

_Generated ${new Date().toISOString()} by \`scripts/backtest-maker.js\`. Tests whether
POSTING passive resting quotes (earning the spread) beats the unprofitable taker
strategy, under an honest fill model. No parameters are fitted._

## The question

The taker momentum strategy loses **-$4.56/trade** net at a 1¢ spread (see
\`data/backtest-report.md\`) — it pays the spread on every trade. The only
structurally-plausible edge left is the other side of that trade: be the MAKER,
post resting quotes, and **earn** the spread. This report measures whether that
actually works on the same resolved crypto markets.

## Honest fill model (why these numbers don't lie)

Two assumptions separate an honest maker backtest from a fantasy:

1. **Strict cross-through, not touch.** A resting order at level _L_ fills ONLY
   when the price path moves strictly THROUGH _L_ (from one side to the other),
   not when it merely touches and bounces. Touch=fill systematically
   overcounts fills in the maker's favour.
2. **Adverse selection.** You get filled precisely BECAUSE price is moving
   against you — that is why it crossed your quote. Every fill is marked to the
   NEXT bar's mid (the price that continued in the direction that ran you over).
   Booked edge = quoted edge − how far the mark ran past your fill.

We also model **inventory** (hard cap ±${MAXINV * SIZE} shares; a fill that would
breach the cap is not quoted) and **settlement**: whatever inventory is still
open at resolution pays **\$1** if YES won else **\$0**, at par. Sizing is fixed
at **${SIZE} shares/fill** for comparability.

For contrast, each table also reports the **OPTIMISTIC** model (touch=fill, no
adverse selection, spread booked risk-free) — the model naive maker backtests
use. The gap between the honest and optimistic NET is the size of the lie.

## Anti-overfitting

The market set is split deterministically into **TRAIN** (first ${train.length})
and **TEST** (second ${test.length}); both are reported. Nothing is fitted on
either split — the edge values (0.5¢, 1¢) are fixed in advance and the model has
no other free knobs. A genuine edge must survive on TEST, not just TRAIN.

## Dataset

- **${dataset.length}** resolved Polymarket crypto markets (assets: ${assetLine}).
- **${totalPoints}** real price points total (${Math.round(totalPoints / dataset.length)} avg/market).
- Resolution mix: **${yesWins} YES-won / ${dataset.length - yesWins} NO-won**.
- Same cached data as the taker backtest (\`data/history/\`, \`data/resolved-crypto-markets.json\`).

## Results

${tables}

## Verdict

**${verdict}**

## How to read the decomposition

- **Gross spread** is always positive: every fill books \`size × edge\`. Seeing a
  big positive number here is NOT evidence of profit — it's the bait.
- **Adverse loss** is the price you pay for those fills: the market kept moving
  the way that filled you. On short-horizon crypto "Up or Down" markets the mid
  is close to a random walk near resolution, so the adverse move is roughly the
  same magnitude as the edge you booked — they cancel.
- **Inventory settlement** is the tail: passive quoting leaves you holding
  directional inventory into a binary \$1/\$0 resolution. That residual is not a
  spread-capture profit; it's a directional bet you didn't choose, and it's where
  honest maker P&L is won or lost (mostly lost) on these markets.

## Caveats

- Small, volume-selected, crypto-only sample of short-horizon intraday markets.
- The price path is sampled (not every trade/tick), so the strict-cross test
  uses bar-to-bar moves; finer ticks would generate more touch-but-no-fill cases,
  making the honest model if anything MORE conservative about fills, not less.
- Real Polymarket maker fills also depend on queue position and competing makers,
  which can only reduce fill rate further. This model already ignores both.
- Past resolved behavior is not predictive of future performance.
`;

  fs.writeFileSync(REPORT_PATH, md);
}

main().catch((e) => { console.error('maker backtest failed:', e.message); process.exit(1); });
