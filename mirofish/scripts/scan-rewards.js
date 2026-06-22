'use strict';
/* ============================================================
   scripts/scan-rewards.js — IS LIQUIDITY-REWARDS FARMING PROFITABLE?
   ------------------------------------------------------------
   Ranks live Polymarket reward markets by NET daily yield on capital:

       NET %/day  =  reward_yield %/day  -  adverse_selection_cost %/day

   STAGE 1  Build the reward universe (lib/rewards) — pool, maxSpread, minSize.
   STAGE 2  Pull live books, compute reward yield from band depth.
   STAGE 3  Sample mid over a short LIVE window per candidate to measure
            volatility (adverse-selection proxy) and net it out.

   ----- THE MODEL (all assumptions explicit) -----
   You quote a chosen size S (>= minSize) on BOTH sides, resting near the mid.
     capital deployed C       = S*bidYes + S*bidNo  (USD tied up in two bids)
                              ~= S  (since bidYes + bidNo ~= 1)
     your qualifying size Q   = 2*S  (both sides count)
     band depth D             = depthWithin(asks,maxSpread)+depthWithin(bids,maxSpread)
                                (other makers already in the band; we ADD ourselves)
     your reward share        = Q / (D + Q)
     daily reward R           = pool * share
     reward yield %/day       = 100 * R / C

   ADVERSE SELECTION (inventory cost): a resting maker is picked off when the
   mid drifts through his quote. Over a day the mid has stdev sigma_day (in
   price units, $) estimated from the live sample (per-minute sigma scaled by
   sqrt(minutes/day)). A two-sided maker who keeps requoting at the mid turns
   over inventory and on average eats roughly the realized one-way move each
   time he is run over. We charge, per day, an adverse cost proportional to
   the daily move applied to the capital that gets adversely filled:
       adverse $/day  ~=  k * sigma_day * S
   with k a fill-frequency factor (~ how many adverse round-trips/day). We use
   k=1 as a conservative central estimate (mid travels ~1 daily-sigma of
   adverse distance against the resting size per day) and also report a
   pessimistic k=2. Maker rebate (no taker fee + 25% fee rebate) is a small
   positive we fold in as zero-cost (fees are already ~0 on these books).
       adverse yield %/day = 100 * adverse$/day / C
   This is a PROXY, deliberately simple and transparent; volatility ranking is
   the load-bearing signal, not the absolute constant.

   Usage:
     node scripts/scan-rewards.js [--top=N] [--samples=M] [--interval=SEC]
                                  [--size=S] [--minpool=USD] [--quick]
   Zero dependencies.
   ============================================================ */
const ob = require('../lib/orderbook');
const rw = require('../lib/rewards');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function arg(name, def) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!m) return process.argv.includes(`--${name}`) ? true : def;
  const v = m.split('=')[1];
  return /^-?\d+(\.\d+)?$/.test(v) ? +v : v;
}

const TOP = +arg('top', 15);
const SAMPLES = +arg('samples', 12);            // book snapshots per market
const INTERVAL = +arg('interval', 5);           // seconds between snapshots
const SIZE_ARG = arg('size', null);             // override quote size; else minSize
const MINPOOL = +arg('minpool', 5);             // ignore dust pools (USD/day)
const QUICK = !!arg('quick', false);            // skip live vol sampling (yield-only)
const CONCURRENCY = 5;                          // polite

/* ---- map a reward market to its YES token's live book + reward yield ---- */
function yesIndex(outcomes) {
  if (!Array.isArray(outcomes)) return 0;
  const i = outcomes.map((s) => String(s).toLowerCase()).indexOf('yes');
  return i < 0 ? 0 : i;
}

/* reward yield from a single live book snapshot of YES + NO sides */
function rewardYield(p, bookYes, bookNo, sizeShares) {
  const mid = bookYes.mid;
  if (mid == null) return null;
  const dS = p.maxSpreadDollars;
  // qualifying band depth already resting (both books, both sides relevant):
  // a maker quotes a YES bid and a NO bid (= YES ask synthetically). The
  // reward band is symmetric around mid; approximate competing depth as the
  // depth within maxSpread on the YES book's bid + ask sides.
  const depthBid = ob.depthWithin(bookYes, 'sell', dS); // resting YES bids near mid
  const depthAsk = ob.depthWithin(bookYes, 'buy', dS);  // resting YES asks near mid
  const bandDepth = depthBid + depthAsk;                // competing qualifying shares
  const myQ = 2 * sizeShares;                           // you on both sides
  const share = myQ / (bandDepth + myQ);
  const dailyReward = p.pool * share;                   // USD/day
  // capital: two resting bids (YES bid ~ mid, NO bid ~ 1-mid) => ~ size USD
  const bidYes = bookYes.bestBid != null ? bookYes.bestBid : mid;
  const bidNo = bookNo && bookNo.bestBid != null ? bookNo.bestBid : (1 - mid);
  const capital = sizeShares * bidYes + sizeShares * bidNo; // USD deployed
  return { mid, bandDepth, share, dailyReward, capital,
           yieldPctDay: capital > 0 ? 100 * dailyReward / capital : 0 };
}

/* ---- run a small concurrency pool over async tasks ---- */
async function pmap(items, fn, conc) {
  const out = new Array(items.length);
  let i = 0;
  async function w() { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, w));
  return out;
}

(async () => {
  const t0 = Date.now();
  console.log('=== Polymarket LIQUIDITY-REWARDS farming scan ===');
  console.log(`top=${TOP} samples=${SAMPLES} interval=${INTERVAL}s size=${SIZE_ARG || 'minSize'} minpool=$${MINPOOL}/day quick=${QUICK}\n`);

  // ---- STAGE 1: universe ----
  process.stdout.write('Stage 1: building reward universe from Gamma ... ');
  const { scanned, markets } = await rw.rewardUniverse({ pages: 1500 });
  const universe = markets.filter((p) => p.pool >= MINPOOL);
  console.log(`scanned ${scanned} live markets; ${markets.length} pay rewards; ${universe.length} with pool >= $${MINPOOL}/day.`);
  const totalPool = universe.reduce((s, p) => s + p.pool, 0);
  console.log(`Total daily reward pool across these markets: $${totalPool.toFixed(0)}/day (~$${(totalPool * 365 / 1000).toFixed(0)}k/yr).\n`);

  if (!universe.length) { console.log('No reward markets found. Done.'); return; }

  // Cross-check the single biggest pool against CLOB to prove the source.
  const biggest = universe.slice().sort((a, b) => b.pool - a.pool)[0];
  const xc = await rw.clobRewardCheck(biggest.conditionId);
  if (xc) {
    console.log(`Source check (biggest pool, "${biggest.question.slice(0, 40)}"):`);
    console.log(`  Gamma rewardsDailyRate=$${biggest.pool}/day  minSize=${biggest.minSize}  maxSpread=${biggest.maxSpreadCents}c`);
    console.log(`  CLOB  rewards.rate    =$${xc.clobPool}/day  min_size=${xc.minSize}  max_spread=${xc.maxSpread}c  ${xc.clobPool === biggest.pool ? '[MATCH]' : '[DIFF]'}\n`);
  }

  // ---- STAGE 2: live books + reward yield (one snapshot) ----
  // Pre-rank by a cheap heuristic (pool/minSize) to limit how many we sample live.
  universe.sort((a, b) => (b.pool / Math.max(1, b.minSize)) - (a.pool / Math.max(1, a.minSize)));
  const CANDN = QUICK ? universe.length : Math.min(universe.length, Math.max(TOP * 3, 40));
  const cands = universe.slice(0, CANDN);
  console.log(`Stage 2: pulling live books for ${cands.length} candidates ...`);

  const snap0 = await pmap(cands, async (p) => {
    const yi = yesIndex(p.outcomes);
    try {
      const by = await ob.getBook(p.tokenIds[yi]);
      const bn = await ob.getBook(p.tokenIds[1 - yi]);
      const size = SIZE_ARG ? Math.max(+SIZE_ARG, p.minSize) : p.minSize;
      const ry = rewardYield(p, by, bn, size);
      return { p, by, bn, size, ry, mid0: by.mid };
    } catch { return { p, ry: null }; }
  }, CONCURRENCY);

  let live = snap0.filter((x) => x.ry && x.ry.mid != null && x.mid0 != null && x.mid0 > 0.001 && x.mid0 < 0.999);
  console.log(`  ${live.length} candidates have a live, two-sided book.\n`);
  // keep the most promising for the expensive live-vol pass
  live.sort((a, b) => b.ry.yieldPctDay - a.ry.yieldPctDay);
  const SAMPLEN = QUICK ? 0 : Math.min(live.length, Math.max(TOP * 2, 25));
  const sampled = live.slice(0, SAMPLEN);

  // ---- STAGE 3: live volatility sampling (adverse-selection proxy) ----
  if (!QUICK && sampled.length) {
    console.log(`Stage 3: sampling mid for ${sampled.length} markets over ${SAMPLES} snaps x ${INTERVAL}s (~${Math.round(SAMPLES * INTERVAL / 60)} min live) ...`);
    // init series with snapshot 0
    for (const x of sampled) x.mids = [x.mid0];
    for (let s = 1; s < SAMPLES; s++) {
      await sleep(INTERVAL * 1000);
      await pmap(sampled, async (x) => {
        try {
          const yi = yesIndex(x.p.outcomes);
          const by = await ob.getBook(x.p.tokenIds[yi]);
          if (by.mid != null) x.mids.push(by.mid);
        } catch { /* skip this tick */ }
      }, CONCURRENCY);
      process.stdout.write(`  snap ${s + 1}/${SAMPLES}\r`);
    }
    console.log('\n');
    // compute per-minute sigma of mid changes
    const dtMin = INTERVAL / 60;
    for (const x of sampled) {
      const m = x.mids;
      const rets = [];
      for (let i = 1; i < m.length; i++) rets.push(m[i] - m[i - 1]); // $ change per interval
      const mean = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
      const varr = rets.length > 1 ? rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1) : 0;
      const sigmaPerInterval = Math.sqrt(varr);
      x.sigmaPerMin = sigmaPerInterval / Math.sqrt(dtMin);     // $/min^0.5 -> per-min sigma
      x.sigmaDay = x.sigmaPerMin * Math.sqrt(1440);            // daily sigma in $ (price units)
      x.midDrift = m.length ? (m[m.length - 1] - m[0]) : 0;    // net mid move over window
      x.midRange = m.length ? (Math.max(...m) - Math.min(...m)) : 0;
    }
  }

  // ---- net yield + ranking ----
  const rows = (QUICK ? live : sampled).map((x) => {
    const ry = x.ry;
    const cap = ry.capital;
    // adverse cost: k * sigmaDay * size  (USD/day), central k=1, pessimistic k=2
    const sigmaDay = x.sigmaDay != null ? x.sigmaDay : null;
    const advUSD1 = sigmaDay != null ? 1 * sigmaDay * x.size : null;
    const advUSD2 = sigmaDay != null ? 2 * sigmaDay * x.size : null;
    const advPct1 = advUSD1 != null && cap > 0 ? 100 * advUSD1 / cap : null;
    const advPct2 = advUSD2 != null && cap > 0 ? 100 * advUSD2 / cap : null;
    const netPct1 = advPct1 != null ? ry.yieldPctDay - advPct1 : null;
    const netPct2 = advPct2 != null ? ry.yieldPctDay - advPct2 : null;
    // capacity: how much capital you can deploy before your share dilutes the
    // yield below ~half. Solve share so myQ ~ bandDepth (you = half the band).
    // capacity size ~ bandDepth/2 shares; capacity capital ~ that * mid.
    const capacityShares = x.ry.bandDepth / 2;
    const capacityUSD = capacityShares * (ry.mid);
    return {
      q: x.p.question, slug: x.p.slug, pool: x.p.pool,
      maxSpread: x.p.maxSpreadCents, minSize: x.p.minSize, size: x.size,
      mid: ry.mid, bandDepth: x.ry.bandDepth, share: ry.share,
      dailyReward: ry.dailyReward, capital: cap, yieldPct: ry.yieldPctDay,
      sigmaDay, advPct1, advPct2, netPct1, netPct2,
      midDrift: x.midDrift, midRange: x.midRange, capacityUSD,
      vol24: x.p.vol24,
    };
  });

  // rank by central net yield (fallback to gross yield in quick mode)
  rows.sort((a, b) => {
    const an = a.netPct1 != null ? a.netPct1 : a.yieldPct;
    const bn = b.netPct1 != null ? b.netPct1 : b.yieldPct;
    return bn - an;
  });

  console.log('=== TOP FARMABLE MARKETS (ranked by NET daily yield on capital) ===\n');
  const show = rows.slice(0, TOP);
  for (let i = 0; i < show.length; i++) {
    const r = show[i];
    console.log(`#${i + 1}  ${r.q.slice(0, 62)}`);
    console.log(`     pool=$${r.pool}/day  maxSpread=${r.maxSpread}c  minSize=${r.minSize}  yourSize=${r.size}sh  mid=${(r.mid * 100).toFixed(1)}c`);
    console.log(`     bandDepth=${Math.round(r.bandDepth).toLocaleString()}sh  yourShare=${(r.share * 100).toFixed(2)}%  estReward=$${r.dailyReward.toFixed(2)}/day  capital=$${r.capital.toFixed(0)}`);
    const gy = r.yieldPct;
    if (r.sigmaDay != null) {
      console.log(`     GROSS yield=${gy.toFixed(2)}%/day (${(gy * 365).toFixed(0)}%/yr)  |  mid sigma=${(r.sigmaDay * 100).toFixed(2)}c/day  drift=${(r.midDrift * 100).toFixed(2)}c  range=${(r.midRange * 100).toFixed(2)}c`);
      console.log(`     adverse cost=${r.advPct1.toFixed(2)}%/day (k1) .. ${r.advPct2.toFixed(2)}%/day (k2)`);
      console.log(`     >>> NET yield = ${r.netPct1.toFixed(2)}%/day (k1)  /  ${r.netPct2.toFixed(2)}%/day (k2)   [${(r.netPct1 * 365).toFixed(0)}%/yr central]`);
    } else {
      console.log(`     GROSS yield=${gy.toFixed(2)}%/day (${(gy * 365).toFixed(0)}%/yr)  [no vol sample]`);
    }
    console.log(`     capacity ~$${Math.round(r.capacityUSD).toLocaleString()} before yield halves   vol24h=$${Math.round(r.vol24).toLocaleString()}\n`);
  }

  // ---- portfolio-level summary ----
  const net = show.filter((r) => r.netPct1 != null);
  if (net.length) {
    const profitable = net.filter((r) => r.netPct1 > 0);
    const avgNet = net.reduce((s, r) => s + r.netPct1, 0) / net.length;
    const bestN = net.slice().sort((a, b) => b.netPct1 - a.netPct1).slice(0, 5);
    const avgTop5 = bestN.reduce((s, r) => s + r.netPct1, 0) / bestN.length;
    console.log('=== SUMMARY ===');
    console.log(`Markets sampled live: ${net.length}.  Net-POSITIVE (k=1): ${profitable.length}/${net.length}.`);
    console.log(`Mean NET yield (k=1) across top ${net.length}: ${avgNet.toFixed(2)}%/day (${(avgNet * 365).toFixed(0)}%/yr).`);
    console.log(`Mean NET yield of best 5: ${avgTop5.toFixed(2)}%/day (${(avgTop5 * 365).toFixed(0)}%/yr).`);
    const totCap = bestN.reduce((s, r) => s + r.capacityUSD, 0);
    console.log(`Aggregate capacity of best 5: ~$${Math.round(totCap).toLocaleString()} deployable.`);
  }
  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s.`);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
