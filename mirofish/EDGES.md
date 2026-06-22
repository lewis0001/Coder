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
| 2 | Multi-outcome basket / overround | live book scan | 🔎 | — | liquid negRisk arbed to ~1¢ |
| 3 | Cross-venue Polymarket↔Kalshi | match + live quotes + Kalshi fees | 🔎 | — | matching confidence + fees |
| 4 | Crypto fair-value vs Deribit/Coinbase | BS fair-prob vs live book | 🔎 | — | model/anchor risk |
| 5 | Spread-capture (passive MM) | live book sampling | 🔎 | — | adverse selection / inventory |
| 6 | Fade-longshot on liquid markets | live screen + fwd log + liquid-subset OOS | 🔎 | — | liquidity may kill it |

Updated as agents report. The honest bar is high on purpose: a clean backtest
you can't fill is worse than no edge.
