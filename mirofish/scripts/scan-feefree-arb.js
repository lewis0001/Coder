#!/usr/bin/env node
'use strict';
/* ============================================================
   scripts/scan-feefree-arb.js
   ------------------------------------------------------------
   THE DECISIVE FEE-AWARE TEST. The research program proved the gross
   structural edges are real but killed by Polymarket's 3-7% category
   taker fees. One liquid category — geopolitics / world-leader markets —
   is FEE-FREE (feesEnabled=false, verified per market). On a fee-free
   market net edge == gross edge: you still cross the real bid/ask spread
   via a book walk, but pay no taker fee. So this scanner asks, on LIVE
   order books only:

     Does removing the fee turn any gross structural edge into a real,
     NET-tradeable one RIGHT NOW?

   It tests, on the verified fee-free universe (lib/feefree.js), judging
   every edge on EXECUTABLE fills (lib/orderbook.buyCost walks real ask
   depth; both legs must fully fill, exhausted=false):

     1. TEMPORAL logical arb — nested "by <date>" chains (same subject,
        earlier ⊆ later, chained ACROSS events). Lock = YES(by LATE) +
        NO(by EARLY) for a combined VWAP < $1.
     2. NESTED THRESHOLD arb — where present in the fee-free set.
     3. OVERROUND / BUY-ALL-NO — on fee-free negRisk multi-candidate
        fields (next PM/leader). Is the executable all-NO basket < (K-1)
        now that there's no fee? Requires EVERY leg to fully fill.
     4. SINGLE-LEG NO FADE — overpriced-mid-band NO fade: a leg whose
        executable NO ask is well below 1 (YES expensive) where you'd
        short the favorite; reported as a fwd-logged directional, not a
        lock.

   For every NET-tradeable edge we print legs, executable cost, net
   cents per $1, capacity (fillable size), AND the contrast: what the
   same edge WOULD net on a fee-paying market (showing the fee was the
   only thing killing it). Live executable edges are forward-logged to
   data/research/feefree-arb-YYYYMMDD.json for later resolution scoring.

   Plain Node, no deps. Polite (book fetch concurrency<=5).

   Usage:
     node scripts/scan-feefree-arb.js
     node scripts/scan-feefree-arb.js --clips 50,200,500,2000 --conc 5
   ============================================================ */

const fs = require('fs');
const path = require('path');
const ob = require('../lib/orderbook');
const ff = require('../lib/feefree');

/* --------- args --------- */
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const CLIPS = String(arg('clips', '50,200,500,2000')).split(',').map(Number).filter((x) => x > 0).sort((a, b) => b - a);
const CONC = Math.min(5, Number(arg('conc', 5)));       // polite: <=5
const MKT_LIMIT = Number(arg('mlimit', 2500));
const EV_LIMIT = Number(arg('elimit', 1500));
const FADE_BAND = [Number(arg('fadelo', 0.65)), Number(arg('fadehi', 0.97))]; // YES-ask band to fade
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function c(x) { return x == null ? 'n/a' : (x * 100).toFixed(3) + 'c'; }
function money(x) { return x == null ? 'n/a' : '$' + (+x).toFixed(2); }

/* taker fee per share that a FEE-PAYING market of `rate` would charge at
   avg price p (taker-only, exponent 1): rate*min(p,1-p). Used only for the
   "what it would cost on a fee market" contrast. */
function feePerShare(rate, p) { return rate > 0 ? rate * Math.min(p, 1 - p) : 0; }

/* ---- evaluate a 2-leg lock (temporal / nested) on real books ----
   Both legs must FULLY fill the clip (exhausted=false). Net edge (fee-free)
   = payoff(=shares) - executable cost. Also compute the contrast net if the
   same trade paid the geopolitics-class taker rate on both legs. */
function evalLockPair(pair, books) {
  const bL = books[pair.left.token], bR = books[pair.right.token];
  if (!bL || !bR || !bL.asks.length || !bR.asks.length) return { crosses: false, reason: 'no book' };
  const topCombo = bL.asks[0].price + bR.asks[0].price;
  const result = { crosses: topCombo < 1, topCombo, topEdge: 1 - topCombo, best: null };
  if (topCombo >= 1) return result;
  // fee rate the same markets WOULD pay if not fee-free (for contrast)
  const rateL = ff.inferRate(pair.left.m), rateR = ff.inferRate(pair.right.m);
  for (const shares of CLIPS) {
    const fL = ob.buyCost(bL, shares), fR = ob.buyCost(bR, shares);
    if (fL.exhausted || fR.exhausted) continue;
    const cost = fL.cost + fR.cost;
    const payoff = shares;
    const net = payoff - cost;
    if (net > 0) {
      // contrast: fee-paying version pays taker fee on each leg
      const feeContrast = (feePerShare(rateL, fL.avgPrice) + feePerShare(rateR, fR.avgPrice)) * shares;
      result.best = {
        shares, cost, payoff, net, netPerShare: net / shares,
        avgL: fL.avgPrice, avgR: fR.avgPrice, comboVwap: cost / shares,
        feeContrast, netIfFeePaid: net - feeContrast,
        rateContrast: Math.max(rateL, rateR),
      };
      break; // largest profitable clip
    }
  }
  return result;
}

/* ---- buy-all-NO basket on a fee-free negRisk field, real books ----
   Pays exactly (K-1) per share-set ONLY if every leg fully fills AND the
   field is an exhaustive one-winner partition. We require allFill and gate
   the partition with sumYES≈1. */
function evalField(field, books, shares) {
  const legs = field.legs;
  const K = legs.length;
  let noCost = 0, allFill = true, minDepth = Infinity;
  let sumYesAsk = 0, sumYesBid = 0, yesKnown = 0;
  const perLeg = [];
  for (const leg of legs) {
    const nb = books[leg.tokens.no], yb = books[leg.tokens.yes];
    if (yb && yb.bestAsk != null) { sumYesAsk += yb.bestAsk; yesKnown++; }
    if (yb && yb.bestBid != null) sumYesBid += yb.bestBid;
    if (!nb || !nb.asks.length) { allFill = false; minDepth = 0; perLeg.push({ leg, exhausted: true }); continue; }
    const r = ob.buyCost(nb, shares);
    if (r.exhausted) allFill = false;
    const depth = nb.asks.reduce((s, l) => s + l.size, 0);
    minDepth = Math.min(minDepth, depth);
    noCost += r.cost;
    perLeg.push({ leg, exhausted: r.exhausted, avg: r.avgPrice, depth });
  }
  const payout = (K - 1) * shares;
  const edge = payout - noCost;                    // fee-free net (== gross)
  const perSet = (noCost / shares) - (K - 1);      // <0 => arb
  const sumYes = yesKnown === K ? sumYesAsk : null;
  // partition sanity: a true exhaustive field has sumYESask ~ 1.
  const isPartition = sumYes != null && sumYes >= 0.85 && sumYes <= 1.2;
  // contrast: fee-paying all-NO basket would pay taker fee on every NO share
  const rate = ff.inferRate(legs[0].m);
  let feeContrast = 0;
  for (const pl of perLeg) if (!pl.exhausted) feeContrast += feePerShare(rate, pl.avg) * shares;
  return {
    K, shares, noCost, payout, edge, perSet, allFill,
    capacityShares: isFinite(minDepth) ? minDepth : 0,
    sumYesAsk: sumYes, sumYesBid, overround: sumYes != null ? sumYes - 1 : null,
    isPartition, feeContrast, edgeIfFeePaid: edge - feeContrast, rate, perLeg,
  };
}

/* ---- single-leg NO fade on a fee-free favorite (directional) ----
   For a leg whose YES ask sits in the fade band, short the favorite by
   buying NO. Not a lock — a fwd-logged directional bet whose only point
   here is: on a fee-paying market the taker fee alone would erode it. */
function evalFades(field, books) {
  const out = [];
  for (const leg of field.legs) {
    const yb = books[leg.tokens.yes], nb = books[leg.tokens.no];
    if (!yb || yb.bestAsk == null || !nb || !nb.asks.length) continue;
    const yesAsk = yb.bestAsk;
    if (yesAsk < FADE_BAND[0] || yesAsk > FADE_BAND[1]) continue;
    const r = ob.buyCost(nb, 200);
    if (r.exhausted) continue;
    const noAsk = r.avgPrice;
    const rate = ff.inferRate(leg.m);
    out.push({
      leg, yesAsk, noAsk, noBid: nb.bestBid,
      depth200: !r.exhausted, feePerShare: feePerShare(rate, noAsk), rate,
    });
  }
  return out;
}

async function fetchBooks(tokens) {
  const books = {};
  const BATCH = 100;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const slice = tokens.slice(i, i + BATCH);
    const got = await ob.getBooks(slice, { concurrency: CONC });
    Object.assign(books, got);
    process.stdout.write(`\r  fetched ${Math.min(i + BATCH, tokens.length)}/${tokens.length} books ...`);
    if (i + BATCH < tokens.length) await sleep(150);
  }
  process.stdout.write('\n');
  return books;
}

(async () => {
  const t0 = Date.now();
  console.log('=== FEE-FREE STRUCTURAL-ARB LIVE SCAN ===');
  console.log(`clips(shares)=${CLIPS.join(',')}  bookConc=${CONC}  fadeBand=[${FADE_BAND.join(',')}]`);
  console.log('building + verifying fee-free universe (Gamma) ...');
  const uni = await ff.buildFeeFreeUniverse({ marketLimit: MKT_LIMIT, eventLimit: EV_LIMIT });
  console.log(`live markets pulled: ${uni.allCount}`);
  console.log(`  fee-free (feesEnabled=false, verified): ${uni.freeCount}`);
  console.log(`  fee-paying: ${uni.paidCount}   unverified: ${uni.unverified}`);
  console.log(`  fee-free + tradeable + not-expired: ${uni.markets.length}   (expired fee-free dropped: ${uni.expiredFree})`);

  // --- structures ---
  const chains = ff.temporalChains(uni.markets);
  const temporalPairs = ff.temporalPairsFromChains(chains);
  const fields = ff.feeFreeFields(uni.allEvents);
  // partition gate is checked at eval; pre-count fields with >=2 fee-free legs
  console.log(`\nfee-free TEMPORAL chains (>=2 dated legs, cross-event): ${chains.length}`);
  for (const ch of chains.slice(0, 14)) {
    console.log(`   [${ch.legs.length} legs] ${ch.legs.map((l) => ff.dlLabel(l)).join(' < ')}  :: ${ch.subject.slice(0, 60)}`);
  }
  if (chains.length > 14) console.log(`   ... and ${chains.length - 14} more chains`);
  console.log(`fee-free TEMPORAL leg-pairs (YES-late + NO-early): ${temporalPairs.length}`);
  console.log(`fee-free negRisk FIELDS (all fee-free legs, >=2 legs): ${fields.length}`);

  // --- collect tokens & fetch books once ---
  const tokenSet = new Set();
  for (const p of temporalPairs) { tokenSet.add(p.left.token); tokenSet.add(p.right.token); }
  for (const fld of fields) for (const leg of fld.legs) { tokenSet.add(leg.tokens.yes); tokenSet.add(leg.tokens.no); }
  const tokens = [...tokenSet];
  console.log(`\nunique tokens to fetch live books for: ${tokens.length}`);
  const books = await fetchBooks(tokens);
  const gotBooks = Object.values(books).filter(Boolean).length;
  console.log(`got ${gotBooks}/${tokens.length} live books in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  /* ============ 1+2) TEMPORAL / NESTED locks ============ */
  const tempWins = [];
  const tempCrossThin = [];   // crosses at top-of-book but too thin to fill any clip
  const tempEdges = [];       // top-of-book edge distribution
  for (const p of temporalPairs) {
    const r = evalLockPair(p, books);
    if (typeof r.topCombo === 'number') tempEdges.push(1 - r.topCombo);
    if (r.best) tempWins.push({ p, r });
    else if (r.crosses) tempCrossThin.push({ p, r });
  }
  tempWins.sort((a, b) => b.r.best.net - a.r.best.net);

  console.log('\n============================================================');
  console.log('1+2) TEMPORAL / NESTED LOCKS on FEE-FREE by-date chains');
  console.log('    (YES by-late + NO by-early; both legs fully fill; net = gross, fee-free)');
  console.log('============================================================');
  if (!tempWins.length) {
    console.log('  NO net-tradeable temporal lock: zero fee-free chains fill a clip for net profit.');
  } else {
    for (const { p, r } of tempWins) {
      const b = r.best;
      console.log(`\n* ${p.subject}`);
      console.log(`    WHY  : ${p.why}`);
      console.log(`    LEG L: BUY YES "${qof(p.left)}"  end=${p.left.m.endDate ? p.left.m.endDate.slice(0, 10) : '?'}  avg=${c(b.avgL)}`);
      console.log(`    LEG R: BUY NO  "${qof(p.right)}"  end=${p.right.m.endDate ? p.right.m.endDate.slice(0, 10) : '?'}  avg=${c(b.avgR)}`);
      console.log(`    FILL : ${b.shares} share-sets  combined VWAP=${c(b.comboVwap)} (pays 100c) capacity>=${b.shares}`);
      console.log(`    NET  : ${money(b.net)} locked = ${(b.netPerShare * 100).toFixed(3)}c per $1  [FEE-FREE]`);
      console.log(`    CONTRAST: on a fee-paying market (taker ${(b.rateContrast * 100).toFixed(0)}%) this same fill nets ${money(b.netIfFeePaid)} (${b.netIfFeePaid <= 0 ? 'KILLED by fee' : 'survives'}) — fee would cost ${money(b.feeContrast)}`);
    }
  }

  /* ============ 3) OVERROUND / BUY-ALL-NO on fee-free fields ============ */
  const fieldReports = [];
  for (const fld of fields) {
    // size the basket to the largest clip that every leg can fill; start big, step down
    let rep = null;
    for (const shares of CLIPS) {
      const rr = evalField(fld, books, shares);
      if (rr.allFill) { rep = rr; break; }
      if (!rep) rep = rr; // keep smallest-tried as fallback diagnostic
    }
    fieldReports.push({ fld, rep });
  }
  const basketWins = fieldReports
    .filter((x) => x.rep.allFill && x.rep.isPartition && x.rep.edge > 0)
    .sort((a, b) => b.rep.perSet - a.rep.perSet); // most negative perSet = best, but perSet<0 so sort asc of perSet => use edge

  basketWins.sort((a, b) => (a.rep.perSet) - (b.rep.perSet)); // most negative (best arb) first

  console.log('\n============================================================');
  console.log('3) OVERROUND / BUY-ALL-NO BASKET on FEE-FREE negRisk fields');
  console.log('    (true exhaustive partition sumYES~1; EVERY leg fully fills; net=gross)');
  console.log('============================================================');
  if (!basketWins.length) {
    console.log('  NO net-tradeable all-NO basket: no full-fill fee-free partition costs < (K-1).');
  } else {
    for (const { fld, rep } of basketWins) {
      console.log(`\n* ${fld.event.title}  [${rep.K} legs, sumYESask=${rep.sumYesAsk.toFixed(3)}, vol24=$${Math.round(fld.event.volume24hr || 0).toLocaleString()}]`);
      console.log(`    buy ${rep.shares} NO on every leg -> guaranteed payout ${money(rep.payout)}`);
      console.log(`    executable all-NO cost (real asks) = ${money(rep.noCost)}  vs (K-1)*clip=${money(rep.payout)}`);
      console.log(`    NET EDGE = ${money(rep.edge)} = ${(rep.perSet * -100).toFixed(3)}c per $1-set  [FEE-FREE]  capacity>=${Math.floor(rep.capacityShares)} sets`);
      console.log(`    CONTRAST: fee-paying (taker ${(rep.rate * 100).toFixed(0)}%) would add ${money(rep.feeContrast)} fee -> net ${money(rep.edgeIfFeePaid)} (${rep.edgeIfFeePaid <= 0 ? 'KILLED' : 'survives'})`);
    }
  }

  /* ============ 4) SINGLE-LEG NO FADE (directional, fwd-logged) ============ */
  const fades = [];
  for (const fld of fields) for (const f of evalFades(fld, books)) fades.push({ fld, f });
  fades.sort((a, b) => b.f.yesAsk - a.f.yesAsk);

  console.log('\n============================================================');
  console.log(`4) SINGLE-LEG NO FADE on fee-free favorites (YES ask in [${FADE_BAND.join(',')}])`);
  console.log('    (directional short of the favorite; NOT a lock — fwd-logged for scoring)');
  console.log('============================================================');
  if (!fades.length) console.log('  none in band.');
  else {
    for (const { fld, f } of fades.slice(0, 12)) {
      console.log(`* ${(f.leg.m.groupItemTitle || f.leg.m.question || '').slice(0, 50)}  [${fld.event.title.slice(0, 30)}]`);
      console.log(`    YESask=${c(f.yesAsk)}  -> buy NO @${c(f.noAsk)} (fillable 200)  | fee-free saves ${c(f.feePerShare)}/sh vs ${(f.rate * 100).toFixed(0)}% market`);
    }
    if (fades.length > 12) console.log(`  ... and ${fades.length - 12} more`);
  }

  /* ============ SCAN STATS ============ */
  console.log('\n============================================================');
  console.log('SCAN STATS');
  console.log('============================================================');
  console.log(`  fee-free liquid markets:                 ${uni.markets.length}`);
  console.log(`  fee-free temporal chains:                ${chains.length}  (=> ${temporalPairs.length} leg-pairs)`);
  console.log(`  fee-free negRisk fields (>=2 legs):      ${fields.length}`);
  const partitionFields = fieldReports.filter((x) => x.rep.isPartition).length;
  const fullFillFields = fieldReports.filter((x) => x.rep.allFill).length;
  console.log(`     of those, true partitions (sumYES~1): ${partitionFields}`);
  console.log(`     of those, EVERY leg fills a clip:     ${fullFillFields}`);
  if (tempEdges.length) {
    const cents = tempEdges.map((x) => x * 100).sort((a, b) => a - b);
    const q = (p) => cents[Math.min(cents.length - 1, Math.floor(p * (cents.length - 1)))];
    const pos = cents.filter((x) => x > 0).length;
    console.log(`\n  TEMPORAL top-of-book edge (payoff - combined best ask), cents/$1, n=${cents.length}:`);
    console.log(`     positive(crossing)=${pos}  min=${cents[0].toFixed(2)} p50=${q(0.5).toFixed(2)} p90=${q(0.9).toFixed(2)} max=${cents[cents.length - 1].toFixed(2)}`);
    console.log(`     of crossing pairs, fillable for net>0: ${tempWins.length}   crossing-but-too-thin: ${tempCrossThin.length}`);
  }
  {
    const part = fieldReports.filter((x) => x.rep.isPartition && x.rep.allFill).map((x) => x.rep.perSet).sort((a, b) => a - b);
    if (part.length) {
      const q = (p) => part[Math.min(part.length - 1, Math.floor(p * (part.length - 1)))];
      console.log(`\n  FIELD all-NO (basket cost - (K-1)) per $1-set, full-fill partitions, n=${part.length}:`);
      console.log(`     min=${q(0).toFixed(4)} p50=${q(0.5).toFixed(4)} max=${q(1).toFixed(4)}   <0 = NET ARB: ${part.filter((x) => x < 0).length}`);
    } else {
      console.log(`\n  FIELD all-NO: no full-fill fee-free partition to distribute (fields too sparse/illiquid).`);
    }
  }
  console.log(`\n  NET-TRADEABLE temporal locks:   ${tempWins.length}`);
  console.log(`  NET-TRADEABLE all-NO baskets:   ${basketWins.length}`);
  console.log(`  fade candidates (fwd-logged):   ${fades.length}`);

  /* ============ FORWARD-LOG ============ */
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outDir = path.join(__dirname, '..', 'data', 'research');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `feefree-arb-${today}.json`);
  const log = {
    scannedAt: new Date().toISOString(),
    universe: {
      liveMarkets: uni.allCount, feeFreeVerified: uni.freeCount, feePaying: uni.paidCount,
      feeFreeTradeable: uni.markets.length, expiredFreeDropped: uni.expiredFree,
      temporalChains: chains.length, temporalPairs: temporalPairs.length, negRiskFields: fields.length,
      partitionFields, fullFillFields,
    },
    netTradeable: {
      temporalLocks: tempWins.map(({ p, r }) => ({
        subject: p.subject, why: p.why,
        legYes: { token: p.left.token, q: p.left.m.question, end: p.left.m.endDate, avg: r.best.avgL },
        legNo: { token: p.right.token, q: p.right.m.question, end: p.right.m.endDate, avg: r.best.avgR },
        shares: r.best.shares, comboVwap: r.best.comboVwap, netPerShare: r.best.netPerShare,
        netUsd: r.best.net, netIfFeePaid: r.best.netIfFeePaid,
      })),
      allNoBaskets: basketWins.map(({ fld, rep }) => ({
        event: fld.event.title, eventId: fld.event.id, K: rep.K, shares: rep.shares,
        sumYesAsk: rep.sumYesAsk, noCost: rep.noCost, payout: rep.payout,
        perSet: rep.perSet, netUsd: rep.edge, netIfFeePaid: rep.edgeIfFeePaid,
        capacityShares: rep.capacityShares,
        legs: fld.legs.map((l) => ({ title: l.m.groupItemTitle || l.m.question, noToken: l.tokens.no })),
      })),
    },
    fades: fades.slice(0, 40).map(({ fld, f }) => ({
      event: fld.event.title, eventId: fld.event.id,
      leg: f.leg.m.groupItemTitle || f.leg.m.question,
      noToken: f.leg.tokens.no, yesToken: f.leg.tokens.yes,
      yesAsk: f.yesAsk, noAsk: f.noAsk, noBid: f.noBid, end: f.leg.m.endDate,
    })),
  };
  fs.writeFileSync(outFile, JSON.stringify(log, null, 2));
  console.log(`\nforward-log written: ${path.relative(path.join(__dirname, '..'), outFile)}  (${log.netTradeable.temporalLocks.length} locks, ${log.netTradeable.allNoBaskets.length} baskets, ${log.fades.length} fades)`);
  console.log(`\nscan done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  function qof(leg) { const m = leg.m || {}; return (m.groupItemTitle || m.question || '').slice(0, 60); }
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
