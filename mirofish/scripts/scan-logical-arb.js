#!/usr/bin/env node
'use strict';
/* ============================================================
   scripts/scan-logical-arb.js
   ------------------------------------------------------------
   Scan the LIVE Polymarket universe for LOGICAL ARBITRAGE that
   is CROSSABLE RIGHT NOW. Every candidate is a leg-pair where
   holding 1 share of each token redeems for >= $1 in every state
   (see lib/arb-logical.js). We then judge tradeability the only
   honest way: pull both legs' REAL order books and walk the ask
   depth with buyCost() for a shared clip. A pair counts as an
   executable arb ONLY if, for some test clip, BOTH legs fully
   fill (exhausted=false) and the combined VWAP cost < the
   guaranteed $1/share payoff -> locked net profit.

   No mid-price. No last-trade. No stale metadata for execution.

   Usage:
     node scripts/scan-logical-arb.js
     node scripts/scan-logical-arb.js --events 300 --clips 100,300,1000
   ============================================================ */

const {
  liveEvents, getBooks, buyCost,
} = require('../lib/orderbook');
const { buildCandidatePairs } = require('../lib/arb-logical');

/* --------- args --------- */
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const EVENT_LIMIT = Number(arg('events', 400));
const CLIPS = String(arg('clips', '100,300,1000')).split(',').map(Number).filter((x) => x > 0);
const MAX_CLIP = Math.max(...CLIPS);
const FETCH_CONC = Number(arg('conc', 6));
const PAYOUT = 1; // each leg-pair redeems for >= $1/share by construction

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* For a given pair + book map, find the LARGEST test clip (in shares) for
   which BOTH legs fully fill and combined cost < payoff. Returns the best
   executable result or null. We test the configured clip sizes (notional in
   $, converted to a share count via the cheap combined ask as a starting
   estimate) — but to keep it robust we treat each CLIP as a NUMBER OF SHARES,
   since a 2-leg lock buys 1 share of each per "unit" and pays $1/unit. A clip
   of N shares costs ~ N * (askL + askR) dollars and pays N * $1. */
function evalPair(pair, books) {
  const bL = books[pair.left.token];
  const bR = books[pair.right.token];
  if (!bL || !bR || !bL.asks.length || !bR.asks.length) return null;

  const bestComboAsk = bL.asks[0].price + bR.asks[0].price;
  // Quick reject: if even the top-of-book combined ask >= payoff, no clip can profit.
  if (bestComboAsk >= PAYOUT) {
    return { violation: false, bestComboAsk, edgeTop: PAYOUT - bestComboAsk };
  }

  // It crosses at top of book. Now find max executable shares across CLIPS.
  let best = null;
  for (const shares of CLIPS.slice().sort((a, b) => b - a)) { // largest first
    const fL = buyCost(bL, shares);
    const fR = buyCost(bR, shares);
    if (fL.exhausted || fR.exhausted) continue; // can't fill this clip on both legs
    const cost = fL.cost + fR.cost;
    const payoff = shares * PAYOUT;
    const net = payoff - cost;
    if (net > 0) {
      best = {
        violation: true,
        shares,
        notionalCost: cost,
        payoff,
        net,
        netPerShare: net / shares,
        avgL: fL.avgPrice, avgR: fR.avgPrice,
        comboVwap: cost / shares,
        bestComboAsk,
      };
      break; // largest profitable clip
    }
  }
  if (best) return best;
  return { violation: false, bestComboAsk, edgeTop: PAYOUT - bestComboAsk, crossesTop: true };
}

async function main() {
  const t0 = Date.now();
  console.log('=== LOGICAL-ARB LIVE SCAN ===');
  console.log(`fetching up to ${EVENT_LIMIT} live events (by 24h volume) ...`);
  const events = await liveEvents({ limit: EVENT_LIMIT });
  console.log(`got ${events.length} live events`);

  const { pairs, stats } = buildCandidatePairs(events);
  console.log(`tradeable markets: ${stats.tradeableMarkets}`);
  console.log(`candidate leg-pairs: ${pairs.length}  (nested=${stats.nested}, temporal=${stats.temporal}, mutex=${stats.mutex})`);

  if (!pairs.length) {
    console.log('no logically-linked candidate pairs found — nothing to test.');
    return;
  }

  // PREFILTER with cached metadata bestAsk to decide which books to fetch.
  // A pair can only cross if the combined metadata ask < ~1 (+ margin for the
  // fact that NO-ask ~ 1 - YES-bid, which metadata doesn't give directly, so we
  // are generous here and fetch any pair that is even plausibly crossable).
  // We collect the union of tokens we need books for.
  const tokenSet = new Set();
  for (const p of pairs) { tokenSet.add(p.left.token); tokenSet.add(p.right.token); }
  const tokens = [...tokenSet];
  console.log(`unique tokens to fetch books for: ${tokens.length}`);

  // Fetch books in batches with politeness.
  const books = {};
  const BATCH = 120;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const slice = tokens.slice(i, i + BATCH);
    const got = await getBooks(slice, { concurrency: FETCH_CONC });
    Object.assign(books, got);
    process.stdout.write(`\r  fetched ${Math.min(i + BATCH, tokens.length)}/${tokens.length} books ...`);
    if (i + BATCH < tokens.length) await sleep(150);
  }
  process.stdout.write('\n');

  // Evaluate every pair against real books.
  const executable = [];
  const crossingTopButThin = []; // crosses at best ask but can't fill a clip
  const violationSizes = [];     // edge at top-of-book for distribution (payoff - bestComboAsk)
  let scored = 0;
  for (const p of pairs) {
    const r = evalPair(p, books);
    if (!r) continue;
    scored++;
    // record the top-of-book edge for the distribution (can be negative)
    if (typeof r.bestComboAsk === 'number') violationSizes.push(PAYOUT - r.bestComboAsk);
    if (r.violation) executable.push({ p, r });
    else if (r.crossesTop) crossingTopButThin.push({ p, r });
  }

  // ---- report ----
  console.log('\n================= RESULTS =================');
  console.log(`chains (leg-pairs) scanned with live books: ${scored}`);
  console.log(`pairs crossing at TOP of book: ${executable.length + crossingTopButThin.length}`);
  console.log(`  of those, EXECUTABLE for >=1 test clip (both legs fill, net>0): ${executable.length}`);
  console.log(`  crossing-at-top but TOO THIN to fill any test clip: ${crossingTopButThin.length}`);

  // distribution of top-of-book edge (payoff - combined best ask), in cents/$1.
  if (violationSizes.length) {
    const cents = violationSizes.map((x) => x * 100).sort((a, b) => a - b);
    const pct = (q) => cents[Math.min(cents.length - 1, Math.floor(q * (cents.length - 1)))];
    const pos = cents.filter((c) => c > 0).length;
    console.log('\n-- distribution of TOP-OF-BOOK edge (payoff - combined best ask), cents per $1 --');
    console.log(`   n=${cents.length}  positive(crossing)=${pos} (${(100 * pos / cents.length).toFixed(2)}%)`);
    console.log(`   min=${cents[0].toFixed(2)}  p10=${pct(0.1).toFixed(2)}  p50=${pct(0.5).toFixed(2)}  p90=${pct(0.9).toFixed(2)}  p99=${pct(0.99).toFixed(2)}  max=${cents[cents.length - 1].toFixed(2)}`);
    // histogram buckets near 0
    const buckets = [[-Infinity, -5], [-5, -2], [-2, -0.5], [-0.5, 0], [0, 0.5], [0.5, 2], [2, 5], [5, Infinity]];
    console.log('   edge buckets (cents):');
    for (const [lo, hi] of buckets) {
      const n = cents.filter((c) => c > lo && c <= hi).length;
      const lbl = `${lo === -Infinity ? '-inf' : lo} .. ${hi === Infinity ? '+inf' : hi}`;
      console.log(`     ${lbl.padStart(14)} : ${n}`);
    }
  }

  if (executable.length) {
    console.log('\n============ EXECUTABLE ARBS (net profit > 0 at real fill size) ============');
    executable.sort((a, b) => b.r.net - a.r.net);
    for (const { p, r } of executable) {
      console.log('\n--------------------------------------------------');
      console.log(`TYPE : ${p.type}`);
      console.log(`EVENT: ${p.event}`);
      console.log(`WHY  : ${p.why}`);
      console.log(`LEG L: BUY ${p.left.side}  "${qof(p.left)}"`);
      console.log(`        token ${p.left.token.slice(0, 12)}...  top-ask ${fmtAsk(p.left.token)}`);
      console.log(`LEG R: BUY ${p.right.side} "${qof(p.right)}"`);
      console.log(`        token ${p.right.token.slice(0, 12)}...  top-ask ${fmtAsk(p.right.token)}`);
      console.log(`FILL : clip ${r.shares} shares  | combined VWAP ${(r.comboVwap * 100).toFixed(3)}c  (pays 100c)`);
      console.log(`COST : $${r.notionalCost.toFixed(2)}  ->  PAYOFF $${r.payoff.toFixed(2)}`);
      console.log(`NET  : $${r.net.toFixed(2)} locked  (${(r.netPerShare * 100).toFixed(3)} cents per $1 of payoff)`);
    }
  } else {
    console.log('\nNO executable logical-arb right now: zero leg-pairs fill a real test clip for net profit.');
  }

  // Show the closest near-misses (crossing top-of-book but too thin) for honesty.
  if (crossingTopButThin.length) {
    crossingTopButThin.sort((a, b) => (b.r.edgeTop) - (a.r.edgeTop));
    console.log('\n-- closest near-misses: cross at best ask but book too thin to fill min clip --');
    for (const { p, r } of crossingTopButThin.slice(0, 8)) {
      console.log(`   +${(r.edgeTop * 100).toFixed(2)}c top edge | ${p.type} | ${p.event} | ${shortWhy(p.why)}`);
    }
  }

  console.log(`\nscan done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  function fmtAsk(tok) {
    const b = books[tok];
    if (!b || !b.asks.length) return 'n/a';
    return `${(b.asks[0].price * 100).toFixed(1)}c x ${b.asks[0].size}`;
  }
}

function qof(leg) {
  const m = leg.m || {};
  return (m.groupItemTitle || m.question || '').slice(0, 70);
}
function shortWhy(w) { return String(w).slice(0, 80); }

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
