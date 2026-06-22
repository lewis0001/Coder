'use strict';
/* ============================================================
   Event-driven BACKTESTER — rigorous, realistic, cost-aware.
   ------------------------------------------------------------
   Goal: HONESTLY measure whether lib/strategy.js makes money on
   real resolved Polymarket crypto markets, net of trading costs.

   Honesty guarantees (the whole point of this file):

   1. NO LOOK-AHEAD. We replay a market bar-by-bar. The decision
      at bar i is shown ONLY price points with timestamp <= the
      timestamp of bar i. The strategy literally cannot see the
      future, including the eventual resolution.

   2. FILLS CROSS THE SPREAD. Real fills aren't at the mid. We
      model a configurable round-trip spread `cfg.spread`
      (default 0.01 = 1¢, optimistic-to-fair for liquid
      Polymarket books). A BUY fills at  mid + spread/2 (the ask),
      a SELL fills at  mid - spread/2 (the bid). That half-spread
      on each side is a real cost paid to whoever takes the
      other side.

   3. REALISTIC SETTLEMENT. If a position is still open when the
      market resolves, YES shares pay $1 if the YES/Up outcome
      won, else $0. (No spread on settlement — resolution is at
      par, like real Polymarket.) Otherwise the strategy's own
      exit fires and we sell at the spread-adjusted bid.

   4. NO FITTING. We measure the strategy AS WRITTEN. Nothing
      here tunes its parameters.

   Money model: a fixed notional `cfg.stake` USD per entry (so
   each trade is comparable and per-trade expectancy is clean).
   shares = stake / fillAsk; each share pays $1 on a YES win.
   ============================================================ */

const { decide, DEFAULTS } = require('./strategy');

const HOUR_MS = 3600000;

/* Backtest ONE market.
   args:
     market : { yesWon, endDate, path:[{t,p}], question, asset, id, volume24hr }
     cfg    : strategy DEFAULTS (or override)
     opts   : { spread, stake, lookback }
   returns per-market stats + a trade log. */
function backtestMarket(market, cfg = DEFAULTS, opts = {}) {
  const spread = opts.spread != null ? opts.spread : 0.01;
  const stake = opts.stake != null ? opts.stake : 100;
  const half = spread / 2;

  const path = market.path;
  const n = path.length;
  const endUnix = market.endDate ? new Date(market.endDate).getTime() / 1000 : (path[n - 1].t);
  const realNow = Date.now();

  // running history of MIDS visible up to (and including) the current bar
  const visibleMids = [];
  let position = null;     // { avgPrice, shares, cost }
  let costsPaid = 0;       // total half-spread paid (buy + sell), in USD
  let grossPnl = 0;        // PnL ignoring spread (mid-to-mid / settlement)
  let netPnl = 0;          // PnL actually realized (after spread)
  let trades = 0, wins = 0, losses = 0;
  const log = [];

  // Build the per-bar "market" snapshot the strategy expects. Crucially the
  // endDate is expressed as remaining time from the REAL now, so the
  // strategy's internal hoursUntil(endDate) (which uses Date.now()) returns
  // the correct number of hours LEFT at this simulated bar — not wall clock.
  function snapshot(bar) {
    const mid = bar.p;
    const remainingMs = (endUnix - bar.t) * 1000;
    return {
      id: market.id,
      question: market.question,
      asset: market.asset,
      mid,
      bestBid: Math.max(0, mid - half),
      bestAsk: Math.min(1, mid + half),
      volume24hr: market.volume24hr || 0,
      endDate: new Date(realNow + remainingMs).toISOString(),
    };
  }

  function openPosition(mid, t) {
    const fillAsk = Math.min(1, mid + half);     // BUY crosses to the ask
    if (!(fillAsk > 0) || fillAsk >= 1) return;
    const shares = stake / fillAsk;
    // half-spread cost vs the mid, on the way in
    costsPaid += shares * (fillAsk - mid);
    position = { avgPrice: fillAsk, shares, cost: stake, entryMid: mid, entryT: t };
  }

  // Close at a spread-adjusted SELL (strategy-driven exit).
  function closeAtMarket(mid, t, reason) {
    const fillBid = Math.max(0, mid - half);     // SELL crosses to the bid
    const proceeds = position.shares * fillBid;
    const grossProceeds = position.shares * mid; // what mid-to-mid would have given
    costsPaid += position.shares * (mid - fillBid);
    settle(proceeds, grossProceeds, reason, t, fillBid);
  }

  // Close at resolution: YES pays $1 if won else $0 (at par, no spread).
  function closeAtSettlement(t) {
    const payoff = market.yesWon ? 1 : 0;
    const proceeds = position.shares * payoff;
    settle(proceeds, proceeds, 'settled@' + (market.yesWon ? '$1' : '$0'), t, payoff);
  }

  function settle(proceeds, grossProceeds, reason, t, price) {
    const net = proceeds - position.cost;
    const gross = grossProceeds - position.entryMid * position.shares; // mid-cost basis
    netPnl += net;
    grossPnl += gross;
    trades += 1;
    if (net >= 0) wins += 1; else losses += 1;
    log.push({
      q: market.question, reason, entry: round4(position.avgPrice), exit: round4(price),
      shares: round2(position.shares), netPnl: round2(net),
    });
    position = null;
  }

  const lookback = opts.lookback != null ? opts.lookback : (cfg.momentumLookback || 4);

  for (let i = 0; i < n; i++) {
    const bar = path[i];
    visibleMids.push(bar.p);
    const snap = snapshot(bar);
    // history = mids visible strictly up to and INCLUDING this bar (no future)
    const history = visibleMids.slice();

    const d = decide(snap, history, position, cfg);

    if (position) {
      if (d.action === 'exit') closeAtMarket(bar.p, bar.t, d.reason);
    } else if (d.action === 'enter') {
      // mirror server.js gate: need a warmed-up history before entering
      if (history.length >= lookback) openPosition(bar.p, bar.t);
    }
  }

  // Still open at the end -> settle at resolution (this is the realistic
  // outcome for a longshot the strategy never got to exit).
  if (position) closeAtSettlement(path[n - 1].t);

  return {
    id: market.id, question: market.question, asset: market.asset,
    yesWon: market.yesWon, points: n,
    trades, wins, losses, grossPnl, costsPaid, netPnl, log,
  };
}

/* Backtest a whole dataset at one spread assumption. Aggregates. */
function backtestAll(dataset, cfg = DEFAULTS, opts = {}) {
  const per = [];
  let trades = 0, wins = 0, losses = 0, grossPnl = 0, costsPaid = 0, netPnl = 0;
  let marketsTraded = 0;
  for (const m of dataset) {
    const r = backtestMarket(m, cfg, opts);
    per.push(r);
    trades += r.trades; wins += r.wins; losses += r.losses;
    grossPnl += r.grossPnl; costsPaid += r.costsPaid; netPnl += r.netPnl;
    if (r.trades > 0) marketsTraded += 1;
  }
  const winRate = trades ? wins / trades : 0;
  const expectancy = trades ? netPnl / trades : 0;
  const stake = opts.stake != null ? opts.stake : 100;
  return {
    markets: dataset.length, marketsTraded,
    trades, wins, losses, winRate,
    grossPnl, costsPaid, netPnl, expectancy,
    stake, spread: opts.spread != null ? opts.spread : 0.01,
    roiPerTradePct: trades ? (expectancy / stake) * 100 : 0,
    per,
  };
}

function round2(x) { return Math.round(x * 100) / 100; }
function round4(x) { return Math.round(x * 10000) / 10000; }

module.exports = { backtestMarket, backtestAll };
