'use strict';
const ob = require('../lib/orderbook');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function field(free, evId, label) {
  const legs = free.filter((m) => (m.events || []).some((e) => String(e.id) === evId));
  console.log(`\n=== ${label} (ev ${evId}) negRisk field — ${legs.length} legs ===`);
  let sumYesAsk = 0, sumYesBid = 0, sumNoAskTop = 0, K = 0, missing = 0;
  for (const m of legs) {
    const tok = JSON.parse(m.clobTokenIds); const out = JSON.parse(m.outcomes);
    let yi = out.map((s) => String(s).toLowerCase()).indexOf('yes'); if (yi < 0) yi = 0; const ni = 1 - yi;
    const yb = await ob.getBook(tok[yi]); const nb = await ob.getBook(tok[ni]);
    K++;
    if (yb.bestAsk != null) sumYesAsk += yb.bestAsk;
    if (yb.bestBid != null) sumYesBid += yb.bestBid;
    if (nb.bestAsk != null) sumNoAskTop += nb.bestAsk; else missing++;
    await sleep(60);
  }
  console.log(`K=${K} sumYESask=${sumYesAsk.toFixed(3)} (overround ${(sumYesAsk - 1).toFixed(3)}) sumYESbid=${sumYesBid.toFixed(3)}`);
  console.log(`all-NO top cost=${sumNoAskTop.toFixed(3)} vs (K-1)=${K - 1} => edge ${((K - 1) - sumNoAskTop).toFixed(3)} (missing NO books: ${missing})`);
}
(async () => {
  let all = [];
  for (let off = 0; off < 2000; off += 100) {
    let page; try { page = await ob.getJSON(`${ob.GAMMA}/markets?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`); } catch (e) { break; }
    if (!Array.isArray(page) || !page.length) break; all.push(...page); if (page.length < 100) break; await sleep(110);
  }
  const free = all.filter((m) => m.feesEnabled === false && m.enableOrderBook && m.acceptingOrders);
  await field(free, '81557', 'Next PM of Israel');
  await field(free, '149565', 'Russia Parliamentary Election Winner');
  await field(free, '237598', 'Iran leader end of 2026');
  await field(free, '424982', 'Next leader out of power before 2027');
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
