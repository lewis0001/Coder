# MIROFISH maker (market-making) backtest report

_Generated 2026-06-22T13:40:09.522Z by `scripts/backtest-maker.js`. Tests whether
POSTING passive resting quotes (earning the spread) beats the unprofitable taker
strategy, under an honest fill model. No parameters are fitted._

## The question

The taker momentum strategy loses **-$4.56/trade** net at a 1¢ spread (see
`data/backtest-report.md`) — it pays the spread on every trade. The only
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

We also model **inventory** (hard cap ±300 shares; a fill that would
breach the cap is not quoted) and **settlement**: whatever inventory is still
open at resolution pays **$1** if YES won else **$0**, at par. Sizing is fixed
at **100 shares/fill** for comparability.

For contrast, each table also reports the **OPTIMISTIC** model (touch=fill, no
adverse selection, spread booked risk-free) — the model naive maker backtests
use. The gap between the honest and optimistic NET is the size of the lie.

## Anti-overfitting

The market set is split deterministically into **TRAIN** (first 30)
and **TEST** (second 30); both are reported. Nothing is fitted on
either split — the edge values (0.5¢, 1¢) are fixed in advance and the model has
no other free knobs. A genuine edge must survive on TEST, not just TRAIN.

## Dataset

- **60** resolved Polymarket crypto markets (assets: BTC:60).
- **44167** real price points total (736 avg/market).
- Resolution mix: **34 YES-won / 26 NO-won**.
- Same cached data as the taker backtest (`data/history/`, `data/resolved-crypto-markets.json`).

## Results

### edge = 0.50¢ (quoted half-spread)

| Split | Fills | Gross spread | Adverse loss | Inv. settle | **NET PnL** | Exp/fill | _Optimistic NET_ | _Opt exp/fill_ |
|-------|------:|-------------:|-------------:|------------:|------------:|---------:|----------------:|--------------:|
| ALL | 1513 | $756.50 | -$7453.75 | -$4400.00 | **-$5001.80** | -$3.31 | -$5265.00 | -$2.73 |
| TRAIN | 1289 | $644.50 | -$4767.20 | -$1900.00 | **-$3289.35** | -$2.55 | -$3567.05 | -$2.11 |
| TEST | 224 | $112.00 | -$2686.55 | -$2500.00 | **-$1712.45** | -$7.64 | -$1697.95 | -$7.07 |

### edge = 1.00¢ (quoted half-spread)

| Split | Fills | Gross spread | Adverse loss | Inv. settle | **NET PnL** | Exp/fill | _Optimistic NET_ | _Opt exp/fill_ |
|-------|------:|-------------:|-------------:|------------:|------------:|---------:|----------------:|--------------:|
| ALL | 1054 | $1054.00 | -$6843.05 | -$4900.00 | **-$4500.50** | -$4.27 | -$4230.00 | -$2.97 |
| TRAIN | 866 | $866.00 | -$4167.10 | -$2200.00 | **-$2850.10** | -$3.29 | -$2629.60 | -$2.19 |
| TEST | 188 | $188.00 | -$2675.95 | -$2700.00 | **-$1650.40** | -$8.78 | -$1600.40 | -$7.24 |

## Verdict

**NOT PROFITABLE — the maker loses under both the honest and the optimistic model on this dataset.**

## How to read the decomposition

- **Gross spread** is always positive: every fill books `size × edge`. Seeing a
  big positive number here is NOT evidence of profit — it's the bait.
- **Adverse loss** is the price you pay for those fills: the market kept moving
  the way that filled you. On short-horizon crypto "Up or Down" markets the mid
  is close to a random walk near resolution, so the adverse move is roughly the
  same magnitude as the edge you booked — they cancel.
- **Inventory settlement** is the tail: passive quoting leaves you holding
  directional inventory into a binary $1/$0 resolution. That residual is not a
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
