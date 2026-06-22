# Tradeable-edge scorecard

Goal: find **5 edges we can actually trade**. An edge is only listed as
**CONFIRMED** if it is net-positive *after executable order-book cost* (real
VWAP / slippage via `lib/orderbook.js`), de-clustered, and either currently
executable live or honestly forward-testable. Backtest-only results that assume
mid-price fills do **not** count (that standard caught the overround false
positive — see `RESEARCH.md`).

Status legend: 🔎 testing · ✅ confirmed tradeable · ⚠️ real-but-marginal · ❌ not tradeable

| # | Edge hypothesis | Method | Status | Net edge (after real cost) | Capacity / caveat |
|---|------------------|--------|--------|-----------------------------|-------------------|
| 1 | Logical arb (nested thresholds / temporal) | live book-cross scan | 🔎 | — | ladders dead-efficient (hist); temporal illiquid |
| 2 | Multi-outcome basket / overround | live book scan | ❌ | 247 mutex events; 0 net-positive — all-NO basket costs >(K−1) even BEFORE fees | bots arb tighter than payout; +taker fees |
| 3 | Cross-venue Polymarket↔Kalshi | match + live quotes + Kalshi fees | ❌ | 58 matches, max gap 1.5¢, 0 net-positive after ~2¢ Kalshi fee + spreads | venues tightly arbed; need >3–4¢ gap |
| 4 | Crypto fair-value vs Deribit/Coinbase | BS fair-prob vs live book | ❌ | threshold mkts match Deribit to ±0.2¢; 0 executable; gaps = model error | PM crypto efficient where model valid |
| 5 | Spread-capture (passive MM) | live book sampling | 🔎 | — | adverse selection / inventory |
| 6 | Fade-longshot on liquid markets | live screen + fwd log + liquid-subset OOS | ❌ | liquid half +0.003/sh, CI∋0; OOS [−0.10,+0.10]; negative at stricter liquidity | edge lives only in unfillable illiquid markets |

Updated as agents report. The honest bar is high on purpose: a clean backtest
you can't fill is worse than no edge.
