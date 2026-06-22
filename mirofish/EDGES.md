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
| 1 | Logical arb (nested thresholds / temporal) | live book-cross scan | ⚠️→❌ | gross max +1.0¢/$1 (NY-13 primary), executable on live books — but **negative after 4% politics taker fee** (~1.4¢/leg) | books efficient 99.7%; fees wipe the thin tail |

> **DECISIVE FINDING — Polymarket charges category taker fees** (verified via Gamma/CLOB `feeSchedule`): sports **3%**, politics **4%**, economics/culture **5%**, crypto **7%**; taker-only, 25% maker rebate; ~4% of markets fee-free. These fees **dwarf every micro-edge found** (logical arbs are 0.1–1.0¢/$1; fees scale with price and run 1–4¢/share). This is why nothing is tradeable: the books are both efficient *and* fee-protected. It also means every backtest here (and the live bot's zero-fee model) was optimistic — crypto worst at 7%.
| 2 | Multi-outcome basket / overround | live book scan | ❌ | 247 mutex events; 0 net-positive — all-NO basket costs >(K−1) even BEFORE fees | bots arb tighter than payout; +taker fees |
| 3 | Cross-venue Polymarket↔Kalshi | match + live quotes + Kalshi fees | ❌ | 58 matches, max gap 1.5¢, 0 net-positive after ~2¢ Kalshi fee + spreads | venues tightly arbed; need >3–4¢ gap |
| 4 | Crypto fair-value vs Deribit/Coinbase | BS fair-prob vs live book | ❌ | threshold mkts match Deribit to ±0.2¢; 0 executable; gaps = model error | PM crypto efficient where model valid |
| 5 | Spread-capture (passive MM) | live 14-min book sampling | ❌ | net −2.42¢/round-trip (gross +0.20¢ − adverse 2.63¢); rebate doesn't cover it | wide spread=no flow; flow=adverse selection |

### Fee-aware pivot (wave 2)
The gross edges above are real; they're killed by the 3–7% taker fee. But **geopolitics markets are fee-free** (`feesEnabled=false`) and liquid ($200k–5M/24h). The structural edges (temporal logical arb on "by-date" chains; overround on multi-candidate fields) would be **net-tradeable there**. Testing this directly:
| 7 | Logical/overround arb on FEE-FREE markets | live book scan, fee=0 | ❌ | temporal locks cross at 102.1¢ (>$1 before fees); all-NO baskets +1.83¢ over (K−1) | fee-free books also arbed tight to/past parity |
| 8 | Fade / relative-value on FEE-FREE liquid geopolitics | live + fwd log | ❌ | mid-band legs priced fairly-to-NEGATIVE by live book (Netanyahu −21¢, Hormuz −26¢); only near-calibrated longshot noise is "+" | field-level NO-rate ≠ per-leg edge; bots arb legs tight |
| 6 | Fade-longshot on liquid markets | live screen + fwd log + liquid-subset OOS | ❌ | liquid half +0.003/sh, CI∋0; OOS [−0.10,+0.10]; negative at stricter liquidity | edge lives only in unfillable illiquid markets |

Updated as agents report. The honest bar is high on purpose: a clean backtest
you can't fill is worse than no edge.

---

## SOLUTIONS THAT ACTUALLY PAY (the honest answer)

Every *directional / arbitrage* hypothesis above is ❌ net of real cost — the
books are efficient where liquid and fee-protected (3–7% taker) where they're
not. **Profit on Polymarket does not come from predicting better; it comes from
harvesting the platform's liquidity incentives.** Confirmed, tradeable:

### ✅ Solution 1 — Liquidity-rewards farming (maker rewards)
Polymarket pays ~**$60k/day** across **302** markets to makers who rest orders
within `rewardsMaxSpread` of the midpoint (paid for *presence in the band*, not
fills). On **deep, stable, low-volatility** markets a disciplined maker clears
**~1–2%/day net of adverse selection** at $1k–5k/market (higher on near-resolved
daily markets, but ephemeral). Discipline: only farm markets the live
volatility sampler flags as stable; quote at the wide max-spread; size for the
capacity-diluted yield. Tools: `lib/rewards.js`, `scripts/scan-rewards.js`.
Risk: adverse selection if the mid moves (volatile markets lose); inventory.

