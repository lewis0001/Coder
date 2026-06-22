# MIROFISH valuation backtest report

_Generated 2026-06-22T13:46:03.892Z by `scripts/backtest-value.js`. Tests
VALUATION / MISPRICING rules from `lib/strategy-value.js` on the existing taker
backtester. No parameter fitting beyond round-number thresholds; train/test split
reported._

## Method (same honesty model as the momentum report)

- **No look-ahead.** Bar-by-bar replay; bar _t_ sees only price points ≤ _t_.
- **Fills cross the spread.** Buy @ `mid+spread/2`, sell @ `mid-spread/2`.
  Reported at a fair **1¢** spread and a realistic **2¢** sensitivity case.
- **Settlement at par.** Open positions pay **$1** (YES won) or **$0** at resolution.
- **Fixed $100 stake** per entry. Each valuation strategy enters AT MOST ONCE
  per market then HOLDS to resolution — so a trade's outcome IS the calibration
  of its entry price (no momentum take-profit/stop layered on top).
- **Train/Test split** by market-id parity (~50/50). **Calibration is measured on the
  FULL set** — it is a measurement, not a fit.

## Dataset

- **200** resolved Polymarket crypto markets (BTC:200).
- **147495** price points. Resolution mix **97 YES / 103 NO**.
- Market types: **196** intraday "Up or Down", **4** longer-dated valuation/reach.
- **Limitation:** `fetchResolvedCryptoMarkets` pages resolved crypto by 24h volume,
  which is overwhelmingly intraday coin-flip markets. Longer-dated valuation markets
  (where favorite–longshot bias classically lives) are scarce in this universe, so
  hypothesis (a) is tested mostly on intraday favorites that emerge mid-path.

## Calibration table (FULL set, first touch of each price bucket per market)

> Does buying YES at price _p_ win ~_p_ of the time? `edge = realized winFreq - avg price`.
> edge > 0 ⇒ UNDERpriced (buying wins more than priced); edge < 0 ⇒ OVERpriced.

| bucket | n | avg price | win freq | edge (real − priced) |
|--------|--:|----------:|---------:|---------------------:|
| 0-10% | 99 | 0.029 | 0.010 | -0.019 |
| 10-20% | 49 | 0.149 | 0.245 | +0.096 |
| 20-30% | 63 | 0.249 | 0.317 | +0.068 |
| 30-40% | 70 | 0.353 | 0.457 | +0.104 |
| 40-50% | 157 | 0.481 | 0.478 | -0.003 |
| 50-60% | 200 | 0.505 | 0.485 | -0.020 |
| 60-70% | 65 | 0.648 | 0.585 | -0.064 |
| 70-80% | 54 | 0.736 | 0.648 | -0.088 |
| 80-90% | 46 | 0.847 | 0.848 | +0.001 |
| 90-100% | 95 | 0.965 | 0.968 | +0.003 |

## Entry-timing diagnostic (why the calibration "edge" is not tradeable)

> When is each price band FIRST reached, in time-to-resolution? If off-coin-flip
> bands are only touched in the final minutes, any apparent edge there is a
> last-moments fill artifact, not a durable valuation state.

| band | n | win freq | median time-to-resolve at first touch |
|------|--:|---------:|--------------------------------------:|
| 10-30% | 85 | 0.294 | 3.0min |
| 30-50% | 166 | 0.470 | 6.9min |
| 50-70% | 200 | 0.485 | 14.3h |
| 70-90% | 83 | 0.711 | 2.9min |
| 90-100% | 95 | 0.968 | 0.9min |

## Strategy results

### Full set @ 1¢

| strategy | trades | win | gross | spread cost | net | exp/trade |
|----------|-------:|----:|------:|------------:|----:|----------:|
| Favorite buy 0.8-0.95 | 58 | 87.9% | $105.05 | $33.49 | **$71.55** | $1.23 |
| Mean-revert dip>=0.08 band 0.15-0.85 | 127 | 40.9% | $3563.46 | $208.16 | **$3355.30** | $26.42 |
| Buy&hold longshot 10-30c | 85 | 29.4% | $3122.43 | $208.81 | **$2913.62** | $34.28 |
| Buy&hold 30-50c | 166 | 47.0% | -$210.11 | $175.48 | **-$385.59** | -$2.32 |
| Buy&hold 50-70c | 200 | 48.5% | -$772.60 | $196.15 | **-$968.74** | -$4.84 |
| Buy&hold favorite 70-90c | 83 | 71.1% | -$740.00 | $53.35 | **-$793.35** | -$9.56 |
| Buy&hold near-cert 90-100c | 53 | 94.3% | $16.50 | $28.02 | **-$11.51** | -$0.22 |

### Train vs Test (net PnL, exp/trade in parens)

| strategy | train @1¢ | test @1¢ | train @2¢ | test @2¢ |
|----------|----------:|---------:|----------:|--------:|
| Favorite buy 0.8-0.95 | $97.68 ($3.37) | -$26.13 (-$0.90) | $80.46 ($2.77) | -$42.58 (-$1.47) |
| Mean-revert dip>=0.08 band 0.15-0.85 | $1474.08 ($22.33) | $1881.23 ($30.84) | $1335.17 ($20.23) | $1752.31 ($28.73) |
| Buy&hold longshot 10-30c | $1424.30 ($33.91) | $1489.32 ($34.64) | $1288.61 ($30.68) | $1353.04 ($31.47) |
| Buy&hold 30-50c | -$731.17 (-$8.22) | $345.58 ($4.49) | -$816.29 (-$9.17) | $263.13 ($3.42) |
| Buy&hold 50-70c | -$980.39 (-$9.80) | $11.65 ($0.12) | -$1067.96 (-$10.68) | -$85.67 (-$0.86) |
| Buy&hold favorite 70-90c | -$301.76 (-$6.86) | -$491.59 (-$12.60) | -$327.99 (-$7.45) | -$513.09 (-$13.16) |
| Buy&hold near-cert 90-100c | -$64.57 (-$2.39) | $53.06 ($2.04) | -$78.40 (-$2.90) | $39.05 ($1.50) |

## Verdict

**APPARENT but NOT A REAL VALUATION EDGE. Mean-revert dip>=0.08 band 0.15-0.85; Buy&hold longshot 10-30c print net-positive on train AND test at 1c AND 2c, BUT the entry-timing diagnostic shows every off-coin-flip price band is first reached only in the FINAL ~3-7 MINUTES before resolution (median time-to-resolve < 10 min). So the "edge" is a last-moments price-whipsaw in 5-minute "Up or Down" markets, not a durable mispricing you could trade at the quoted spread (fills at 20c with 3 min left, in the thinnest part of the book, are exactly where the 1-2c spread assumption is least credible). The persistent coin-flip band (50-70c, ~14h to go) is fair and unprofitable. Favorite buy 0.80-0.95 does NOT survive out-of-sample (test < 0). Net: no genuine valuation edge on this (intraday-dominated) dataset.**

## Caveats

- Crypto-only, volume-selected, and ≈98% intraday "Up or Down"
  coin-flip markets — not the multi-day valuation universe the favorite–longshot bias is
  documented in. The scarcity of longer-dated markets is a hard limit of this data source.
- Favorites/longshots here mostly appear MID-PATH as the coin flip resolves directionally,
  so "buy the 80¢ favorite" is partly buying late-stage near-decided markets.
- Small sample; survivorship/selection bias from ordering by volume; past ≠ future.
