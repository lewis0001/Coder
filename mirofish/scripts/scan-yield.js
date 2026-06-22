'use strict';
/* ============================================================
   scripts/scan-yield.js — TWO PRACTICAL YIELD ANGLES (LIVE)
   ------------------------------------------------------------
   ANGLE A  HOLDING REWARDS  (holdingRewardsEnabled markets)
            Polymarket pays a fixed treasury subsidy on positions
            in eligible markets. We confirm the program rate, list
            the eligible markets, split fee-free vs fee-paying,
            and price the DIRECTIONALLY-RISKLESS hedged-hold play
            (buy 1 YES + 1 NO, earn 3.25%/yr on mid-value) net of
            the spread you cross + any taker fee, reporting the
            break-even holding days and net annual yield + capacity.

   ANGLE B  CONVERGENCE CARRY  (fee-free near-certain legs)
            Buy an executable favorite (YES ask in [0.90,0.995]) or
            a near-dead longshot's NO side (NO ask in [0.90,0.995]),
            hold to resolution for the gap to $1. Prints executable
            cost (book-walked VWAP), gap, days-to-resolution,
            annualized carry, the implied breakeven hit-rate, and an
            honest near-certainty / upset assessment.

   Usage:
     node scripts/scan-yield.js [--pages=N] [--clip=SHARES] [--top=N]
                                [--minDays=D] [--quick]
   Zero deps. Reuses lib/orderbook, lib/feefree, lib/yield only.
   ============================================================ */

const ob = require('../lib/orderbook');
const ff = require('../lib/feefree');
const yl = require('../lib/yield');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function arg(name, def) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!m) return process.argv.includes(`--${name}`) ? true : def;
  const v = m.split('=')[1];
  return /^-?\d+(\.\d+)?$/.test(v) ? +v : v;
}
const PAGES = +arg('pages', 1500);
const CLIP = +arg('clip', 500);          // shares per executable clip
const TOP = +arg('top', 20);
const MIN_DAYS = +arg('minDays', 0);     // ignore carry legs resolving sooner than this
const QUICK = !!arg('quick', false);     // smaller pages
const CONC = 5;

async function pmap(items, fn, conc) {
  const out = new Array(items.length); let i = 0;
  async function w() { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }
  await Promise.all(Array.from({ length: Math.min(conc, items.length || 1) }, w));
  return out;
}
const fmtUSD = (x) => '$' + Math.round(x).toLocaleString();
const pct = (x) => (x * 100).toFixed(2) + '%';
const cents = (x) => (x * 100).toFixed(1) + 'c';
const daysTo = (iso) => (Date.parse(iso) - Date.now()) / 86400000;

(async () => {
  const t0 = Date.now();
  const pages = QUICK ? 600 : PAGES;
  console.log('=== Polymarket YIELD scan — holding rewards + convergence carry (LIVE) ===');
  console.log(`pages=${pages} clip=${CLIP}sh top=${TOP} minDays=${MIN_DAYS} quick=${QUICK}\n`);

  /* ================= ANGLE A: HOLDING REWARDS ================= */
  console.log('############### ANGLE A — HOLDING REWARDS ###############\n');
  console.log(`Program rate (official, June 2026): HOLD_APR = ${pct(yl.HOLD_APR)} annualized on position MID-value,`);
  console.log('  sampled hourly, paid daily, BOTH Yes & No holders earn, funded from Polymarket Treasury.');
  console.log('  The public API exposes only the boolean eligibility flag (holdingRewardsEnabled); there is');
  console.log('  no per-market holding rate — clobRewards.rewardsDailyRate is the MAKER pool, a different program.\n');

  process.stdout.write('Stage A1: pulling holdingRewardsEnabled universe ... ');
  const { scanned, markets: hold } = await yl.holdingUniverse({ pages });
  console.log(`scanned ${scanned} live markets; ${hold.length} have holdingRewardsEnabled.`);

  // group by parent event, split fee-free vs fee-paying
  const byEvent = new Map();
  for (const m of hold) {
    const ev = (m.events || [])[0] || {};
    const key = ev.title || '(standalone)';
    if (!byEvent.has(key)) byEvent.set(key, { legs: [], liq: 0, free: 0, paid: 0 });
    const g = byEvent.get(key);
    g.legs.push(m); g.liq += (+m.liquidityNum || 0);
    (m.feesEnabled === false ? g.free++ : g.paid++);
  }
  const eventRows = [...byEvent.entries()]
    .map(([title, g]) => ({ title, ...g }))
    .sort((a, b) => b.liq - a.liq);

  console.log('\nEligible holding-reward fields (by liquidity):');
  console.log('  EVENT                                          legs  feeFree  liquidity      gross hold yield');
  for (const r of eventRows.slice(0, 14)) {
    console.log('  ' + r.title.slice(0, 44).padEnd(44) +
      String(r.legs.length).padStart(5) +
      String(r.free + '/' + r.legs.length).padStart(9) +
      fmtUSD(r.liq).padStart(14) +
      ('   ' + pct(yl.HOLD_APR) + '/yr').padStart(12));
  }

  const feeFreeHold = hold.filter((m) => m.feesEnabled === false);
  const feePaidHold = hold.filter((m) => m.feesEnabled !== false);
  console.log(`\nFee split: ${feeFreeHold.length} FEE-FREE eligible markets, ${feePaidHold.length} fee-paying.`);
  console.log('  On a FEE-PAYING market a hedged-hold entry pays a one-time taker fee (3-7%) that takes');
  console.log(`  YEARS of ${pct(yl.HOLD_APR)}/yr subsidy to earn back — so the clean risk-free hold lives on the`);
  console.log('  FEE-FREE eligible markets (mostly far-dated geopolitics: Putin/Xi/Zelenskyy/Taiwan).\n');

  // Book-verify the hedged-hold play on fee-free eligible Yes/No markets
  const ffHoldYN = feeFreeHold
    .map((m) => ({ m, toks: ff.yesNoTokens(m) }))
    .filter((x) => x.toks && ff.isTradeable(x.m) && !ff.isExpired(x.m));
  console.log(`Stage A2: book-verifying hedged-hold economics on ${ffHoldYN.length} fee-free eligible Yes/No markets (clip=${CLIP}sh)...`);
  const holdEcon = await pmap(ffHoldYN, async (x) => {
    try {
      const by = await ob.getBook(x.toks.yes);
      const bn = await ob.getBook(x.toks.no);
      const e = yl.hedgedHoldEconomics(by, bn, x.m, { shares: CLIP });
      if (!e) return null;
      // capacity: depth (shares) you can build the hedged set with at <=1c slippage,
      // min of the two sides; capital = shares * setPrice.
      const capShares = Math.min(ob.depthWithin(by, 'buy', 0.01), ob.depthWithin(bn, 'buy', 0.01));
      return { m: x.m, e, by, bn, capShares };
    } catch { return null; }
  }, CONC);

  const holdGood = holdEcon.filter((r) => r && r.e && r.e.entryCost != null);
  // rank by FASTEST payback (lowest breakeven days) — the cleanest risk-free carry
  holdGood.sort((a, b) => (a.e.breakevenDays) - (b.e.breakevenDays));
  console.log(`  ${holdGood.length} have a two-sided, buildable hedged set.\n`);
  console.log('=== ANGLE A RESULT — risk-free HEDGED-HOLD (buy 1 YES + 1 NO, earn 3.25%/yr on mid) ===\n');
  for (const r of holdGood.slice(0, 12)) {
    const e = r.e;
    const days = daysTo(r.m.endDate);
    const netYr = e.crossCost > 0 ? null : yl.HOLD_APR; // if you cross cost, see breakevenDays
    const capUSD = r.capShares * e.setPrice;
    console.log('* ' + String(r.m.question).slice(0, 60));
    console.log(`    set cost=${e.setPrice.toFixed(4)} (cross ${cents(e.crossCost)} over $1)  midValue=${e.midSet.toFixed(4)}  feeFree  daysToRes=${days.toFixed(0)}`);
    console.log(`    subsidy=${'$' + e.dailySubsidy.toFixed(4)}/day per set  ->  break-even in ${e.breakevenDays.toFixed(0)} days of holding`);
    const verdict = e.breakevenDays <= days
      ? `PROFITABLE: subsidy repays the ${cents(e.crossCost)} entry in ${e.breakevenDays.toFixed(0)}d < ${days.toFixed(0)}d to resolution; net ~${pct(yl.HOLD_APR * (1 - e.breakevenDays / Math.max(days,1)))}/yr after entry`
      : `NOT worth it: entry cross ${cents(e.crossCost)} needs ${e.breakevenDays.toFixed(0)}d but only ${days.toFixed(0)}d left`;
    console.log(`    capacity ~${fmtUSD(capUSD)} buildable at <=1c slip   => ${verdict}`);
    console.log('');
  }
  // portfolio note
  const profitableHold = holdGood.filter((r) => r.e.breakevenDays <= daysTo(r.m.endDate));
  const holdCap = profitableHold.reduce((s, r) => s + r.capShares * r.e.setPrice, 0);
  console.log(`Angle A summary: ${profitableHold.length}/${holdGood.length} fee-free eligible markets give a NET-POSITIVE risk-free hold`);
  console.log(`  (subsidy repays the entry spread before resolution). Aggregate buildable capacity ~${fmtUSD(holdCap)}.`);
  console.log(`  Ceiling on the risk-free hold yield is the program rate itself: ${pct(yl.HOLD_APR)}/yr, minus the one-time entry spread.\n`);

  /* ================= ANGLE B: CONVERGENCE CARRY ================= */
  console.log('############### ANGLE B — CONVERGENCE CARRY ###############\n');
  process.stdout.write('Stage B1: building FEE-FREE universe ... ');
  const uni = await ff.buildFeeFreeUniverse({ marketLimit: pages, eventLimit: 200, pageSleep: 80 });
  console.log(`${uni.allCount} live markets; ${uni.markets.length} verified fee-free, tradeable, not expired.`);

  // Candidate legs: favorites (buy YES) and longshots (buy NO), screened on Gamma quote first.
  const legs = [];
  for (const m of uni.markets) {
    const toks = ff.yesNoTokens(m);
    if (!toks) continue;
    const days = daysTo(m.endDate);
    if (!(days > MIN_DAYS)) continue;
    const ba = m.bestAsk != null ? +m.bestAsk : null;   // YES gamma ask
    const bb = m.bestBid != null ? +m.bestBid : null;
    // favorite: YES ask in [0.90,0.995] -> buy YES
    if (ba != null && ba >= 0.90 && ba <= 0.995) legs.push({ m, token: toks.yes, side: 'YES', days });
    // longshot YES in [0.005,0.10] -> the favorite is "NO"; buy NO token (its ask ~ 1-yesBid)
    if (bb != null && bb >= 0.005 && bb <= 0.10 || (ba != null && ba >= 0.005 && ba <= 0.10))
      legs.push({ m, token: toks.no, side: 'NO', days });
  }
  // de-dup (a market can't be both)
  const seen = new Set();
  const cand = legs.filter((l) => { const k = l.m.id + l.side; if (seen.has(k)) return false; seen.add(k); return true; });
  console.log(`Stage B2: book-verifying ${cand.length} candidate legs (executable ask + ${CLIP}-share depth)...`);

  const carried = await pmap(cand, async (l) => {
    try {
      const book = await ob.getBook(l.token);
      const econ = yl.carryEconomics(book, CLIP, l.days);
      const depth1c = ob.depthWithin(book, 'buy', 0.01);
      return { ...l, book, econ, depth1c };
    } catch { return { ...l, econ: { fillable: false } }; }
  }, CONC);

  const fillable = carried.filter((r) => r.econ && r.econ.fillable && r.econ.cost >= 0.90 && r.econ.cost <= 0.995);
  console.log(`  ${fillable.length} legs have an executable ask in [0.90,0.995] and fill ${CLIP} shares.\n`);

  // The honest split. The market-implied upset prob == the gap. A high annualized
  // carry comes MECHANICALLY from a big gap == a big implied upset == NOT near-certain.
  // So we DON'T just rank by annualized; we triage by how near-certain the market itself
  // prices the leg, and surface each tier separately.
  const TIER = (g) =>            // g = gap (implied upset)
    g <= 0.01 ? 'near-certain'   // <=1% implied upset
    : g <= 0.03 ? 'strong-fav'   // 1-3%
    : g <= 0.06 ? 'fav'          // 3-6%
    : 'coin-ish';                // >6% : this is NOT a sure thing, it's priced risk
  const printRow = (r) => {
    const e = r.econ;
    const capUSD = r.depth1c * e.cost;
    console.log('  ' + r.side.padEnd(4) +
      ' ' + cents(e.cost).padStart(6) +
      ' ' + cents(e.gap).padStart(5) +
      ' ' + r.days.toFixed(0).padStart(5) +
      ' ' + ((e.annualized * 100).toFixed(0) + '%/yr').padStart(11) +
      ' ' + (pct(e.breakevenP)).padStart(8) +
      ' ' + TIER(e.gap).padStart(12) +
      ' ' + fmtUSD(capUSD).padStart(10) +
      '  ' + String(r.m.question).slice(0, 38));
  };

  // (1) GENUINE near-certainties: implied upset <= 3% (gap <= 3c). These are the legs
  //     where the carry is a true convergence to $1, not a disguised bet. Rank by annualized.
  const sure = fillable.filter((r) => r.econ.gap <= 0.03).sort((a, b) => b.econ.annualized - a.econ.annualized);
  console.log('=== ANGLE B — TIER 1: GENUINE NEAR-CERTAINTIES (market-implied upset <= 3%) ===');
  console.log('  side  cost   gap    days   annualized  breakBE  certainty   capacity@1c  question');
  for (const r of sure.slice(0, TOP)) printRow(r);
  if (!sure.length) console.log('  (none right now)');

  // (2) Higher-carry but PRICED-RISK legs (gap > 3%): bigger annualized, but you ARE taking
  //     a real position. Show so the reader sees the carry/risk tradeoff honestly.
  const risky = fillable.filter((r) => r.econ.gap > 0.03).sort((a, b) => b.econ.annualized - a.econ.annualized);
  console.log('\n=== ANGLE B — TIER 2: HIGH-CARRY but PRICED RISK (implied upset 3-10%, NOT a sure thing) ===');
  console.log('  side  cost   gap    days   annualized  breakBE  certainty   capacity@1c  question');
  for (const r of risky.slice(0, 12)) printRow(r);
  if (!risky.length) console.log('  (none)');

  // Honest near-certainty triage: split far-dated structural vs near-term coin-flips.
  console.log('\n--- honesty check: near-certainty vs upset risk ---');
  const structural = fillable.filter((r) => r.days >= 90);   // far-dated structural
  const nearTerm = fillable.filter((r) => r.days < 90);
  const meanBE = (arr) => arr.length ? arr.reduce((s, r) => s + r.econ.breakevenP, 0) / arr.length : 0;
  console.log(`  ${structural.length} far-dated (>=90d) legs: implied upset must exceed ${pct(1 - meanBE(structural))} on avg to lose.`);
  console.log(`  ${nearTerm.length} near-term (<90d) legs: huge annualized carry only because the horizon is short; the upset`);
  console.log('    (a war/regime/ceasefire headline) is a fat tail, and many of these Iran/Israel legs are CORRELATED');
  console.log('    — one regional headline moves them together, so they are NOT independent diversification.');
  // Cleanest = far-dated AND genuinely near-certain (low implied upset), not merely high-annualized.
  const cleanStruct = structural.filter((r) => r.econ.gap <= 0.03)
    .sort((a, b) => b.econ.annualized - a.econ.annualized)[0];
  if (cleanStruct) {
    const e = cleanStruct.econ;
    console.log(`  Cleanest STRUCTURAL near-certainty (far-dated + <=3% implied upset):`);
    console.log(`    "${cleanStruct.m.question.slice(0,52)}" ${cleanStruct.side} @ ${cents(e.cost)}, ${pct(e.annualized)}/yr,`);
    console.log(`    you lose only if the ${pct(e.impliedUpset)}-implied upset actually happens within ${cleanStruct.days.toFixed(0)} days.`);
  } else {
    console.log('  No far-dated leg is also <=3% implied upset right now — every clean near-certainty is short-dated.');
  }
  const sureCap = sure.reduce((s, r) => s + r.depth1c * r.econ.cost, 0);
  const allCap = fillable.reduce((s, r) => s + r.depth1c * r.econ.cost, 0);
  console.log(`\nAngle B summary: ${fillable.length} fillable fee-free carry legs (${sure.length} genuine near-certainties at <=3% implied upset).`);
  console.log(`  Buildable capacity at <=1c slip: ~${fmtUSD(sureCap)} across the near-certain tier, ~${fmtUSD(allCap)} across all legs.`);
  console.log(`  The carry is REAL and net-positive (fee-free => the gap is pure profit if it converges), but it is`);
  console.log('  short-vol: you are SELLING THE TAIL. The annualized headline is huge only because the horizon is');
  console.log('  short; one upset wipes out many wins. Diversify across uncorrelated subjects and size by the upset odds.');

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s.`);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
