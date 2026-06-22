'use strict';
/* ============================================================
   scripts/scan-mutex.js — scan ALL live multi-outcome events for
   structural mispricing on REAL order books.

   For every live event with 3..40 order-book legs:
     - pull NO + YES books for every leg (concurrency<=6),
     - structure (1)+(2): buy-all-NO basket vs (K-1) payout, after
       real slippage AND taker fees, with executable capacity,
     - structure (3): single-leg YES+NO<1 locks,
     - within-event relative value.

   Prints every event where a basket / single-leg trade is
   executable for NET PROFIT, with concrete numbers. Then prints
   scan-wide stats: #events, distribution of (basket NO cost - (K-1))
   and (sum YES ask - 1), and how many are net-positive after slippage.

   Plain Node, no deps. Usage:
     node scripts/scan-mutex.js [--clip=300] [--limit=600] [--maxlegs=40] [--minlegs=3] [--top=N]
   ============================================================ */

const ob = require('../lib/orderbook');
const am = require('../lib/arb-mutex');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return def;
  const v = hit.split('=')[1];
  return isNaN(+v) ? v : +v;
}

const CLIP = arg('clip', 300);          // dollars of guaranteed payout per leg (= NO shares per leg)
const LIMIT = arg('limit', 600);        // how many live events to pull (by 24h volume)
const MIN_LEGS = arg('minlegs', 3);
const MAX_LEGS = arg('maxlegs', 40);
const TOP = arg('top', 0);              // if >0, also print top-N closest baskets even if not profitable
const CONC = 6;

function pct(x, n) { return ((100 * x) / n).toFixed(1) + '%'; }
function f(x, d = 4) { return x == null ? 'n/a' : (+x).toFixed(d); }
function money(x) { return x == null ? 'n/a' : '$' + (+x).toFixed(2); }

(async () => {
  const t0 = Date.now();
  console.log(`# scan-mutex  clip=$${CLIP}/leg  legs∈[${MIN_LEGS},${MAX_LEGS}]  fee-model=taker(rate*min(p,1-p))`);
  console.log('# pulling live events by 24h volume ...');
  const events = await ob.liveEvents({ limit: LIMIT });
  console.log(`# fetched ${events.length} live events`);

  // Build the candidate set with leg extraction.
  const candidates = [];
  for (const e of events) {
    const legs = am.eventLegs(e);
    if (legs.length < MIN_LEGS || legs.length > MAX_LEGS) continue;
    candidates.push({ event: e, legs });
  }
  console.log(`# ${candidates.length} candidate events with ${MIN_LEGS}-${MAX_LEGS} order-book legs`);

  // Collect every token we need (NO + YES of every leg) and batch-fetch.
  const tokenSet = new Set();
  for (const c of candidates) for (const leg of c.legs) { tokenSet.add(leg.noToken); tokenSet.add(leg.yesToken); }
  const tokenIds = [...tokenSet];
  console.log(`# fetching ${tokenIds.length} order books (concurrency=${CONC}) ...`);
  const books = await ob.getBooks(tokenIds, { concurrency: CONC });
  const gotBooks = Object.values(books).filter(Boolean).length;
  console.log(`# got ${gotBooks}/${tokenIds.length} books in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // Analyze every candidate.
  const reports = [];
  for (const c of candidates) {
    const mx = am.classifyMutex(c.event, c.legs);
    const r = am.analyzeBuyAllNo(c.legs, books, CLIP);
    const singles = am.analyzeSingleLeg(c.legs, books, CLIP);
    reports.push({ event: c.event, legs: c.legs, mx, r, singles });
  }
  const mutexReports = reports.filter((x) => x.mx.isMutex);
  const plainReports = reports.filter((x) => !x.mx.isMutex);

  /* ---------- distribution stats ---------- */
  const withNoFee = reports.filter((x) => isFinite(x.r.noCostMinusK1NoFee));
  const withYesSum = reports.filter((x) => x.r.overround != null);
  const noMinusK1 = withNoFee.map((x) => x.r.noCostMinusK1NoFee).sort((a, b) => a - b);
  const overround = withYesSum.map((x) => x.r.overround).sort((a, b) => a - b);

  function quantiles(arr) {
    if (!arr.length) return 'none';
    const q = (p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
    return `min=${f(arr[0])} p10=${f(q(0.1))} p50=${f(q(0.5))} p90=${f(q(0.9))} max=${f(arr[arr.length - 1])}`;
  }

  /* ---------- net-positive executable baskets ---------- */
  // A basket trade counts ONLY if: (a) the event is a TRUE mutex partition
  // (else all-NO does not pay K-1), (b) every required leg fully fills the
  // clip, AND (c) net edge after fees > 0.
  const basketWins = mutexReports
    .filter((x) => x.r.allFill && x.r.netEdge > 0)
    .sort((a, b) => b.r.netPerDollarSet - a.r.netPerDollarSet);

  const singleWins = reports
    .filter((x) => x.singles.length)
    .sort((a, b) => Math.max(...b.singles.map((s) => s.netPerShare)) - Math.max(...a.singles.map((s) => s.netPerShare)));

  /* ---------- print basket wins ---------- */
  console.log('============================================================');
  console.log('STRUCTURE 1+2: BUY-ALL-NO BASKET on TRUE MUTEX events');
  console.log('(executable, net-positive after fees+slippage; mutex = one-winner partition)');
  console.log('============================================================');
  if (!basketWins.length) {
    console.log('  none — no full-fill mutex basket nets positive after real slippage + taker fees.\n');
  } else {
    for (const w of basketWins) {
      const r = w.r;
      console.log(`\n* ${w.event.title}  [${r.K} legs, ${w.mx.reason}, vol24=$${Math.round(w.event.volume24hr || 0).toLocaleString()}]`);
      console.log(`    buy ${r.shares} NO on every leg → guaranteed payout $${r.payout}`);
      console.log(`    executable cost (real asks): ${money(r.totalCostNoFee)}  + fees ${money(r.totalCost - r.totalCostNoFee)}  = ${money(r.totalCost)}`);
      console.log(`    NET EDGE = ${money(r.netEdge)}  (${f(r.netPerDollarSet * 100, 3)}¢ per $1-set)`);
      console.log(`    basket NO cost − (K−1) = ${f(r.noCostMinusK1)} after fees  (${f(r.noCostMinusK1NoFee)} before)`);
      console.log(`    capacity ≈ ${Math.floor(r.capacityShares)} NO-share-sets (thinnest leg)  | overround sumYESask−1 = ${f(r.overround)}`);
    }
    console.log();
  }

  /* ---------- print single-leg locks ---------- */
  console.log('============================================================');
  console.log('STRUCTURE 3: SINGLE-LEG LOCKS (buy YES+NO < $1 on same market, net>0)');
  console.log('============================================================');
  let singleCount = 0;
  for (const w of singleWins) {
    for (const s of w.singles) {
      singleCount++;
      if (singleCount <= 25) {
        console.log(`* ${w.event.title} :: ${s.leg.title}`);
        console.log(`    buy ${s.shares} YES @${f(s.yesAvg)} + ${s.shares} NO @${f(s.noAvg)}  cost ${money(s.cost)} (+fees) → pays $${s.shares}  NET ${money(s.net)} (${f(s.netPerShare * 100, 3)}¢/$1)`);
      }
    }
  }
  if (!singleCount) console.log('  none.\n');
  else console.log(`  (${singleCount} single-leg locks total${singleCount > 25 ? ', showing first 25' : ''})\n`);

  /* ---------- top-N closest MUTEX baskets (diagnostic) ---------- */
  if (TOP > 0) {
    console.log('============================================================');
    console.log(`DIAGNOSTIC: top ${TOP} TRUE-MUTEX baskets by (after-fee NO cost − (K−1)), full-fill only`);
    console.log('(how tight the legit one-winner baskets are arbed; <0 = net arb)');
    console.log('============================================================');
    const closest = mutexReports
      .filter((x) => x.r.allFill && isFinite(x.r.noCostMinusK1))
      .sort((a, b) => a.r.noCostMinusK1 - b.r.noCostMinusK1)
      .slice(0, TOP);
    for (const w of closest) {
      const r = w.r;
      console.log(`  ${f(r.noCostMinusK1)}  net=${money(r.netEdge)}  K=${r.K}  cap=${Math.floor(r.capacityShares)}  sumYES=${f(w.mx.sumYes, 3)}  ${w.event.title}`);
    }
    console.log();
    // Show what the plain (non-mutex) "arbs" look like so it's explicit they are fake.
    console.log('--- for contrast: plain (NON-mutex) events flagged by naive all-NO < (K-1) ---');
    console.log('--- these are NOT tradeable: legs overlap, all-NO does NOT pay (K-1) ---');
    const fakePlain = plainReports
      .filter((x) => x.r.allFill && x.r.noCostMinusK1 < -0.05)
      .sort((a, b) => a.r.noCostMinusK1 - b.r.noCostMinusK1)
      .slice(0, 8);
    for (const w of fakePlain) {
      console.log(`  naiveEdge=${money(w.r.netEdge)}  K=${w.r.K}  overround(sumYESask−1)=${f(w.r.overround)}  ${w.event.title}`);
    }
    console.log();
  }

  /* ---------- scan-wide stats ---------- */
  const fullFill = reports.filter((x) => x.r.allFill);
  console.log('============================================================');
  console.log('SCAN STATS');
  console.log('============================================================');
  console.log(`  live events pulled:            ${events.length}`);
  console.log(`  candidate events (${MIN_LEGS}-${MAX_LEGS} legs):  ${reports.length}`);
  console.log(`     TRUE MUTEX (one-winner partition): ${mutexReports.length}`);
  console.log(`     plain/overlapping (NOT mutex):     ${plainReports.length}`);
  console.log(`  mutex baskets that FULLY FILL ${CLIP}-clip on every leg:  ${mutexReports.filter((x) => x.r.allFill).length}`);
  console.log(`  (all-events full-fill, incl. non-tradeable plain: ${fullFill.length})`);
  console.log(`  leg-count distribution (candidates):`);
  {
    const buckets = {};
    for (const x of reports) {
      const k = x.r.K <= 5 ? '3-5' : x.r.K <= 10 ? '6-10' : x.r.K <= 20 ? '11-20' : '21-40';
      buckets[k] = (buckets[k] || 0) + 1;
    }
    for (const k of ['3-5', '6-10', '11-20', '21-40']) console.log(`     ${k} legs: ${buckets[k] || 0}`);
  }
  // The honest distributions are over TRUE MUTEX events only.
  const mFull = mutexReports.filter((x) => x.r.allFill);
  {
    const before = mutexReports.filter((x) => isFinite(x.r.noCostMinusK1NoFee)).map((x) => x.r.noCostMinusK1NoFee).sort((a, b) => a - b);
    console.log(`\n  [MUTEX] DIST of (basket NO cost − (K−1)) BEFORE fees, ${before.length} events:`);
    console.log(`     ${quantiles(before)}`);
    console.log(`     <0 before fees (gross arb signal): ${before.filter((x) => x < 0).length}`);
    const af = mFull.map((x) => x.r.noCostMinusK1).sort((a, b) => a - b);
    console.log(`  [MUTEX] DIST of (basket NO cost − (K−1)) AFTER fees, full-fill (${af.length}):`);
    console.log(`     ${quantiles(af)}`);
    console.log(`     <0 after fees (NET ARB): ${af.filter((x) => x < 0).length}`);
  }
  {
    const ovr = mutexReports.filter((x) => x.r.overround != null).map((x) => x.r.overround).sort((a, b) => a - b);
    console.log(`\n  [MUTEX] DIST of (sum YES ask − 1) overround, ${ovr.length} events (all legs quoted):`);
    console.log(`     ${quantiles(ovr)}`);
    console.log(`     >0 (YES basket overpriced — short via all-NO): ${ovr.filter((x) => x > 0).length}`);
  }
  console.log(`\n  [ALL incl. plain] DIST of (NO cost − (K−1)) BEFORE fees, ${noMinusK1.length}:  ${quantiles(noMinusK1)}`);
  console.log(`  [ALL incl. plain] DIST of (sum YES ask − 1), ${overround.length}:  ${quantiles(overround)}`);
  console.log(`     (plain events dominate the extreme tails; they are NOT tradeable baskets)`);

  console.log(`\n  NET-POSITIVE executable basket arbs (full-fill, after fees): ${basketWins.length}`);
  console.log(`  NET-POSITIVE single-leg locks:                              ${singleCount}`);
  console.log(`\n# done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
