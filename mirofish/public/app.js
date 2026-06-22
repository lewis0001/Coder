'use strict';
/* MIROFISH dashboard — renders REAL state streamed from the trading engine. */
const $ = (id) => document.getElementById(id);
const fmtUsd = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
const cents = (p) => (p * 100).toFixed(1) + '¢';
const COL = { ink: '#1c1c1c', green: '#1f9d57', red: '#d63a3a', gray: '#b9b9b1', line: '#e3e3dd', redFill: 'rgba(214,58,58,0.16)' };

let state = null;

/* ---------- clock ---------- */
setInterval(() => {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  $('clock').textContent = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}, 1000);

/* ---------- SSE connection ---------- */
function connect() {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => { try { state = JSON.parse(e.data); render(); } catch {} };
  es.onerror = () => { $('ftrStatus').textContent = 'RECONNECTING…'; };
}
connect();

/* ---------- controls ---------- */
async function ctl(action) {
  await fetch('/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
}
$('btnRun').onclick = () => ctl(state && state.running ? 'pause' : 'resume');
$('btnFlat').onclick = () => { if (confirm('Flatten all open positions at live bid?')) ctl('flatten'); };

/* ---------- signed helper ---------- */
function signed(el, n, money = true) {
  el.textContent = (n >= 0 ? '+' : '') + (money ? fmtUsd(n) : n.toFixed(2));
  el.classList.toggle('pos', n >= 0); el.classList.toggle('neg', n < 0);
}

/* ============================================================ render */
function render() {
  if (!state) return;
  const s = state;

  // mode + run state
  const pill = $('modePill');
  pill.className = 'pill ' + (s.mode === 'live' ? 'mode-live' : 'mode-paper');
  $('modeTxt').textContent = (s.mode === 'live' ? 'LIVE · MAINNET' : 'PAPER · MAINNET DATA') + (s.running ? '' : ' · PAUSED');
  $('venueTag').textContent = 'POLYMARKET · ' + s.mode.toUpperCase();
  $('btnRun').textContent = s.running ? 'PAUSE' : 'RESUME';
  $('round').textContent = '#' + s.round;
  $('pollMs').textContent = s.lastPollMs + 'ms';

  // headline PnL
  $('pnl').textContent = fmtUsd(s.totalPnl);
  const badge = $('winBadge');
  if (s.totalPnl > 0) { badge.textContent = '+' + fmtUsd(s.totalPnl) + ' ▲'; badge.classList.remove('loss'); }
  else if (s.totalPnl < 0) { badge.textContent = fmtUsd(s.totalPnl) + ' ▼'; badge.classList.add('loss'); }
  else { badge.textContent = 'FLAT'; badge.classList.remove('loss'); }
  $('equity').textContent = fmtUsd(s.equity);
  $('cash').textContent = fmtUsd(s.cash);
  $('trades').textContent = fmtNum(s.tradeCount);
  $('wr').textContent = (s.winRate * 100).toFixed(0) + '%';
  $('sharpe').textContent = s.sharpe.toFixed(2);
  signed($('realized'), s.realized);
  signed($('unreal'), s.unrealized);
  $('openCount').textContent = s.openCount;
  $('haltFlag').innerHTML = s.halted ? '<b class="red">⚠ HALTED (daily loss limit)</b>' : '';

  // top wins
  const wins = s.closed.filter(t => t.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  $('twPage').textContent = wins.length;
  $('topWins').innerHTML = wins.length ? wins.map(w =>
    `<div class="tw-row"><span class="amt green">+${fmtUsd(w.pnl)}</span><span class="meta">${esc(w.q)}</span></div>`
  ).join('') : '<div class="tw-empty">no closed wins yet — engine is hunting the tail…</div>';

  // signal board
  $('mktCount').textContent = s.markets.length;
  $('boardBody').innerHTML = s.markets.map(m => {
    const sg = m.signal;
    return `<tr>
      <td><span class="asset ${m.asset}">${m.asset}</span></td>
      <td class="l q-cell">${m.held ? '<span class="held-dot">●</span> ' : ''}${esc(m.question)}</td>
      <td>${cents(m.mid)}</td>
      <td>${cents(m.bid)}/${cents(m.ask)}</td>
      <td class="${m.mom >= 0 ? 'mom-pos' : 'mom-neg'}">${m.mom >= 0 ? '+' : ''}${(m.mom * 100).toFixed(2)}</td>
      <td>${fmtUsd(m.vol)}</td>
      <td><span class="sig ${sg.action}">${sg.action.toUpperCase()}</span></td>
      <td>${(sg.confidence * 100).toFixed(0)}%</td>
    </tr>`;
  }).join('');

  // lattice stats
  const closed = s.closed;
  $('latTrades').textContent = s.wins + s.losses;
  $('closedN').textContent = s.wins + s.losses;
  $('winsN').textContent = s.wins;
  $('lossN').textContent = s.losses;
  $('wr2').textContent = (s.winRate * 100).toFixed(0) + '%';
  signed($('realised2'), s.realized);
  const best = Math.max(0, ...closed.map(t => t.pnl || 0));
  $('bestTrade').textContent = '+' + fmtUsd(best);

  // ridge stats
  const inBand = s.markets.filter(m => m.mid >= 0.02 && m.mid <= 0.30);
  $('rMkts').textContent = s.markets.length;
  $('rInBand').textContent = inBand.length;
  const cheap = s.markets.slice().sort((a, b) => a.mid - b.mid)[0];
  $('rCheap').textContent = cheap ? cents(cheap.mid) : '—';
  $('rOpen').textContent = s.openCount;
  signed($('rReal'), s.realized);

  // network stats
  $('nNodes').textContent = s.markets.length;
  const buySig = s.markets.filter(m => m.signal.action === 'enter').length;
  $('nSignal').textContent = (s.markets.length ? (buySig / s.markets.length * 100) : 0).toFixed(0) + '%';
  $('buySig').textContent = buySig;
  $('heldSig').textContent = s.openCount;
  $('predicted').textContent = buySig > 0 ? '▲ ' + buySig + ' TAILS' : '— SCANNING';

  // positions list
  $('posList').innerHTML = s.positions.length ? s.positions.map(p =>
    `<div class="pos-row"><span class="q">${esc(p.question)}</span>
      <div class="nums"><span>${cents(p.avgPrice)}→${cents(p.mid)}</span>
      <span class="${p.upnl >= 0 ? 'green' : 'red'}">${p.upnl >= 0 ? '+' : ''}${fmtUsd(p.upnl)} (${(p.retPct * 100).toFixed(0)}%)</span></div></div>`
  ).join('') : '<div class="tw-empty">flat — no open positions</div>';

  // exec log
  $('logBody').innerHTML = s.trades.map(t => `<tr>
    <td>${new Date(t.t).toLocaleTimeString('en-GB')}</td>
    <td class="${t.kind === 'BUY' ? 'mom-pos' : 'red'}">${t.kind}</td>
    <td><span class="asset ${t.asset}">${t.asset}</span></td>
    <td class="l q-cell">${esc(t.q)}</td>
    <td>${cents(t.price)}</td>
    <td>${fmtUsd(t.usd)}</td>
    <td class="${t.pnl == null ? '' : t.pnl >= 0 ? 'green' : 'red'}">${t.pnl == null ? '—' : (t.pnl >= 0 ? '+' : '') + fmtUsd(t.pnl)}</td>
    <td class="l">${t.reason || ''}</td></tr>`).join('');

  // footer
  $('fills').textContent = fmtNum(s.tradeCount);
  $('ftrStatus').textContent = s.running ? 'ENGINE ONLINE' : 'ENGINE PAUSED';
  $('ftrDot').style.background = s.running ? COL.green : COL.gray;
  $('ftrErr').textContent = s.lastError ? '⚠ ' + s.lastError : '';

  drawLattice(closed, s);
  drawRidge(s.markets);
  drawNetwork(s.markets);
}

function esc(x) { return String(x).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

/* ---------- canvas setup ---------- */
function ctxOf(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: r.width, H: r.height };
}

/* ---------- LATTICE: real closed-trade returns binned ---------- */
function drawLattice(closed, s) {
  const { ctx, W, H } = ctxOf($('galton'));
  ctx.clearRect(0, 0, W, H);
  const BINS = 13, cx = W / 2, spread = Math.min(W * 0.82, 560);
  const top = 22, histBottom = H - 26, histTop = top + 14;
  // bin closed trades by return %
  const bins = new Array(BINS).fill(0);
  for (const t of closed) {
    // return relative to cost
    const r = t.usd && t.pnl != null ? t.pnl / Math.max(1, t.usd - t.pnl) : 0;
    const clamped = Math.max(-1, Math.min(2, r));
    const idx = Math.round(((clamped + 1) / 3) * (BINS - 1));
    bins[Math.max(0, Math.min(BINS - 1, idx))]++;
  }
  const maxBin = Math.max(3, ...bins);
  // labels
  ctx.font = '10px "Share Tech Mono",monospace';
  ctx.fillStyle = COL.gray; ctx.textAlign = 'left'; ctx.fillText('LOSS', 14, 15);
  ctx.fillStyle = COL.green; ctx.textAlign = 'right'; ctx.fillText('PROFIT', W - 14, 15);
  // breakeven
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#9a9a92';
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, histBottom); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#666'; ctx.textAlign = 'center'; ctx.fillText('BREAKEVEN', cx, top - 4);
  // bars
  const bw = spread / BINS;
  for (let i = 0; i < BINS; i++) {
    const x = cx - spread / 2 + i * bw;
    const h = (bins[i] / maxBin) * (histBottom - histTop);
    const profit = i > (BINS - 1) / 2;
    ctx.fillStyle = profit ? COL.green : (i === (BINS - 1) / 2 ? '#cfcfc8' : '#b9645f');
    ctx.globalAlpha = profit ? 0.85 : 0.6;
    ctx.fillRect(x + 1, histBottom - h, bw - 2, h);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = COL.line; ctx.beginPath(); ctx.moveTo(20, histBottom); ctx.lineTo(W - 20, histBottom); ctx.stroke();
  if (!closed.length) { ctx.fillStyle = COL.gray; ctx.textAlign = 'center'; ctx.fillText('awaiting first closed trade…', cx, H / 2); }
}

/* ---------- RIDGE: live YES-price density across markets ---------- */
let ridgePhase = 0;
function drawRidge(markets) {
  const { ctx, W, H } = ctxOf($('ridge'));
  ctx.clearRect(0, 0, W, H);
  if (!markets.length) return;
  ridgePhase += 0.02;
  const N = Math.min(18, Math.max(6, markets.length));
  const left = 24, right = W - 24, top = 24, bottom = H - 22;
  const rowH = (bottom - top) / N, overlap = rowH * 3.0;
  const sorted = markets.slice().sort((a, b) => a.mid - b.mid);
  for (let r = N - 1; r >= 0; r--) {
    const m = sorted[r % sorted.length];
    const mu = Math.max(0.04, Math.min(0.92, m.mid)) + Math.sin(ridgePhase + r) * 0.008;
    const sigma = 0.05 + 0.03 * (r / N);
    const amp = overlap * (0.5 + 0.5 * (1 - r / N));
    const baseY = top + r * rowH + rowH;
    const pts = []; let peak = 0;
    for (let i = 0; i <= 100; i++) {
      const x = i / 100, z = (x - mu) / sigma;
      let d = Math.exp(-0.5 * z * z); if (x > mu) d += 0.6 * Math.exp(-0.5 * z * z / 6);
      peak = Math.max(peak, d); pts.push(d);
    }
    ctx.beginPath(); ctx.moveTo(left, baseY);
    for (let i = 0; i <= 100; i++) ctx.lineTo(left + (i / 100) * (right - left), baseY - (pts[i] / peak) * amp);
    ctx.lineTo(right, baseY); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    for (let i = 0; i < 100; i++) {
      const x = i / 100;
      ctx.strokeStyle = x > 0.55 ? COL.red : '#bdbdb5'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left + x * (right - left), baseY - (pts[i] / peak) * amp);
      ctx.lineTo(left + ((i + 1) / 100) * (right - left), baseY - (pts[i + 1] / peak) * amp);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- NETWORK: markets as nodes, assets as hubs ---------- */
let netNodes = [], netHubs = {}, netInit = '';
function drawNetwork(markets) {
  const { ctx, W, H } = ctxOf($('network'));
  // rebuild graph if the market set changed
  const key = markets.map(m => m.id).join(',');
  if (key !== netInit) buildNet(markets, W, H), netInit = key;
  ctx.clearRect(0, 0, W, H);

  // physics
  for (const n of netNodes) {
    const hub = netHubs[n.asset];
    if (hub && !n.isHub) {
      // spring to its asset hub
      n.vx += (hub.x - n.x) * 0.012; n.vy += (hub.y - n.y) * 0.012;
    }
    if (n.isHub) { n.vx += (n.ax - n.x) * 0.04; n.vy += (n.ay - n.y) * 0.04; }
  }
  for (let i = 0; i < netNodes.length; i++) for (let j = i + 1; j < netNodes.length; j++) {
    const a = netNodes[i], b = netNodes[j];
    let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01;
    if (d2 > 8000) continue;
    const f = 160 / d2, d = Math.sqrt(d2); dx /= d; dy /= d;
    a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
  }
  for (const n of netNodes) {
    n.vx *= 0.85; n.vy *= 0.85; n.x += n.vx; n.y += n.vy;
    n.x = Math.max(n.r + 6, Math.min(W - n.r - 6, n.x));
    n.y = Math.max(n.r + 16, Math.min(H - n.r - 6, n.y));
  }
  // sync color to live signal
  const byId = {}; markets.forEach(m => byId[m.id] = m);
  // links satellite->hub
  for (const n of netNodes) {
    if (n.isHub) continue;
    const hub = netHubs[n.asset]; if (!hub) continue;
    ctx.strokeStyle = 'rgba(150,150,140,0.35)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(hub.x, hub.y); ctx.stroke();
  }
  // nodes
  for (const n of netNodes) {
    let color = COL.gray;
    if (n.isHub) color = COL.ink;
    else { const m = byId[n.id]; if (m) color = m.signal.action === 'enter' ? COL.green : m.signal.action === 'exit' ? COL.red : (m.held ? COL.green : COL.gray); }
    ctx.beginPath(); ctx.fillStyle = color; ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill();
  }
  // hub labels
  ctx.font = '9px "Share Tech Mono",monospace'; ctx.textAlign = 'center';
  for (const k in netHubs) {
    const h = netHubs[k]; const label = k + '_CLUSTER';
    const w = ctx.measureText(label).width + 12, ly = h.y + h.r + 13;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d0d0c8'; ctx.lineWidth = 1;
    rr(ctx, h.x - w / 2, ly - 10, w, 14, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.ink; ctx.fillText(label, h.x, ly);
  }
}
function buildNet(markets, W, H) {
  netNodes = []; netHubs = {};
  const assets = [...new Set(markets.map(m => m.asset))];
  assets.forEach((a, i) => {
    const x = W * (0.18 + 0.64 * (i / Math.max(1, assets.length - 1 || 1)));
    const y = H * (0.4 + 0.18 * Math.sin(i * 1.7));
    const hub = { asset: a, isHub: true, x, y, ax: x, ay: y, vx: 0, vy: 0, r: 14 };
    netHubs[a] = hub; netNodes.push(hub);
  });
  for (const m of markets) {
    const hub = netHubs[m.asset];
    netNodes.push({ id: m.id, asset: m.asset, isHub: false, r: 3 + Math.min(5, (m.vol || 0) / 5e5),
      x: hub.x + (Math.random() - 0.5) * 80, y: hub.y + (Math.random() - 0.5) * 80, vx: 0, vy: 0 });
  }
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/* keep canvases animating between SSE ticks */
function raf() { if (state) { drawRidge(state.markets); drawNetwork(state.markets); } requestAnimationFrame(raf); }
requestAnimationFrame(raf);
