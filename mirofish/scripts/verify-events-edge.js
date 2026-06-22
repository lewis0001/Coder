'use strict';
/* Independent verification of the events overround edge winning config.
   Re-derives entry/settlement from scratch and dumps REAL sample trades. */
const { loadEventsDataset } = require('../lib/events-data');
const { splitByTime, tradeMetrics } = require('../lib/validate');

const DAY = 86400, HOUR = 3600;

function priceAt(path, t) {
  if (!path.length || t < path[0].t) return null;
  let lo = 0, hi = path.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (path[m].t <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
  if (ans < 0) return null;
  const p = path[ans].p;
  return (isFinite(p) && p > 0 && p < 1) ? { p, idx: ans, age: t - path[ans].t, hasFuture: ans < path.length - 1, lastT: path[path.length - 1].t } : null;
}
function resolveT(ev) {
  if (ev.endMs) return Math.floor(ev.endMs / 1000);
  let mx = 0; for (const l of ev.legs) if (l.path.length) mx = Math.max(mx, l.path[l.path.length - 1].t);
  return mx || null;
}
function firstAllLiveT(ev, minLive) {
  const firsts = ev.legs.filter((l) => l.path.length).map((l) => l.path[0].t).sort((a, b) => a - b);
  for (const t of firsts) { let live = 0; for (const l of ev.legs) if (priceAt(l.path, t)) live++; if (live >= minLive) return t; }
  return null;
}
// winning config: BASKET, 1d-pre, overround>0.05, band [0.10,0.50], spread 0.02
const CFG = { timing: '1d', minOverround: 0.05, bandLo: 0.10, bandHi: 0.50, spread: 0.02, minLive: 3 };

function tradesFor(ev) {
  const first = firstAllLiveT(ev, CFG.minLive); if (first == null) return null;
  const res = resolveT(ev); if (res == null) return null;
  const t = res - DAY; if (t < first || t >= res - HOUR) return null;
  const live = []; let sum = 0;
  for (const leg of ev.legs) { const q = priceAt(leg.path, t); if (!q) continue; live.push({ leg, yes: q.p, age: q.age, hasFuture: q.hasFuture, lastT: q.lastT }); sum += q.p; }
  if (live.length < CFG.minLive) return null;
  const overround = sum - 1;
  if (overround <= CFG.minOverround) return null;
  const half = CFG.spread / 2;
  const shorted = [];
  for (const o of live) { if (o.yes < CFG.bandLo || o.yes > CFG.bandHi) continue; const cost = (1 - o.yes) + half; shorted.push({ ...o, pnl: (o.leg.yesWon ? 0 : 1) - cost }); }
  return { entryT: t, res, overround, nLive: live.length, shorted };
}

const ds = loadEventsDataset({ minLegsWithData: 3, minPoints: 5 });
const split = splitByTime(ds, { trainFrac: 0.5, valFrac: 0.25 });

const MAXAGE_H = Number(process.argv[2] || Infinity); // freshness filter (hours)

function freshTrades(ev) {
  const r = tradesFor(ev);
  if (!r) return null;
  const kept = r.shorted.filter((s) => (s.age / 3600) <= MAXAGE_H && s.hasFuture);
  return kept.length ? { ...r, shorted: kept } : null;
}

function agg(events) {
  const pnls = []; const evts = new Set(); const dates = new Set();
  for (const ev of events) {
    const r = freshTrades(ev); if (!r) continue;
    evts.add(ev.id); dates.add(new Date(r.entryT * 1000).toISOString().slice(0, 10));
    for (const s of r.shorted) pnls.push(s.pnl);
  }
  return { st: tradeMetrics(pnls, { bootIters: 3000 }), nEvents: evts.size, nDates: dates.size };
}
console.log(`Freshness filter: quote age <= ${MAXAGE_H}h AND market still trading after entry\n`);
for (const [name, evs] of [['TRAIN', split.train], ['VALIDATION', split.validation], ['HOLDOUT/TEST', split.test]]) {
  const a = agg(evs); const s = a.st;
  console.log(`${name.padEnd(13)} trades=${s.n}  exp=${(s.expectancy||0).toFixed(3)}  win=${((s.winRate||0)*100).toFixed(1)}%  CI=[${(s.bootLo||0).toFixed(3)},${(s.bootHi||0).toFixed(3)}]  distinctEvents=${a.nEvents} distinctDates=${a.nDates}`);
}


console.log('\n--- sample HOLDOUT trades (real events) ---');
let shown = 0;
for (const ev of split.test) {
  const r = tradesFor(ev); if (!r || !r.shorted.length) continue;
  const won = r.shorted.filter((s) => s.leg.yesWon).length;
  console.log(`\n[${ev.category}] ${ev.question || ev.title || ev.id} | legs=${ev.nLegs} overround=${r.overround.toFixed(2)} entry=${new Date(r.entryT*1000).toISOString().slice(0,10)}`);
  for (const s of r.shorted.slice(0, 6)) {
    console.log(`   short NO @ YES=${(s.yes*100).toFixed(0)}c  won=${s.leg.yesWon}  pnl=${s.pnl>=0?'+':''}${s.pnl.toFixed(2)}  ageH=${(s.age/3600).toFixed(0)} future=${s.hasFuture}  | ${(s.leg.title||'').slice(0,40)}`);
  }
  console.log(`   => shorted ${r.shorted.length} legs, ${won} of them WON (should be ~1 in a 1-of-N field)`);
  if (++shown >= 10) break;
}
