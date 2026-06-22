'use strict';
/* Deterministic checks for the trade machinery (no network needed).
   Proves: signal fires on rising momentum, and paper accounting is correct. */
const assert = require('assert');
const { decide, DEFAULTS } = require('./lib/strategy');
const { Engine } = require('./lib/engine');

let pass = 0;
const ok = (name, fn) => { fn(); console.log('  ✓', name); pass++; };

// 1) momentum signal fires on a rising cheap market
ok('signal: rising tail -> enter', () => {
  const market = { id: 'm1', question: 'Bitcoin Up or Down', asset: 'BTC',
    mid: 0.12, bestBid: 0.115, bestAsk: 0.125, volume24hr: 0, endDate: new Date(Date.now() + 36e5).toISOString() };
  const history = [0.09, 0.10, 0.11, 0.12]; // clearly rising
  const d = decide(market, history, null, DEFAULTS);
  assert.strictEqual(d.action, 'enter', 'expected enter, got ' + JSON.stringify(d));
  assert(d.confidence > 0.4);
});

// 2) flat/falling market -> no entry
ok('signal: no momentum -> hold', () => {
  const market = { id: 'm2', question: 'ETH Up or Down', asset: 'ETH',
    mid: 0.40, bestBid: 0.395, bestAsk: 0.405, volume24hr: 0, endDate: new Date(Date.now() + 36e5).toISOString() };
  const d = decide(market, [0.41, 0.41, 0.40, 0.40], null, DEFAULTS);
  assert.strictEqual(d.action, 'hold');
});

// 3) paper accounting: BUY then SELL higher = profit, cash conserved
ok('engine: buy/sell PnL + cash accounting', () => {
  process.env.BANKROLL = '10000';
  const e = new Engine();
  e.state = e.load(); // fresh
  e.state.cash = 10000; e.state.positions = {}; e.state.trades = []; e.state.realized = 0; e.state.wins = 0; e.state.losses = 0;
  const market = { id: 'mx', question: 'BTC Up or Down', asset: 'BTC', tokenYes: 't', endDate: null };
  const pos = e.enter(market, 0.10, 0.8);          // buy at 10¢
  assert(pos, 'entry should succeed');
  const spent = 10000 - e.state.cash;
  assert(spent > 0 && spent <= 750, 'budget within cap: ' + spent);
  const shares = pos.shares;
  const feeRate = require('./lib/engine').RISK.feeRate;
  assert(feeRate > 0 && Math.abs(pos.cost - (shares * 0.10)) > 1e-9, 'entry should include a taker fee in cost');
  const pnl = e.exit('mx', 0.16, 'take-profit');   // sell at 16¢
  const exitFee = feeRate * Math.min(0.16, 0.84) * shares;
  const expected = shares * 0.16 - exitFee - spent; // spent already includes the entry fee
  assert(Math.abs(pnl - expected) < 1e-6, `pnl ${pnl} vs ${expected}`);
  assert(pnl > 0 && e.state.wins === 1, 'should record a win (net of fees)');
  assert(Math.abs(e.state.cash - (10000 + pnl)) < 1e-6, 'cash should reflect realized pnl');
});

// 4) risk: max open positions enforced
ok('engine: max open positions cap', () => {
  const e = new Engine();
  e.state.cash = 100000; e.state.positions = {}; e.state.trades = [];
  let entered = 0;
  for (let i = 0; i < 40; i++) {
    const m = { id: 'k' + i, question: 'q', asset: 'BTC', tokenYes: 't', endDate: null };
    if (e.enter(m, 0.2, 0.7)) entered++;
  }
  assert.strictEqual(entered, require('./lib/engine').RISK.maxOpenPositions);
});

console.log(`\n${pass} checks passed.\n`);
