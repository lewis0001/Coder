# CLAUDE FABLE 5 — MIROFISH

A **real** Polymarket trading bot with a live dashboard, recreating the
"Crypto Tail Sniper" concept from the reference screenshot — but actually
wired to live markets, running a real signal strategy, and executing trades.

It ships in **paper mode** by default: it connects to live Polymarket data and
the real order-book quotes, runs the strategy for real, and books fills at the
live bid/ask — but with simulated USDC, so there is **zero financial risk**.
Flipping to live trading is a deliberate, separate step (see below).

> **Honest disclaimer.** The "Galton board / tail sniper" theming is an
> aesthetic. This bot has **no proven edge** and trading prediction markets can
> and will lose money. The code is the machinery to trade; the decision to risk
> real funds — and the consequences — are yours.

## Is it profitable? (measured, not guessed)

No — and we proved it rigorously rather than hand-waving. A look-ahead-free,
spread-crossing backtester (`npm run backtest`) was run on **60 real resolved
Polymarket crypto markets (44k price points)**, and three structurally-motivated
strategy families were tested out-of-sample (train/test split):

| Approach | Result (net of costs) |
|----------|-----------------------|
| Momentum / "tail sniper" (current) | **−$4.06/trade** @1¢ spread; gross also ≈0 → no edge |
| Market-making (capture the spread) | **Loses** train & test; killed by inventory settling into the losing side |
| Valuation / favorite–longshot / mean-reversion | No edge survives realistic fills out-of-sample |

The full numbers and methodology are in `data/backtest-report.md`,
`data/backtest-maker-report.md`, and `data/backtest-value-report.md`.

**Why:** short-horizon crypto "Up or Down" markets are near-efficient, and every
round trip pays the full bid/ask spread, which dwarfs any signal. The honest
conclusion is that the best action on these markets is usually **not to trade**.

### What changed after measuring
The engine was made *truthful* rather than *optimistic* (see git history): open
positions are now marked at the **bid** (the price you could actually sell at,
not the mid), and the strategy now has a **signal-must-exceed-cost gate** — it
only enters when the expected move clears the round-trip spread, so it stops
churning on noise. These don't make it profitable; they make the paper results
match what real execution would do.

## Run it

Requires **Node 18+**. No dependencies, no build step.

```bash
cd mirofish
node server.js
# open http://localhost:8088
```

Config via env vars:

| var        | default | meaning                                   |
|------------|---------|-------------------------------------------|
| `PORT`     | `8088`  | dashboard / API port                      |
| `POLL_MS`  | `6000`  | trading-loop interval (ms)                |
| `TRACK`    | `14`    | number of markets to follow               |
| `BANKROLL` | `10000` | starting paper USDC                       |
| `MODE`     | `paper` | `paper` (safe) or `live` (guarded)        |
| `START_PAUSED` | –   | set `1` to boot paused                    |

```bash
node test.js        # deterministic checks of the signal + accounting
npm run reset       # wipe data/state.json and start fresh
```

## How it actually works

```
Polymarket Gamma API ──┐
(market metadata)      ├─►  universe selection ─►  strategy ─►  paper engine ─►  dashboard (SSE)
Polymarket CLOB API ───┘    (crypto, live book)   (signals)    (fills + PnL)
(live bid/ask/mid)
```

1. **Data — `lib/polymarket.js`.** Pulls live markets from the Gamma API and
   live order-book quotes (bid/ask/midpoint) from the CLOB API. Public,
   key-less, read-only endpoints. Filters to crypto markets (BTC/ETH/SOL/XRP/DOGE),
   preferring the continuously-refreshing intraday "Up or Down" markets.

2. **Strategy — `lib/strategy.js`.** A fully **inspectable** rule, not a black
   box. It's momentum-primary with a "tail" bias:
   - **Entry** when YES price is in a tradeable band (3¢–68¢), short-term
     price momentum is positive, the book is liquid and the spread is tight.
     Cheaper ("tail") entries get higher conviction and size — that's the
     sniper flavour.
   - **Exit** on take-profit (+40%), stop-loss (−30%), momentum reversal, or
     when the market is about to resolve.
   - Every decision returns a human-readable `reason` shown in the log.

3. **Execution — `lib/engine.js`.** A real paper portfolio: buys at the live
   ask, sells at the live bid, tracks cash, open positions, realized +
   unrealized PnL, win rate, and a full trade log. Risk limits: per-trade
   sizing (5% of bankroll, capped), max open positions, and a daily-loss
   kill-switch. State persists to `data/state.json`.

4. **Server + dashboard — `server.js` + `public/`.** The trading loop runs on a
   timer; the dashboard subscribes over Server-Sent Events and renders **real**
   numbers: the signal board, positions, execution log, PnL, and three
   data-driven visualisations (closed-trade outcome lattice, live YES-price
   ridge, and a market relationship graph). Pause / resume / flatten controls
   are wired to the engine.

## Going live (real money) — read carefully

Live trading is intentionally **not** plug-and-play. To place real Polymarket
orders you must supply your own funded setup; the bot will not touch real funds
until you do this deliberately:

1. A **Polygon wallet** funded with USDC, with the Polymarket CTF/exchange
   allowances approved.
2. **CLOB API credentials** (an API key/secret/passphrase derived by signing
   with that wallet), set as environment variables.
3. Implement the order-signing call in `lib/engine.js` (the `enter`/`exit`
   methods are where paper fills happen; live mode would POST signed orders to
   the CLOB `/order` endpoint) and run with `MODE=live`.

Until those credentials exist, `MODE=live` has nothing to sign with and the
engine stays in safe paper accounting. **Start in paper, watch it for a good
while, and only ever risk money you can afford to lose.**

## Files

```
mirofish/
├── server.js          # HTTP server + trading loop + SSE
├── lib/
│   ├── polymarket.js  # live Gamma + CLOB API client
│   ├── strategy.js    # inspectable signal rule
│   └── engine.js      # paper portfolio + risk limits + persistence
├── public/            # dashboard (index.html / styles.css / app.js)
├── test.js            # deterministic signal + accounting checks
└── data/state.json    # persisted portfolio (gitignored)
```
