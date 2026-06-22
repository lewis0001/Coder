'use strict';
/* ============================================================
   MIROFISH trader — server + live trading loop.
   Run:  node server.js     (paper mode, http://localhost:8088)
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const pm = require('./lib/polymarket');
const { decide, slope, hoursUntil, DEFAULTS } = require('./lib/strategy');
const { Engine, RISK } = require('./lib/engine');

const PORT = Number(process.env.PORT || 8088);
const POLL_MS = Number(process.env.POLL_MS || 6000);
const TRACK = Number(process.env.TRACK || 14);   // markets to follow

const engine = new Engine();
const histories = new Map();   // marketId -> [mid,...]
const cooldown = new Map();     // marketId -> round of last exit
const COOLDOWN_ROUNDS = 8;      // don't immediately re-enter a market we just exited
let markets = [];              // latest tracked snapshot
let lastQuotes = {};           // marketId -> {bid,ask,mid}
let signals = {};              // marketId -> decision
let round = 0;
let running = !(process.env.START_PAUSED === '1');
let lastError = null;
let lastPollMs = 0;
const sseClients = new Set();

/* ---------- one trading cycle ---------- */
async function cycle() {
  const t0 = Date.now();
  try {
    // 1) refresh tracked universe (every ~6 rounds) and live quotes (every round)
    if (round % 6 === 0 || markets.length === 0) {
      const all = await pm.fetchMarkets({ limit: 200 });
      // keep genuinely live markets with a two-sided book; prefer crypto,
      // then markets with some runway left, then liquidity/volume.
      markets = all
        .filter((m) => m.mid > 0.02 && m.mid < 0.98 && m.bestBid > 0 && m.bestAsk < 1)
        .filter((m) => hoursUntil(m.endDate) > 0.12)   // >~7 min of runway
        .sort((a, b) => (b.isCrypto - a.isCrypto) || (b.liquidity - a.liquidity) || (b.volume24hr - a.volume24hr))
        .slice(0, TRACK);
    }

    // 2) pull live CLOB quotes for tracked tokens (real bid/ask)
    const quotes = await Promise.all(markets.map(async (m) => {
      try { return [m.id, await pm.fetchQuote(m.tokenYes)]; }
      catch { return [m.id, null]; }
    }));
    const bidById = {};
    for (const [id, q] of quotes) {
      const m = markets.find((x) => x.id === id);
      if (!m) continue;
      if (q && q.mid > 0) { m.bestBid = q.bid ?? m.bestBid; m.bestAsk = q.ask ?? m.bestAsk; m.mid = q.mid; }
      lastQuotes[id] = { bid: m.bestBid, ask: m.bestAsk, mid: m.mid };
      bidById[id] = m.bestBid;   // mark positions at the realisable (bid) price
      const h = histories.get(id) || [];
      h.push(m.mid); if (h.length > 40) h.shift();
      histories.set(id, h);
    }

    // 3) risk gate — daily-loss kill-switch; halt blocks new entries
    engine.riskState(bidById);

    // 4) decide + execute (signal-based auto)
    signals = {};
    for (const m of markets) {
      const hist = histories.get(m.id) || [];
      const pos = engine.state.positions[m.id];
      const d = decide(m, hist, pos, DEFAULTS);
      signals[m.id] = d;
      if (!running) continue;
      const onCooldown = cooldown.has(m.id) && (round - cooldown.get(m.id)) < COOLDOWN_ROUNDS;
      if (d.action === 'enter' && hist.length >= DEFAULTS.momentumLookback && !onCooldown) {
        engine.enter(m, m.bestAsk, d.confidence);
      } else if (d.action === 'exit' && pos) {
        engine.exit(m.id, m.bestBid, d.reason);
        cooldown.set(m.id, round);
      }
    }
    engine.save();
    lastError = null;
  } catch (e) {
    lastError = e.message;
  }
  lastPollMs = Date.now() - t0;
  round++;
  broadcast();
}

/* ---------- snapshot for the dashboard ---------- */
function snapshot() {
  const bidById = {};
  for (const m of markets) bidById[m.id] = m.bestBid;  // realisable price
  const eq = engine.equity(bidById);
  const unreal = engine.unrealized(bidById);
  const s = engine.state;
  const positions = Object.values(s.positions).map((p) => {
    const bid = bidById[p.marketId] ?? p.avgPrice;
    return { ...p, mid: bid, upnl: p.shares * (bid - p.avgPrice), retPct: (bid - p.avgPrice) / p.avgPrice };
  }).sort((a, b) => b.upnl - a.upnl);

  // closed trades (with pnl) for "top wins" + lattice
  const closed = s.trades.filter((t) => typeof t.pnl === 'number');

  return {
    mode: s.mode, running, round, lastPollMs, lastError, ts: nowISO(),
    bankroll: s.startBankroll,
    equity: eq, cash: s.cash, realized: s.realized, unrealized: unreal,
    totalPnl: eq - s.startBankroll,
    tradeCount: s.tradeCount, openCount: positions.length,
    wins: s.wins, losses: s.losses, winRate: engine.winRate(), sharpe: engine.sharpe(),
    halted: s.halted, dayPnl: eq - s.dayStartEquity,
    markets: markets.map((m) => ({
      id: m.id, question: m.question, asset: m.asset, isCrypto: m.isCrypto,
      mid: m.mid, bid: m.bestBid, ask: m.bestAsk, vol: m.volume24hr, endDate: m.endDate,
      mom: slope(histories.get(m.id) || [], DEFAULTS.momentumLookback),
      signal: signals[m.id] || { action: 'hold', reason: 'warming up', confidence: 0 },
      held: !!s.positions[m.id],
    })),
    positions,
    trades: s.trades.slice(0, 40),
    closed: closed.slice(0, 12),
    risk: RISK,
  };
}

function nowISO() { return new Date().toISOString(); }

/* ---------- SSE broadcast ---------- */
function broadcast() {
  const payload = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of sseClients) { try { res.write(payload); } catch { /* drop */ } }
}

/* ---------- HTTP server ---------- */
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const PUBLIC = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');

  if (u.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(snapshot()));
  }

  if (u.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (u.pathname === '/api/control' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let cmd = {}; try { cmd = JSON.parse(body || '{}'); } catch { /* */ }
      if (cmd.action === 'pause') running = false;
      if (cmd.action === 'resume') { running = true; engine.state.halted = false; }
      if (cmd.action === 'flatten') {
        for (const id of Object.keys(engine.state.positions)) {
          const m = markets.find((x) => x.id === id);
          engine.exit(id, m ? m.bestBid : 0, 'manual flatten');
        }
        engine.save();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, running }));
      broadcast();
    });
    return;
  }

  // static files
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  MIROFISH trader — ${engine.state.mode.toUpperCase()} mode`);
  console.log(`  dashboard:  http://localhost:${PORT}`);
  console.log(`  tracking ${TRACK} markets · poll ${POLL_MS}ms · bankroll $${RISK.startBankroll}\n`);
  cycle();
  setInterval(cycle, POLL_MS);
});
