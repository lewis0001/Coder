'use strict';
/* ============================================================
   scripts/scan-xvenue.js
   ------------------------------------------------------------
   CROSS-VENUE ARBITRAGE scanner: Polymarket <-> Kalshi.

   The edge we hunt: the SAME real-world outcome is listed on both
   venues. If we can assemble two positions that together pay
   EXACTLY $1 at resolution for a combined cost < $1, that locks a
   risk-free profit. For a matched pair where YES==YES==the same
   outcome resolving to 1, the two complementary baskets are:

     A) BUY Polymarket-YES  +  BUY Kalshi-NO     -> always $1
     B) BUY Kalshi-YES      +  BUY Polymarket-NO -> always $1

   We judge each on EXECUTABLE prices only:
     * Polymarket leg: walk the real CLOB book (buyCost = VWAP+slip).
     * Kalshi leg: walk the real order book AND add Kalshi's
       per-contract trading fee (buyCostKalshi).
   Capacity = max clip (contracts) fillable on BOTH legs while the
   per-pair cost stays < $1. Net cents/$1 = (1 - costPerPair)*100.

   Pure Node, zero deps. Polite API use (paced, capped).
   ============================================================ */
const ob = require('../lib/orderbook.js');
const K = require('../lib/kalshi.js');
const M = require('../lib/xvenue-match.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c2 = (x) => (x * 100).toFixed(2);
const usd = (x) => '$' + x.toFixed(2);

/* Largest clip (contracts) for which the combined per-pair cost is < $1,
   given a PM ask book and a Kalshi ask ladder (fee-laden). Profit is
   monotonically non-increasing in size (VWAP only worsens), so we binary
   /linear search the cap. We also cap by available depth on both books. */
function evalBasket(pmBook, kAsks, { minNet = 0.005, maxClip = 5000 } = {}) {
  // available depth ceilings
  const pmDepth = pmBook.asks.reduce((s, l) => s + l.size, 0);
  const kDepth = kAsks.reduce((s, l) => s + l.size, 0);
  const ceil = Math.floor(Math.min(pmDepth, kDepth, maxClip));
  if (ceil < 1) return null;

  // cost-per-pair at a given clip
  function perPair(n) {
    const pm = ob.buyCost(pmBook, n);
    const k = K.buyCostKalshi(kAsks, n);
    if (pm.exhausted || k.exhausted) return null;
    return { cost: (pm.cost + k.cost) / n, pmAvg: pm.avgPrice, kAvg: k.avgPrice, pmCost: pm.cost, kCost: k.cost, kFee: k.fee };
  }
  // best is at n=1 (tightest); require it clears the threshold.
  const one = perPair(1);
  if (!one || one.cost > 1 - minNet) return null;

  // grow clip while still profitable beyond threshold; find max fillable size
  let lo = 1, hi = ceil;
  // ensure hi is fillable; shrink until it fills
  let hiEval = perPair(hi);
  while (!hiEval && hi > 1) { hi = Math.floor(hi / 2); hiEval = perPair(hi); }
  if (hiEval && hiEval.cost <= 1 - minNet) {
    return { size: hi, ...hiEval, netPerPair: 1 - hiEval.cost };
  }
  // binary search the largest size with cost <= 1-minNet
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const e = perPair(mid);
    if (e && e.cost <= 1 - minNet) lo = mid; else hi = mid - 1;
  }
  const fin = perPair(lo);
  if (!fin || fin.cost > 1 - minNet) return null;
  return { size: lo, ...fin, netPerPair: 1 - fin.cost };
}

async function main() {
  const MIN_NET = 0.005;     // require >= 0.5c/$1 net edge after all costs
  const MIN_PM_VOL = 1000;   // skip dead PM markets
  const args = process.argv.slice(2);
  const VERBOSE = args.includes('-v');

  console.log('=== CROSS-VENUE ARB SCANNER  (Polymarket <-> Kalshi) ===');
  console.log('date:', new Date().toISOString(), '\n');

  // 1) pull both venues
  process.stdout.write('Pulling Polymarket live markets... ');
  const pmMarkets = await ob.liveMarkets({ limit: 1200 });
  console.log(pmMarkets.length, 'markets');

  process.stdout.write('Pulling Kalshi open events (nested markets, dropping parlays)... ');
  const kEvents = await K.fetchOpenEvents({ maxPages: 60, pageDelayMs: 120 });
  const kMarkets = K.normalizeMarkets(kEvents);
  console.log(kEvents.length, 'events ->', kMarkets.length, 'single-outcome markets');

  // 2) match
  const matches = M.buildMatches(pmMarkets, kMarkets);
  const byKind = {};
  for (const mt of matches) byKind[mt.kind] = (byKind[mt.kind] || 0) + 1;
  console.log('\nConfident cross-venue matches:', matches.length, JSON.stringify(byKind));

  // confidence split
  const byConf = {};
  for (const mt of matches) byConf[mt.confidence] = (byConf[mt.confidence] || 0) + 1;
  console.log('  by confidence:', JSON.stringify(byConf));

  if (!matches.length) {
    console.log('\nNo confident matches found. Nothing to price.');
    return;
  }

  // 3) price every match on REAL books (both directions), with fees.
  //    Collect price-gap distribution from top-of-book quotes too.
  const gaps = [];     // |pmYesPrice - kalshiYesAsk| style discrepancy at top
  const priced = [];

  // pre-collect PM tokens to fetch, throttle book fetches
  let idx = 0;
  for (const mt of matches) {
    idx++;
    // top-of-book discrepancy (quote-level, for distribution stats)
    const pmYes = mt.pm.yesPrice;
    const kYesAsk = mt.kalshi.yesAsk;
    if (pmYes != null && kYesAsk != null && kYesAsk > 0 && kYesAsk < 1) {
      gaps.push({ kind: mt.kind, label: mt.label, gap: Math.abs(pmYes - kYesAsk), pmYes, kYesAsk });
    }

    // skip illiquid PM
    if ((mt.pm.volume || 0) < MIN_PM_VOL) { mt._skip = 'pm_vol'; continue; }

    // fetch real books: PM YES, PM NO, Kalshi book
    let pmYesBook, pmNoBook, kbook;
    try {
      pmYesBook = await ob.getBook(mt.pm.yesToken);
      pmNoBook = await ob.getBook(mt.pm.noToken);
    } catch (e) { mt._skip = 'pm_book_err'; continue; }
    try {
      kbook = await K.getOrderbook(mt.kalshi.ticker, { depth: 100 });
    } catch (e) { mt._skip = 'k_book_err'; continue; }
    await sleep(80); // polite

    // Basket A: PM-YES + Kalshi-NO
    const A = evalBasket(pmYesBook, kbook.noAsks, { minNet: MIN_NET });
    // Basket B: PM-NO + Kalshi-YES
    const B = evalBasket(pmNoBook, kbook.yesAsks, { minNet: MIN_NET });

    const best = [A && { dir: 'A', ...A }, B && { dir: 'B', ...B }]
      .filter(Boolean)
      .sort((a, b) => b.netPerPair - a.netPerPair)[0] || null;

    // also compute the BEST-CASE 1-contract cost of each basket (for near-miss
    // reporting even when there's no executable edge): how close to $1 we got.
    const oneA = (() => { const p = ob.buyCost(pmYesBook, 1), k = K.buyCostKalshi(kbook.noAsks, 1); return (p.exhausted || k.exhausted) ? null : p.cost + k.cost; })();
    const oneB = (() => { const p = ob.buyCost(pmNoBook, 1), k = K.buyCostKalshi(kbook.yesAsks, 1); return (p.exhausted || k.exhausted) ? null : p.cost + k.cost; })();
    const bestOne = [oneA, oneB].filter((x) => x != null).sort((a, b) => a - b)[0];

    priced.push({ mt, A, B, best, bestOne });
    if (VERBOSE) {
      process.stdout.write(`  [${idx}/${matches.length}] ${mt.kind} ${best ? 'EDGE ' + c2(best.netPerPair) + 'c/$1 x' + best.size : '-'}\n`);
    }
  }

  // 4) distribution of price gaps
  gaps.sort((a, b) => b.gap - a.gap);
  const buckets = { '0-1c': 0, '1-3c': 0, '3-5c': 0, '5-10c': 0, '10c+': 0 };
  for (const g of gaps) {
    const cents = g.gap * 100;
    if (cents < 1) buckets['0-1c']++;
    else if (cents < 3) buckets['1-3c']++;
    else if (cents < 5) buckets['3-5c']++;
    else if (cents < 10) buckets['5-10c']++;
    else buckets['10c+']++;
  }

  // 5) report
  console.log('\n=== TOP-OF-BOOK PRICE DISCREPANCY DISTRIBUTION (|PM yes - Kalshi yes ask|) ===');
  console.log('  n =', gaps.length, '| buckets:', JSON.stringify(buckets));
  console.log('  largest raw gaps (pre-cost):');
  for (const g of gaps.slice(0, 8)) {
    console.log(`    ${c2(g.gap)}c  pmYes=${c2(g.pmYes)} kYesAsk=${c2(g.kYesAsk)}  ${g.label.slice(0, 80)}`);
  }

  const profitable = priced.filter((p) => p.best).sort((a, b) => b.best.netPerPair - a.best.netPerPair);
  console.log('\n=== EXECUTABLE CROSS-VENUE ARBS (real books + Kalshi fees, net > ' + c2(MIN_NET) + 'c/$1) ===');
  console.log('  priced pairs:', priced.length, '| net-positive executable:', profitable.length);

  if (!profitable.length) {
    console.log('\n  >>> NONE. No matched pair clears spread+fees at executable size right now.');
    // near-miss: the matched pairs whose best 1-contract basket came CLOSEST to $1
    const nm = priced.filter((p) => p.bestOne != null).sort((a, b) => a.bestOne - b.bestOne).slice(0, 8);
    if (nm.length) {
      console.log('\n  Closest near-misses (best-basket cost for 1 contract, incl. fees; need < $1.00):');
      for (const p of nm) {
        const shortfall = (p.bestOne - 1) * 100;
        console.log(`    cost ${usd(p.bestOne)}  (${shortfall >= 0 ? '+' : ''}${shortfall.toFixed(2)}c vs breakeven)  ${p.mt.label.slice(0, 72)}`);
      }
    }
  } else {
    for (const p of profitable) {
      const b = p.best;
      const mt = p.mt;
      const legs = b.dir === 'A'
        ? `BUY Polymarket-YES @~${c2(b.pmAvg)}c  +  BUY Kalshi-NO @~${c2(b.kAvg)}c (incl fee)`
        : `BUY Kalshi-YES @~${c2(b.kAvg)}c (incl fee)  +  BUY Polymarket-NO @~${c2(b.pmAvg)}c`;
      console.log('\n  ----------------------------------------------------------------');
      console.log(`  ${mt.kind}  [${mt.confidence}]  ${mt.label}`);
      console.log(`    ${legs}`);
      console.log(`    cost/pair = ${usd(b.cost)}  ->  NET = ${c2(b.netPerPair)}c per $1  (Kalshi fee ~${c2(b.kFee / b.size)}c/contract)`);
      console.log(`    CAPACITY = ${b.size} pairs  ->  locked profit ~${usd(b.netPerPair * b.size)}`);
      if (mt.meta && mt.meta.caveat) console.log(`    CAVEAT: ${mt.meta.caveat}`);
    }
  }

  // 6) headline stats
  const skips = {};
  for (const mt of matches) if (mt._skip) skips[mt._skip] = (skips[mt._skip] || 0) + 1;
  console.log('\n=== STATS ===');
  console.log('  #PM markets pulled        :', pmMarkets.length);
  console.log('  #Kalshi single markets    :', kMarkets.length);
  console.log('  #confident matches        :', matches.length, JSON.stringify(byKind));
  console.log('  #priced on real books     :', priced.length, '(skipped:', JSON.stringify(skips) + ')');
  console.log('  #net-positive after costs :', profitable.length);
  console.log('  raw gap buckets           :', JSON.stringify(buckets));
}

main().catch((e) => { console.error('FATAL', e.message, e.stack); process.exit(1); });
