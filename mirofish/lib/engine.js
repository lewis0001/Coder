'use strict';
/* ============================================================
   Paper-trading engine — REAL accounting, simulated fills.
   ------------------------------------------------------------
   - Fills BUY at the live ask, SELL at the live bid (real CLOB
     quotes), so PnL tracks what real execution would have done.
   - Tracks cash, open positions, realized + unrealized PnL,
     win rate, and a full trade log.
   - Enforces risk limits (per-trade size, max open positions,
     daily loss kill-switch).
   - Persists everything to data/state.json (atomic write).

   LIVE mode is intentionally guarded: placing real Polymarket
   orders requires a funded wallet + signed CLOB credentials,
   which are NOT configured here. Paper is the safe default.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '..', 'data', 'state.json');

const RISK = {
  startBankroll: Number(process.env.BANKROLL || 10000), // paper USDC
  perTradeFrac: 0.05,     // 5% of bankroll per snipe
  maxTradeUsd: 750,
  maxOpenPositions: 12,
  dailyLossLimit: 0.20,   // halt if down 20% on the day
  feeBps: 0,              // Polymarket has no maker/taker fee on fills
};

function nowISO() { return new Date().toISOString(); }

class Engine {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const s = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      if (s && typeof s.cash === 'number') return s;
    } catch { /* fresh */ }
    return {
      mode: process.env.MODE === 'live' ? 'live' : 'paper',
      cash: RISK.startBankroll,
      startBankroll: RISK.startBankroll,
      positions: {},        // key: marketId
      trades: [],           // closed + open fills log
      realized: 0,
      wins: 0, losses: 0,
      tradeCount: 0,
      halted: false,
      dayKey: new Date().toISOString().slice(0, 10),
      dayStartEquity: RISK.startBankroll,
      createdAt: nowISO(),
    };
  }

  save() {
    const tmp = STATE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, STATE_PATH);
  }

  resetDayIfNeeded(equity) {
    const k = new Date().toISOString().slice(0, 10);
    if (k !== this.state.dayKey) {
      this.state.dayKey = k;
      this.state.dayStartEquity = equity;
      this.state.halted = false;
    }
  }

  /* mark-to-market equity using latest mids keyed by marketId */
  equity(midById) {
    let pos = 0;
    for (const p of Object.values(this.state.positions)) {
      const mid = midById[p.marketId] ?? p.avgPrice;
      pos += p.shares * mid;
    }
    return this.state.cash + pos;
  }

  unrealized(midById) {
    let u = 0;
    for (const p of Object.values(this.state.positions)) {
      const mid = midById[p.marketId] ?? p.avgPrice;
      u += p.shares * (mid - p.avgPrice);
    }
    return u;
  }

  riskState(midById) {
    const eq = this.equity(midById);
    this.resetDayIfNeeded(eq);
    const dayPnl = eq - this.state.dayStartEquity;
    if (dayPnl <= -RISK.dailyLossLimit * this.state.dayStartEquity) this.state.halted = true;
    return { equity: eq, dayPnl };
  }

  canEnter() {
    if (this.state.halted) return false;
    return Object.keys(this.state.positions).length < RISK.maxOpenPositions;
  }

  /* BUY YES at live ask. Returns the fill or null. */
  enter(market, fillAsk, confidence) {
    if (!this.canEnter()) return null;
    if (!(fillAsk > 0) || fillAsk >= 1) return null;
    if (this.state.positions[market.id]) return null;
    const budget = Math.min(RISK.maxTradeUsd, this.state.cash * RISK.perTradeFrac * (0.6 + 0.8 * confidence));
    if (budget < 1 || budget > this.state.cash) return null;
    const shares = budget / fillAsk;        // each share pays $1 if YES resolves true
    this.state.cash -= budget;
    const pos = {
      marketId: market.id, question: market.question, asset: market.asset,
      token: market.tokenYes, side: 'YES', shares, avgPrice: fillAsk,
      cost: budget, openedAt: nowISO(), endDate: market.endDate,
    };
    this.state.positions[market.id] = pos;
    this.state.tradeCount++;
    this.state.trades.unshift({ t: nowISO(), kind: 'BUY', asset: market.asset, q: market.question,
      price: fillAsk, shares, usd: budget });
    this.trim();
    return pos;
  }

  /* SELL the full position at live bid. Returns realized pnl. */
  exit(marketId, fillBid, reason) {
    const p = this.state.positions[marketId];
    if (!p) return null;
    const price = fillBid > 0 ? fillBid : 0; // worst case: longshot expired worthless
    const proceeds = p.shares * price;
    const pnl = proceeds - p.cost;
    this.state.cash += proceeds;
    this.state.realized += pnl;
    if (pnl >= 0) this.state.wins++; else this.state.losses++;
    this.state.trades.unshift({ t: nowISO(), kind: 'SELL', asset: p.asset, q: p.question,
      price, shares: p.shares, usd: proceeds, pnl, reason });
    delete this.state.positions[marketId];
    this.trim();
    return pnl;
  }

  trim() { if (this.state.trades.length > 200) this.state.trades.length = 200; }

  winRate() {
    const n = this.state.wins + this.state.losses;
    return n ? this.state.wins / n : 0;
  }

  /* rough Sharpe from closed-trade pnls (illustrative) */
  sharpe() {
    const pnls = this.state.trades.filter(t => typeof t.pnl === 'number').map(t => t.pnl);
    if (pnls.length < 3) return 0;
    const m = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const sd = Math.sqrt(pnls.reduce((a, b) => a + (b - m) ** 2, 0) / pnls.length) || 1;
    return (m / sd) * Math.sqrt(pnls.length);
  }
}

module.exports = { Engine, RISK };
