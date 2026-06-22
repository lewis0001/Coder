# MIROFISH backtest report

_Generated 2026-06-22T13:36:22.435Z by `scripts/backtest.js`. Measures the
**current** `lib/strategy.js` as written — no parameter fitting._

## Method (why these numbers are honest)

- **No look-ahead.** Each market is replayed bar-by-bar; at bar _t_ the strategy
  sees only price points with timestamp ≤ _t_. It cannot see the resolution.
- **Fills cross the spread.** Buys fill at `mid + spread/2`, sells at
  `mid − spread/2`. We report a fair **1¢** spread and a **2¢** sensitivity case.
- **Settlement at par.** A position still open at resolution pays **$1** if the
  YES/Up outcome won, else **$0** (no spread on settlement).
- **Fixed stake** of $100 notional per entry, so per-trade expectancy is clean.
- **No fitting.** Strategy parameters are untouched (`lib/strategy.js DEFAULTS`).

## Dataset

- **60** resolved Polymarket crypto markets (assets: BTC:60).
- **44167** real price points total (736 avg/market).
- Resolution mix: **34 YES-won / 26 NO-won**.
- Data + cache live under `data/history/` and `data/resolved-crypto-markets.json`.

## Results

| Spread | Trades | Win rate | Gross PnL | Spread cost | **Net PnL** | Exp/trade | ROI/trade |
|--------|-------:|---------:|----------:|------------:|------------:|----------:|----------:|
| 1¢ (fair)        | 265 | 25.3% | -$123.62 | $1084.37 | **-$1207.99** | -$4.56 | -4.56% |
| 2¢ (sensitivity) | 264 | 20.8% | -$41.06 | $2071.75 | **-$2112.81** | -$8.00 | -8.00% |

Markets that ever traded: **51/60**.

## Verdict

**NOT PROFITABLE — the current strategy LOSES money net of costs even at an optimistic 1¢ spread (-$1207.99, -$4.56/trade) and worse at 2¢ (-$2112.81). Win rate 25.3% is not enough to overcome the cost of crossing the spread.**

## Sample trades (1¢ spread)

| Question | Reason out | Entry | Exit | Shares | Net PnL |
|----------|-----------|------:|-----:|-------:|--------:|
| Bitcoin Up or Down - June 21, 8:20PM-8:25PM ET | momentum reversed | 0.515 | 0.485 | 194.17 | -$5.83 |
| Bitcoin Up or Down - June 21, 8:20PM-8:25PM ET | momentum reversed | 0.51 | 0.46 | 196.08 | -$9.80 |
| Bitcoin Up or Down - June 21, 8:20PM-8:25PM ET | resolve<0.05h | 0.68 | 0.355 | 147.06 | -$47.79 |
| Bitcoin Up or Down - June 21, 8:10PM-8:15PM ET | momentum reversed | 0.515 | 0.5 | 194.17 | -$2.91 |
| Bitcoin Up or Down - June 21, 8:10PM-8:15PM ET | stop-loss -52% | 0.535 | 0.25 | 186.92 | -$53.27 |
| Bitcoin Up or Down - June 22, 1:35AM-1:40AM ET | resolve<0.05h | 0.49 | 0.6 | 204.08 | $22.45 |
| Bitcoin Up or Down - June 22, 1:45AM-1:50AM ET | resolve<0.05h | 0.53 | 0.33 | 188.68 | -$37.74 |
| Bitcoin Up or Down - June 21, 6:10PM-6:15PM ET | resolve<0.05h | 0.54 | 0.49 | 185.19 | -$9.26 |

## Caveats

- Small sample; crypto-only; mostly short-horizon "Up or Down" intraday markets.
- The market set is drawn from resolved markets ordered by volume — some
  survivorship/selection bias is unavoidable.
- The 1¢ spread is optimistic for thin books; real costs are often closer to 2¢+.
- Past resolved behavior is not predictive of future performance.
