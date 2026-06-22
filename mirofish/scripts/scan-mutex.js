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
    const r = am.analyzeBuyAllNo(c.legs, books, CLIP);
    const singles = am.analyzeSingleLeg(c.legs, books, CLIP);
    reports.push({ event: c.event, legs: c.legs, r, singles });
  }

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
  // A basket trade counts ONLY if every required leg fully fills the clip
  // AND net edge after fees > 0.
  const basketWins = reports
    .filter((x) => x.r.allFill && x.r.netEdge > 0)
    .sort((a, b) => b.r.netPerDollarSet - a.r.netPerDollarSet);

  const singleWins = reports
    .filter((x) => x.singles.length)
    .sort((a, b) => Math.max(...b.singles.map((s) => s.netPerShare)) - Math.max(...a.singles.map((s) => s.netPerShare)));

  /* ---------- print basket wins ---------- */
  console.log('============================================================');
  console.log('STRUCTURE 1+2: BUY-ALL-NO BASKET (executable, net-positive after fees+slippage)');
  console.log('============================================================');
  if (!basketWins.length) {
    console.log('  none — no full-fill basket nets positive after real slippage + taker fees.\n');
  } else {
    for (const w of basketWins) {
      const r = w.r;
      console.log(`\n* ${w.event.title}  [${r.K} legs, ${w.event.negRisk ? 'negRisk' : 'plain'}, vol24=$${Math.round(w.event.volume24hr || 0).toLocaleString()}]`);
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

  /* ---------- top-N closest baskets (diagnostic) ---------- */
  if (TOP > 0) {
    console.log('============================================================');
    console.log(`DIAGNOSTIC: top ${TOP} baskets by (lowest after-fee NO cost − (K−1)), full-fill only`);
    console.log('============================================================');
    const closest = reports
      .filter((x) => x.r.allFill && isFinite(x.r.noCostMinusK1))
      .sort((a, b) => a.r.noCostMinusK1 - b.r.noCostMinusK1)
      .slice(0, TOP);
    for (const w of closest) {
      const r = w.r;
      console.log(`  ${f(r.noCostMinusK1)}  net=${money(r.netEdge)}  K=${r.K}  cap=${Math.floor(r.capacityShares)}  ${w.event.negRisk ? 'negRisk' : 'plain'}  ${w.event.title}`);
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
  console.log(`     of which negRisk:           ${reports.filter((x) => x.event.negRisk).length}`);
  console.log(`     of which plain (non-negRisk):${reports.filter((x) => !x.event.negRisk).length}`);
  console.log(`  baskets that FULLY FILL ${CLIP}-clip on every leg:  ${fullFill.length}`);
  console.log(`  leg-count distribution (candidates):`);
  {
    const buckets = {};
    for (const x of reports) {
      const k = x.r.K <= 5 ? '3-5' : x.r.K <= 10 ? '6-10' : x.r.K <= 20 ? '11-20' : '21-40';
      buckets[k] = (buckets[k] || 0) + 1;
    }
    for (const k of ['3-5', '6-10', '11-20', '21-40']) console.log(`     ${k} legs: ${buckets[k] || 0}`);
  }
  console.log(`\n  DIST of (basket NO cost − (K−1)) BEFORE fees, ${noMinusK1.length} events:`);
  console.log(`     ${quantiles(noMinusK1)}`);
  console.log(`     <0 before fees (gross arb signal): ${noMinusK1.filter((x) => x < 0).length}`);
  {
    // after-fee distribution among full-fill baskets (the honest one)
    const af = fullFill.map((x) => x.r.noCostMinusK1).sort((a, b) => a - b);
    console.log(`  DIST of (basket NO cost − (K−1)) AFTER fees, full-fill baskets (${af.length}):`);
    console.log(`     ${quantiles(af)}`);
    console.log(`     <0 after fees (NET ARB): ${af.filter((x) => x < 0).length}`);
  }
  console.log(`\n  DIST of (sum YES ask − 1) overround, ${overround.length} events (all legs quoted):`);
  console.log(`     ${quantiles(overround)}`);
  console.log(`     >0 (YES basket overpriced): ${overround.filter((x) => x > 0).length}`);

  console.log(`\n  NET-POSITIVE executable basket arbs (full-fill, after fees): ${basketWins.length}`);
  console.log(`  NET-POSITIVE single-leg locks:                              ${singleCount}`);
  console.log(`\n# done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
