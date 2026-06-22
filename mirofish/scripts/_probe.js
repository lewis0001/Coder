'use strict';
const ob = require('../lib/orderbook');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let all = [];
  for (let off = 0; off < 2000; off += 100) {
    let page;
    try { page = await ob.getJSON(`${ob.GAMMA}/markets?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`); } catch (e) { break; }
    if (!Array.isArray(page) || !page.length) break;
    all.push(...page); if (page.length < 100) break; await sleep(110);
  }
  const free = all.filter((m) => m.feesEnabled === false && m.enableOrderBook && m.acceptingOrders);
  const hormuz = free.filter((m) => /hormuz/i.test(m.question || '') && /returns to normal/i.test(m.question || ''));
  console.log('=== Hormuz chain raw ===');
  for (const m of hormuz) {
    console.log(JSON.stringify({ q: m.question, endDate: m.endDate, vol24: Math.round(m.volume24hr || 0), bestAsk: m.bestAsk, bestBid: m.bestBid }));
  }
  console.log('\n=== Ethiopia PM negRisk field - all-NO basket ===');
  const eth = free.filter((m) => (m.events || []).some((e) => String(e.id) === '411239'));
  console.log('legs:', eth.length);
  let sumYesAsk = 0, sumNoAsk = 0, sumYesBid = 0, K = 0;
  for (const m of eth) {
    const tok = JSON.parse(m.clobTokenIds); const out = JSON.parse(m.outcomes);
    let yi = out.map((s) => String(s).toLowerCase()).indexOf('yes'); if (yi < 0) yi = 0; const ni = 1 - yi;
    const yb = await ob.getBook(tok[yi]); const nb = await ob.getBook(tok[ni]);
    K++;
    if (yb.bestAsk != null) sumYesAsk += yb.bestAsk;
    if (nb.bestAsk != null) sumNoAsk += nb.bestAsk;
    if (yb.bestBid != null) sumYesBid += yb.bestBid;
    console.log((m.groupItemTitle || m.question || '').slice(0, 30).padEnd(31), 'YESask=' + (yb.bestAsk != null ? (yb.bestAsk * 100).toFixed(1) : '--').padStart(5), 'NOask=' + (nb.bestAsk != null ? (nb.bestAsk * 100).toFixed(1) : '--').padStart(5));
    await sleep(70);
  }
  console.log('\nK=' + K + ' sumYESask=' + sumYesAsk.toFixed(3) + ' (overround vs 1: ' + (sumYesAsk - 1).toFixed(3) + ')');
  console.log('all-NO top-of-book cost=' + sumNoAsk.toFixed(3) + '  vs (K-1)=' + (K - 1) + '  => edge ' + ((K - 1) - sumNoAsk).toFixed(3) + ' (>0 = arb)');
  console.log('sumYESbid=' + sumYesBid.toFixed(3));
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
