'use strict';
/* ============================================================
   scripts/scan-hf.js — HIGH-FREQUENCY positive-edge opportunity board.
   ------------------------------------------------------------
   "Do more" only wins when per-cycle edge > 0. Directional 5-min BTC is
   a coin flip that bleeds the 7% fee, so it's excluded. Instead this finds
   the FASTEST-REFRESHING POSITIVE-edge cycles and ranks them by EFFECTIVE
   yield = per-cycle edge × cycles/day (short resolution => more turnover):

     A) SHORT-DATED REWARD FARMS — markets that pay maker rewards AND resolve
        soon (near-resolved => low adverse selection, you mostly just collect
        the pool, then redeploy when it settles).
     B) SHORT-DATED CARRY — fee-free near-certain legs resolving soon; the
        gap to $1 is profit, annualized high BECAUSE the horizon is short.

   Honest: carry SELLS tail risk (sized by implied upset); reward yield
   dilutes with band competition; both are real and positive, unlike
   directional scalping. Run: node scripts/scan-hf.js [--clip=500] [--hours=48]
   ============================================================ */
const { liveMarkets, getBook, buyCost, depthWithin, parseJSON } = require('../lib/orderbook');

function arg(n, d) { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? Number(h.split('=')[1]) : d; }
const CLIP = arg('clip', 500);
const MAXH = arg('hours', 48);
const f = (x, d = 2) => (x == null ? 'n/a' : Number(x).toFixed(d));

function rewardPool(m) {
  const cr = m.clobRewards;
  if (!Array.isArray(cr)) return 0;
  return cr.reduce((a, r) => a + Number(r.rewardsDailyRate || 0), 0);
}

async function main() {
  const now = Date.now();
  console.log(`\nHIGH-FREQUENCY opportunity board  (clip $${CLIP}, horizon <= ${MAXH}h)\n`);
  const ms = await liveMarkets({ limit: 600 });

  // short-dated universe with a live two-sided book
  const short = [];
  for (const m of ms) {
    const end = m.endDate ? new Date(m.endDate).getTime() : null;
    if (!end) continue;
    const hrs = (end - now) / 3600000;
    if (hrs <= 0.1 || hrs > MAXH) continue;
    const bid = Number(m.bestBid), ask = Number(m.bestAsk);
    if (!(bid > 0 && ask > 0 && ask < 1)) continue;
    const toks = parseJSON(m.clobTokenIds, []);
    if (toks.length < 2) continue;
    short.push({ m, hrs, bid, ask, mid: (bid + ask) / 2, yes: toks[0], no: toks[1],
      feeFree: m.feesEnabled === false, pool: rewardPool(m),
      maxSpread: Number(m.rewardsMaxSpread || 0), vol: Number(m.volume24hr || 0) });
  }
  console.log(`${short.length} short-dated markets with a live book.\n`);

  /* ---- A) short-dated reward farms ---- */
  const farms = short.filter((s) => s.pool >= 20).sort((a, b) => b.pool - a.pool).slice(0, 14);
  const farmRows = [];
  for (const s of farms) {
    let book; try { book = await getBook(s.yes); } catch { continue; }
    if (!book.bestBid) continue;
    const bandShares = depthWithin(book, 'buy', (s.maxSpread || 3) / 100) || 1;
    const clipShares = CLIP / (s.mid || 0.5);
    const myShare = clipShares / (bandShares + clipShares);
    const dailyReward = s.pool * myShare;            // $/day while quoting
    const yieldPerDay = dailyReward / CLIP;          // on deployed capital (GROSS of adverse sel.)
    // stable = mid pinned near 0/1 => few fills => low adverse selection.
    // A ~50¢ index Up/Down is NOT stable: its mid tracks the underlying, so a
    // resting maker gets run over and the reward is eaten (net-check required).
    const stable = Math.min(s.mid, 1 - s.mid) < 0.15;
    farmRows.push({ q: s.m.question, hrs: s.hrs, pool: s.pool, maxSpread: s.maxSpread,
      yieldPerDay, bandShares, stable, vol: s.vol });
  }
  // prefer STABLE-mid farms (net-positive) over volatile ones (reward eaten)
  farmRows.sort((a, b) => (b.stable - a.stable) || (b.yieldPerDay - a.yieldPerDay));
  console.log('A) SHORT-DATED REWARD FARMS  (collect pool, redeploy on settle)');
  console.log('   gross/day  resolves  pool/day  maxSpr  adverse-sel  market');
  for (const r of farmRows.slice(0, 10)) {
    console.log(`   ${(r.yieldPerDay * 100).toFixed(2).padStart(6)}%/d  ${f(r.hrs, 1).padStart(5)}h  $${String(Math.round(r.pool)).padStart(5)}  ${f(r.maxSpread, 1)}¢  ${r.stable ? 'LOW (farm) ' : 'HIGH (skip)'}  ${r.q.slice(0, 40)}`);
  }
  if (!farmRows.length) console.log('   (none with a pool >= $20/day in the short-dated set right now)');
  console.log('   * gross/day is reward only; LOW-adverse (pinned-mid) farms are net-positive,');
  console.log('     HIGH-adverse (~50¢ index Up/Down) get run over — net-check with scan-rewards.js.');

  /* ---- B) short-dated carry: FEE-FREE and genuinely near-certain only ----
     A short-horizon high-annualized number on a fee-paid market is just
     selling a fat tail at ~fair odds, then losing the fee (negative EV). Real
     carry requires fee-free AND deep certainty (entry >= 95¢, upset <= 5%). */
  const carryCands = short.filter((s) => s.feeFree && (s.mid >= 0.95 || s.mid <= 0.05)).sort((a, b) => a.hrs - b.hrs).slice(0, 30);
  const carryRows = [];
  for (const s of carryCands) {
    // buy the near-certain side: YES if mid high, NO if mid low
    const buyYes = s.mid >= 0.5;
    const token = buyYes ? s.yes : s.no;
    let book; try { book = await getBook(token); } catch { continue; }
    const fill = buyCost(book, CLIP / (book.bestAsk || 0.95));
    if (!fill.avgPrice || fill.exhausted) continue;
    const entry = fill.avgPrice;                       // executable cost of the near-certain side
    if (entry <= 0 || entry >= 1) continue;
    const fee = s.feeFree ? 0 : 0.05 * Math.min(entry, 1 - entry);
    const allIn = entry + fee;
    const gap = 1 - allIn;                              // profit if it converges to $1
    if (gap <= 0) continue;
    const annual = (gap / allIn) * (8760 / s.hrs);     // annualized carry
    const impliedUpset = 1 - entry;                    // market's odds it's wrong
    carryRows.push({ q: s.m.question, side: buyYes ? 'YES' : 'NO', hrs: s.hrs, entry: allIn, gap,
      annual, impliedUpset, feeFree: s.feeFree, cap: Math.round(fill.filled * entry) });
  }
  carryRows.sort((a, b) => b.annual - a.annual);
  console.log('\nB) SHORT-DATED CARRY  (near-certain side, gap to $1; you sell the tail)');
  console.log('   annual%  resolves  side  entry  gap   upset  fee-free  cap   market');
  for (const r of carryRows.slice(0, 12)) {
    console.log(`   ${String(Math.round(r.annual * 100)).padStart(5)}%  ${f(r.hrs, 1).padStart(5)}h  ${r.side}   ${(r.entry * 100).toFixed(1)}¢  ${(r.gap * 100).toFixed(1)}¢  ${(r.impliedUpset * 100).toFixed(1)}%  ${r.feeFree ? 'FREE' : 'fee '}  $${String(r.cap).padStart(5)}  ${r.q.slice(0, 34)}`);
  }
  if (!carryRows.length) console.log('   (no short-dated near-certain carry legs right now)');

  console.log('\nNote: directional 5-min markets are deliberately EXCLUDED — they are ~50/50');
  console.log('coin flips and the 7% crypto fee makes high-frequency directional trading a');
  console.log('guaranteed bleed. Frequency only compounds the POSITIVE-edge cycles above.');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
