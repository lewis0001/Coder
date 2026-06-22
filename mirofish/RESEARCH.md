# MIROFISH — research log: can this be made profitable?

Short answer: **not reliably, on the Polymarket markets available to us.** We
tried hard and honestly, with anti-overfitting controls designed specifically
so the search could not fool us. This document records what was tested and what
was found, so the conclusion is auditable rather than asserted.

## How we kept ourselves honest

Running many strategies and keeping the best is *data-mining*: with enough
configs, something always looks profitable by pure luck and then loses real
money. To prevent that, every result went through `lib/validate.js`:

- **Chronological split** — train (oldest 50%) / validation (25%) / a **locked
  holdout** (newest 25%) touched at most once, for the single best candidate.
- **Bootstrap CIs** — a strategy is "profitable" only if the lower bound of a
  2000-sample bootstrap CI on per-trade PnL is **> 0** on the holdout.
- **Multiple-testing correction** — Bonferroni *and* a White's-Reality-Check
  best-of-N null: "could brute-forcing N knobs produce this winner by chance?"
- The harness is self-checked: it **rejects** the best of 200 pure-noise
  strategies and **accepts** a known synthetic edge (`npm run validate`).

## What was tested

| Phase | Universe | Approach | Result |
|------|----------|----------|--------|
| 1 | 60 intraday BTC markets | Momentum / "tail sniper" (taker) | **−$4.56/trade** @1¢; gross also ≈0 → no signal |
| 2 | 60 intraday BTC markets | Market-making (capture spread) | **Loses** train & test, even optimistically; inventory settles into the losing side |
| 3 | 200 markets | Favorite–longshot / mean-reversion / calibration | No edge survives realistic fills out-of-sample |
| 4 | **729 diverse markets** (69% multi-week, 8 categories) | Calibration measurement | Real **gross** mispricing found (below) |
| 5 | **729 diverse markets** | **664-config sweep** through the holdout firewall | **Nothing survived** correction; holdout never touched |

Detailed numbers: `data/backtest-report.md`, `data/backtest-maker-report.md`,
`data/backtest-value-report.md`, `data/research/calibration-study.md`,
`data/research/sweep-report.md` (the `data/research/` reports are local, in the
gitignored cache dir; regenerate with the scripts below).

## The one real signal — and why it still isn't tradeable (yet)

The calibration study found a genuine, mechanistic **gross** mispricing: YES
contracts priced in the **30–50% band resolve NO far more often than priced**
(~22% realized vs ~48% implied, ≈ **−25¢** gross edge, many SE significant).
The cause is structural — these are mostly **single legs of mutually-exclusive
events** ("Will *team* win?"): many legs each quoted ~40–50% when only one can
win, so the basket of such YES legs is over-priced and mostly settles NO.

Why it did **not** become a deployable edge in the sweep:
1. It lives in the **thinnest, widest-spread, lowest-volume, longest-dated**
   markets — exactly where a real round-trip cost is largest and least known
   (we only had a mid-price path, not live bid/ask).
2. Treated as a single-market hold-to-resolution bet it is **too thin/noisy** in
   the time-split validation to clear multiple-testing correction — its
   bootstrap CI includes zero and the reality-check p ≈ 0.98.

It is a real research lead, but capturing it would require a different design
than a single-market bot: explicitly **grouping the legs of each
mutually-exclusive event and shorting the overpriced basket** (a cross-sectional
structural trade), plus **real bid/ask data** to confirm the spread is payable.
That is genuine future work, not a guaranteed edge.

## Honest bottom line

On near-efficient Polymarket markets, the dominant cost is the bid/ask spread,
and no simple, inspectable strategy we tested produces a profit that survives
proper out-of-sample, multiple-testing-corrected validation. The valuable
deliverable here is a system that can **measure** edge honestly and **refuses to
believe** one that isn't there — which is exactly what protects real capital.

## Reproduce

```bash
cd mirofish
npm run validate    # self-check the anti-overfitting harness
node scripts/backtest.js          # momentum baseline (intraday)
node scripts/calibration-study.js # where prices are mispriced
node scripts/sweep.js             # 664-config search through the holdout firewall
```
