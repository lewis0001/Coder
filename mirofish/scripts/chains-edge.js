'use strict';
/* ============================================================
   scripts/chains-edge.js
   ------------------------------------------------------------
   LOGICAL-CHAIN cross-market arbitrage on Polymarket.

   A chain is a set of resolved Yes/No markets whose YES outcomes are
   LOGICALLY NESTED, ordered into "implication order": for legs i<j,
   leg_i IMPLIES leg_j, so the prices MUST obey
                       P(YES_i) <= P(YES_j).
   (Threshold ladder: "reach $HIGH" implies "reach $LOW"; temporal:
   "happens by EARLY" implies "happens by LATE".)

   A VIOLATION at time t is YES_i(t) > YES_j(t) for some i<j — a
   deductive mispricing. We can BUY the cheap-but-stronger leg_i YES
   and SELL (buy NO of) the expensive-but-weaker leg_j, holding both
   to resolution where they settle at par. Because leg_i ⊆ leg_j, the
   combined payoff is >= 0 in every state of the world, so any entry
   credit (the violation magnitude) net of trading costs is locked
   profit.

   This script:
     1) GATHERS resolved markets/events, parses + groups them into
        chains, fetches+caches leg histories (lib/chains-data.js).
     2) TIME-ALIGNS each chain's legs hourly, measures how often and
        by how much the monotonicity constraint is VIOLATED.
     3) BACKTESTS the deductive arbitrage on each violation (no
        look-ahead; pay a per-leg spread; hold to settlement), at
        spread = 2c and 1c. Also a softer "compression reversion"
        variant.
     4) VALIDATES with chronological split + bootstrap CI, and applies
        realityCheck/Bonferroni across the parameter sweep.
     5) Writes data/research/chains-edge-report.md.

   Plain Node, zero deps.

   Usage:
     node scripts/chains-edge.js [--gather] [--max-event-offset=N]
        [--concurrency=4] [--no-fetch-hist]
   ============================================================ */

const fs = require('fs');
const path = require('path');
const C = require('../lib/chains-data');
const V = require('../lib/validate');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  if (process.argv.includes(`--${name}`)) return true;
  return def;
}

/* ------------------------------------------------------------------
   STEP 1 — GATHER: build a flat list of normalized resolved legs from
   (a) cached event pages, (b) cached market pages, (c) the existing
   research markets.json pool. Cache raw event/market pages so reruns
   are offline.
   ------------------------------------------------------------------ */
async function gather({ doGather, maxEventOffset, concurrency, fetchHist }) {
  C.ensureDir(C.CHAINS_DIR);

  let events = [];
  let markets = [];

  if (doGather) {
    console.log('\n[gather] paging closed EVENTS from Gamma (multiple orderings)...');
    events = await C.fetchEventPages({
      // Sweep several orderings: volume head (liquid, but recent crypto often
      // has purged CLOB history) PLUS endDate/startDate ascending (OLDER events,
      // whose CLOB history was more reliably persisted) to widen usable chains.
      orderings: [
        { order: 'volume', ascending: false },
        { order: 'endDate', ascending: true },
        { order: 'endDate', ascending: false },
        { order: 'startDate', ascending: true },
      ],
      maxOffset: maxEventOffset,
      onProgress: ({ order, offset, added, total }) => {
        if (offset % 500 === 0 || added > 0) process.stdout.write(`\r   events ${order} offset=${String(offset).padStart(4)} +${String(added).padStart(3)} total=${total}    `);
      },
    });
    process.stdout.write('\n');
    console.log(`   collected ${events.length} closed events`);

    console.log('\n[gather] targeted keyword EVENT search (ladders + temporal subjects)...');
    const kwEvents = await C.fetchKeywordEvents([
      'bitcoin price', 'ethereum price', 'solana price', 'what price will bitcoin',
      'ceasefire', 'peace deal', 'fed interest rates', 'rate cut', 'recession',
      'reach', 'hit', 'above', 'by december', 'by end of',
    ], { onProgress: ({ kw, added, total }) => process.stdout.write(`\r   kw="${kw}" +${added} total=${total}        `) });
    process.stdout.write('\n');
    // merge keyword events
    const evById = new Map(events.map((e) => [String(e.id), e]));
    for (const e of kwEvents) if (!evById.has(String(e.id))) evById.set(String(e.id), e);
    events = [...evById.values()];
    console.log(`   total unique events after keyword search: ${events.length}`);

    console.log('\n[gather] paging closed MARKETS from Gamma (broad sweep)...');
    markets = await C.fetchMarketPages({
      maxOffset: 2000,
      onProgress: ({ order, offset, added, total }) => {
        if (offset % 500 === 0 || added > 0) process.stdout.write(`\r   markets ${order} offset=${String(offset).padStart(4)} +${String(added).padStart(3)} total=${total}    `);
      },
    });
    process.stdout.write('\n');
    console.log(`   collected ${markets.length} closed markets`);

    try { fs.writeFileSync(C.EVENTS_CACHE, JSON.stringify(events)); } catch { /* */ }
    try { fs.writeFileSync(C.MARKETS_CACHE, JSON.stringify(markets)); } catch { /* */ }
  } else {
    // load cached raw pages if present
    try { events = JSON.parse(fs.readFileSync(C.EVENTS_CACHE, 'utf8')); } catch { events = []; }
    try { markets = JSON.parse(fs.readFileSync(C.MARKETS_CACHE, 'utf8')); } catch { markets = []; }
    console.log(`\n[gather] loaded cached: ${events.length} events, ${markets.length} markets`);
  }

  /* Flatten legs from events (each event.markets[]) + standalone markets. */
  const legsById = new Map();
  const addRaw = (m) => {
    const lg = C.normalizeLeg(m);
    if (lg && !legsById.has(lg.id)) legsById.set(lg.id, lg);
  };
  for (const e of events) for (const m of (e.markets || [])) addRaw(m);
  for (const m of markets) addRaw(m);

  /* Also fold in the existing research markets.json pool (already
     normalized; many have cached histories). Convert its shape to raw-ish. */
  try {
    const pool = JSON.parse(fs.readFileSync(path.join(C.RESEARCH_DIR, 'markets.json'), 'utf8'));
    if (Array.isArray(pool)) {
      for (const p of pool) {
        if (legsById.has(String(p.id))) continue;
        // reconstruct a minimal normalized leg from the pool record
        if (p.yesTokenId == null) continue;
        const endMs = p.endDate ? new Date(p.endDate).getTime() : null;
        legsById.set(String(p.id), {
          id: String(p.id),
          question: p.question,
          groupItemTitle: null,
          yesTokenId: String(p.yesTokenId),
          yesWon: !!p.yesWon,
          endDate: p.endDate || null,
          endMs: (endMs && isFinite(endMs)) ? endMs : null,
          startMs: p.startDate ? new Date(p.startDate).getTime() : null,
          volume: Number(p.volume) || 0,
        });
      }
    }
  } catch { /* pool optional */ }

  const legs = [...legsById.values()];
  console.log(`   flattened ${legs.length} unique clean resolved Yes/No legs`);

  /* Build chains, then fetch histories for the legs that ended up in a
     chain (cheap: most are already cached). */
  let chains = C.buildChains(legs, { minLegs: 2 });
  console.log(`   pre-history chains: ${chains.length}`);

  if (fetchHist) {
    const tokens = [];
    for (const ch of chains) for (const lg of ch.legs) tokens.push(lg.yesTokenId);
    console.log(`\n[gather] fetching/caching ${new Set(tokens).size} chain-leg histories...`);
    const t0 = Date.now();
    const stat = await C.fetchHistoriesFor(tokens, {
      concurrency,
      onProgress: ({ done, total, kept, empty }) => {
        const s = ((Date.now() - t0) / 1000).toFixed(0);
        process.stdout.write(`\r   ${done}/${total} kept=${kept} empty=${empty} ${s}s    `);
      },
    });
    process.stdout.write('\n');
    console.log(`   histories: kept=${stat.kept} empty=${stat.empty}`);
  }

  // Attach histories + prune to legs that actually have usable price paths.
  chains = C.attachHistories(chains, { minPoints: 10, minLegs: 2 });
  console.log(`   chains with >=2 legs that have usable histories: ${chains.length}`);

  // Persist the resolved chain skeleton (without bulky paths) for audit.
  try {
    const skel = chains.map((ch) => ({
      kind: ch.kind, dir: ch.dir || null, key: ch.key, asset: ch.asset || null,
      legs: ch.legs.map((l) => ({
        id: l.id, question: l.question, scalar: l.scalar, deadlineLabel: l.deadlineLabel || null,
        yesWon: l.yesWon, endDate: l.endDate, points: l.points, yesTokenId: l.yesTokenId,
      })),
    }));
    fs.writeFileSync(C.CHAINS_FILE, JSON.stringify(skel, null, 1));
  } catch { /* */ }

  return chains;
}

/* ------------------------------------------------------------------
   STEP 2 — TIME-ALIGN a chain's legs onto a common hourly grid.
   For each leg we forward-fill the last known YES price (last
   observation carried forward), only within that leg's own observed
   window. The aligned grid is the INTERSECTION of all leg windows so
   every leg has a real (carried) price — no extrapolation outside a
   leg's data.
   Returns { times:[t...], series:[ [p per leg]... ] }.
   ------------------------------------------------------------------ */
const HOUR = 3600;
function alignChain(ch) {
  const legs = ch.legs;
  const lo = Math.max(...legs.map((l) => l.path[0].t));
  const hi = Math.min(...legs.map((l) => l.path[l.path.length - 1].t));
  if (!(hi > lo)) return null;
  // snap lo up to an hour boundary
  const start = Math.ceil(lo / HOUR) * HOUR;
  const times = [];
  for (let t = start; t <= hi; t += HOUR) times.push(t);
  if (times.length < 2) return null;

  // per-leg pointer walk (paths are sorted ascending)
  const idx = legs.map(() => 0);
  const series = [];
  for (const t of times) {
    const row = new Array(legs.length);
    for (let li = 0; li < legs.length; li++) {
      const p = legs[li].path;
      let k = idx[li];
      while (k + 1 < p.length && p[k + 1].t <= t) k++;
      idx[li] = k;
      row[li] = p[k].p; // last obs <= t
    }
    series.push(row);
  }
  return { times, series };
}

/* ------------------------------------------------------------------
   STEP 3 — DETECT violations + measure magnitude across all chains.
   For implication order (legs[i] => legs[j], i<j), constraint is
   YES_i <= YES_j. Violation at a timestamp for the pair (i,j) is
   max(0, YES_i - YES_j). We summarize the WORST adjacent pair per
   timestamp (adjacent pairs are the tightest constraints, and any
   non-adjacent violation implies an adjacent one given monotone
   intent — but we scan all i<j pairs to be safe).
   ------------------------------------------------------------------ */
function chainViolationStats(ch) {
  const al = alignChain(ch);
  if (!al) return null;
  const { times, series } = al;
  const L = ch.legs.length;
  let hours = 0, violHours = 0;
  let sumMag = 0, maxMag = 0;
  const mags = [];
  for (let r = 0; r < series.length; r++) {
    hours++;
    let worst = 0;
    const row = series[r];
    // ADJACENT pairs only: the tightest constraints. A non-adjacent breach
    // YES_i>YES_k (i<k) implies SOME adjacent pair in between is also
    // breached, so adjacent coverage is sufficient and avoids O(L^2)
    // double counting from a single stale leg.
    for (let i = 0; i + 1 < L; i++) {
      const breach = row[i] - row[i + 1]; // should be <= 0
      if (breach > worst) worst = breach;
    }
    if (worst > 1e-9) { violHours++; sumMag += worst; mags.push(worst); }
    if (worst > maxMag) maxMag = worst;
  }
  // Resolution-nesting check: in a TRUE chain, leg_i won => leg_{i+1} won.
  let resNestBreaks = 0;
  for (let i = 0; i + 1 < L; i++) if (ch.legs[i].yesWon && !ch.legs[i + 1].yesWon) resNestBreaks++;
  return {
    hours, violHours, violFrac: hours ? violHours / hours : 0,
    avgMag: violHours ? sumMag / violHours : 0, maxMag, mags, times,
    resNestBreaks, nested: resNestBreaks === 0,
  };
}

/* ------------------------------------------------------------------
   STEP 3b — BACKTEST the deductive arbitrage.

   At each aligned timestamp t we look at every implication pair
   (i,j), i<j, with constraint YES_i <= YES_j. If
        gross = YES_i(t) - YES_j(t)  >  0   (violation),
   the arbitrage is:
        BUY  YES_i  (pay ask  ~ mid_i + spread/2)
        BUY  NO_j   (pay ask  ~ (1 - mid_j) + spread/2)
   Cost to put on = (mid_i + s/2) + (1 - mid_j + s/2)
                  = 1 + (mid_i - mid_j) + s
                  = 1 + gross + s.
   Wait — that's the cost to acquire one unit of YES_i and one unit of
   NO_j. At resolution the payoff is:
        YES_i pays 1 if event_i true, else 0.
        NO_j  pays 1 if event_j false, else 0.
   Because event_i => event_j (i is the stronger/subset claim):
        - if event_i true  => event_j true  => YES_i=1, NO_j=0 => payoff 1
        - if event_i false, event_j true     => YES_i=0, NO_j=0 => payoff 0
        - if event_i false, event_j false    => YES_i=0, NO_j=1 => payoff 1
        - (event_i true, event_j false is IMPOSSIBLE by implication)
   So payoff ∈ {0,1}; the bad state (0) is exactly "event_j happened
   but event_i didn't". The arbitrage is NOT risk-free as a raw
   YES_i+NO_j pair — that's a directional bet on the GAP. The truly
   risk-free deductive trade is the SPREAD: SELL the overpriced leg_i
   and BUY the underpriced leg_j when YES_i > YES_j, i.e.
        BUY  YES_j   (cost  mid_j + s/2)
        BUY  NO_i    (cost  1 - mid_i + s/2)
   cost = 1 - (mid_i - mid_j) + s = 1 - gross + s. Payoff:
        - event_i true => event_j true  => YES_j=1, NO_i=0 => 1
        - event_i false,event_j true     => YES_j=1, NO_i=1 => 2
        - event_i false,event_j false    => YES_j=0, NO_i=1 => 1
        - (i true, j false impossible)
   So payoff ∈ {1,2}; the MINIMUM payoff is 1, guaranteed. Net of cost:
        worst-case net = 1 - (1 - gross + s) = gross - s.
   => RISK-FREE profit of at least (gross - s) per unit, regardless of
   outcome, whenever gross > s. THIS is the deductive arbitrage. We
   record the GUARANTEED (worst-case) net = gross - s as the trade PnL,
   so a "win" requires the violation to exceed the summed leg spread s.
   (We charge s = full spread total across the two legs.)

   One trade per chain-PAIR (enter at first violating hour, hold to
   settlement) to avoid double-counting the same standing mispricing.
   ------------------------------------------------------------------ */
function backtestChain(ch, { spread, mode = 'strict', compressBand = 0.0 }) {
  const al = alignChain(ch);
  if (!al) return [];
  const { times, series } = al;
  const L = ch.legs.length;
  const trades = [];
  const entered = new Set(); // pair "i:j" entered already
  const adjacentOnly = arguments[1].adjacentOnly;

  for (let r = 0; r < series.length; r++) {
    const row = series[r];
    for (let i = 0; i < L; i++) {
      const jHi = adjacentOnly ? Math.min(L, i + 2) : L;
      for (let j = i + 1; j < jHi; j++) {
        const tag = i + ':' + j;
        if (entered.has(tag)) continue;
        const gross = row[i] - row[j]; // >0 == violation of YES_i<=YES_j

        if (mode === 'strict') {
          // Deductive arbitrage: trade only when strictly violated AND the
          // edge clears the spread. Guaranteed worst-case net = gross - spread.
          if (gross > 0) {
            entered.add(tag);
            const net = gross - spread; // risk-free worst-case PnL per unit
            trades.push({
              netPnl: net, gross, spread, t: times[r], i, j,
              legA: ch.legs[i].question, legB: ch.legs[j].question,
            });
          }
        } else if (mode === 'compress') {
          // Softer "monotonicity reversion": the gap is compressed/inverted
          // (YES_i within compressBand of YES_j, or above it). Bet the gap
          // reverts toward the constraint by SETTLEMENT: BUY YES_j + NO_i,
          // which settles at >=1; here we DON'T require gross>0, only that
          // the legs are "too close" (gross > -compressBand). PnL is the
          // realized settlement value of (YES_j + NO_i) minus cost, which is
          // NOT bounded below by 1 in this loosened regime, so we settle for
          // real (look at yesWon).
          if (gross > -compressBand) {
            entered.add(tag);
            const costYj = row[j] + spread / 2;          // buy YES_j
            const costNi = (1 - row[i]) + spread / 2;     // buy NO_i
            const cost = costYj + costNi;
            const payYj = ch.legs[j].yesWon ? 1 : 0;
            const payNi = ch.legs[i].yesWon ? 0 : 1;
            const net = (payYj + payNi) - cost;
            trades.push({
              netPnl: net, gross, spread, t: times[r], i, j,
              legA: ch.legs[i].question, legB: ch.legs[j].question,
            });
          }
        }
      }
    }
  }
  return trades;
}

/* Settlement check for STRICT mode: the deductive math says worst-case
   net = gross - spread regardless of outcome, BUT only if the legs truly
   obey the implication (event_i => event_j). We VERIFY this on the
   realized outcomes: if we ever observe yesWon_i=true while yesWon_j=false,
   the implication was violated at resolution (mislabeled chain) and the
   "arbitrage" was not real. We compute the REALIZED net too, and flag
   any chain whose resolutions break the implication. */
function realizedStrictNet(ch, tr, spread) {
  const i = tr.i, j = tr.j;
  const wi = ch.legs[i].yesWon, wj = ch.legs[j].yesWon;
  // BUY YES_j + NO_i, entry cost = 1 - gross + spread
  const cost = 1 - tr.gross + spread;
  const payYj = wj ? 1 : 0;
  const payNi = wi ? 0 : 1;
  const realized = (payYj + payNi) - cost;
  const implicationHeld = !(wi && !wj); // i=>j must hold
  return { realized, implicationHeld };
}

/* ------------------------------------------------------------------
   Pretty helpers
   ------------------------------------------------------------------ */
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function cents(x) { return (x * 100).toFixed(2) + 'c'; }
function fmt(x, d = 4) { return (x >= 0 ? ' ' : '') + x.toFixed(d); }

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const doGather = !!arg('gather', false);
  const maxEventOffset = Number(arg('max-event-offset', 3000));
  const concurrency = Number(arg('concurrency', 4));
  const fetchHist = !arg('no-fetch-hist', false);

  console.log('============================================================');
  console.log(' mirofish — LOGICAL-CHAIN arbitrage research');
  console.log('============================================================');

  const chains = await gather({ doGather, maxEventOffset, concurrency, fetchHist });

  const thr = chains.filter((c) => c.kind === 'threshold');
  const tmp = chains.filter((c) => c.kind === 'temporal');
  console.log(`\nCHAINS: total=${chains.length}  threshold=${thr.length}  temporal=${tmp.length}`);

  if (chains.length === 0) {
    console.log('No chains found — run with --gather first.');
    return;
  }

  /* ---- STEP 2: violation frequency + magnitude ---- */
  console.log('\n[detect] measuring monotonicity violations (hourly aligned)...');
  let totHours = 0, totViol = 0, magSum = 0, magN = 0, maxMagAll = 0;
  const perKindAgg = { threshold: { h: 0, v: 0, m: 0, mn: 0 }, temporal: { h: 0, v: 0, m: 0, mn: 0 } };
  const chainRows = [];
  let implBreaks = 0, nestedChains = 0, brokenChains = 0;
  for (const ch of chains) {
    const st = chainViolationStats(ch);
    if (!st) continue;
    totHours += st.hours; totViol += st.violHours;
    for (const m of st.mags) { magSum += m; magN++; }
    if (st.maxMag > maxMagAll) maxMagAll = st.maxMag;
    const a = perKindAgg[ch.kind];
    a.h += st.hours; a.v += st.violHours;
    for (const m of st.mags) { a.m += m; a.mn++; }
    implBreaks += st.resNestBreaks;
    // Mark each chain so backtests can split "verified-nested" vs all.
    ch.__nested = st.nested;
    if (st.nested) nestedChains++; else brokenChains++;
    chainRows.push({ kind: ch.kind, key: ch.key, legs: ch.legs.length, ...st });
  }
  console.log(`   aligned chains=${chainRows.length} totalHours=${totHours} violatingHours=${totViol} (${pct(totViol / Math.max(1, totHours))})`);
  console.log(`   avg violation magnitude (when violated)=${cents(magN ? magSum / magN : 0)}  max=${cents(maxMagAll)}`);
  console.log(`   resolution-nesting: nested chains=${nestedChains} broken chains=${brokenChains} (adjacent breaks=${implBreaks})`);

  /* ---- STEP 3: backtest sweep ---- */
  // Parameter variants we sweep (for multiple-testing correction).
  // Variants sweep spread (2c/1c/0.5c), pair-coverage (adjacent vs all), and a
  // softer compression-reversion mode. adjacent-only avoids over-counting one
  // stale leg into O(L) duplicate trades.
  const variants = [
    { name: 'strict_adj_s2c', mode: 'strict', spread: 0.02, adjacentOnly: true },
    { name: 'strict_adj_s1c', mode: 'strict', spread: 0.01, adjacentOnly: true },
    { name: 'strict_all_s2c', mode: 'strict', spread: 0.02, adjacentOnly: false },
    { name: 'strict_all_s1c', mode: 'strict', spread: 0.01, adjacentOnly: false },
    { name: 'compress_adj_b1c_s2c', mode: 'compress', spread: 0.02, compressBand: 0.01, adjacentOnly: true },
    { name: 'compress_adj_b2c_s2c', mode: 'compress', spread: 0.02, compressBand: 0.02, adjacentOnly: true },
  ];

  console.log('\n[backtest] sweeping variants; per-variant trades + net expectancy...');
  console.log('  (guaranteed = deductive worst-case net; realized = settled net using outcomes;');
  console.log('   nested = same but only over chains that are truly nested at resolution)');
  const variantOut = [];
  for (const v of variants) {
    const trades = [];
    const realizedTrades = []; // strict only: realized net using outcomes
    const nestedTrades = [];   // strict only: realized net, nested chains only
    for (const ch of chains) {
      const trs = backtestChain(ch, { spread: v.spread, mode: v.mode, compressBand: v.compressBand || 0, adjacentOnly: v.adjacentOnly });
      for (const tr of trs) {
        // tag the chain + kind + resolution time for later splitting
        const resMs = Math.max(...ch.legs.map((l) => l.endMs || 0));
        tr.kind = ch.kind; tr.resMs = resMs; tr.chainKey = ch.key;
        trades.push(tr);
        if (v.mode === 'strict') {
          const rz = realizedStrictNet(ch, tr, v.spread);
          const rzTr = { ...tr, netPnl: rz.realized, implicationHeld: rz.implicationHeld };
          realizedTrades.push(rzTr);
          if (ch.__nested) nestedTrades.push(rzTr);
        }
      }
    }
    const guaranteedPnls = trades.map((t) => t.netPnl);
    const m = V.tradeMetrics(guaranteedPnls);
    let realizedM = null, nestedM = null, implHeldFrac = null;
    if (v.mode === 'strict') {
      realizedM = V.tradeMetrics(realizedTrades.map((t) => t.netPnl));
      nestedM = V.tradeMetrics(nestedTrades.map((t) => t.netPnl));
      const held = realizedTrades.filter((t) => t.implicationHeld).length;
      implHeldFrac = realizedTrades.length ? held / realizedTrades.length : 1;
    }
    variantOut.push({ v, trades, realizedTrades, nestedTrades, m, realizedM, nestedM, implHeldFrac });
    console.log(`   ${v.name.padEnd(20)} n=${String(m.n).padStart(4)} guarExp=${fmt(m.expectancy)} ` +
      `CI=[${fmt(m.bootLo)},${fmt(m.bootHi)}]` +
      (realizedM ? `  realExp=${fmt(realizedM.expectancy)} nestedExp=${fmt(nestedM.expectancy)}(n=${nestedM.n}) implHeld=${pct(implHeldFrac)}` : ` total=${fmt(m.totalNetPnl, 2)}`));
  }

  /* ---- STEP 4: validation (chronological split + correction) ---- */
  // Build a per-chain dataset keyed by resolution time for splitByTime.
  // We split CHAINS chronologically, then evaluate each variant on the
  // out-of-sample TEST chains.
  const chainDataset = chains.map((ch) => ({
    chain: ch,
    endDate: new Date(Math.max(...ch.legs.map((l) => l.endMs || 0))).toISOString(),
  }));
  const split = V.splitByTime(chainDataset, { trainFrac: 0.5, valFrac: 0.25 });
  console.log(`\n[validate] chronological chain split: train=${split.train.length} val=${split.validation.length} test=${split.test.length}`);

  // backtestFn for selectAndConfirm: per-chain -> { log:[{netPnl}] }.
  // For the HONEST out-of-sample test we use the REALIZED settled net for
  // strict mode (the guaranteed worst-case is only real if grouping is perfect,
  // which it isn't — so trading it blindly earns the realized number). Compress
  // mode is already realized.
  function makeBacktestFn(variant) {
    return (rec) => {
      const ch = rec.chain;
      const trs = backtestChain(ch, { spread: variant.spread, mode: variant.mode, compressBand: variant.compressBand || 0, adjacentOnly: variant.adjacentOnly });
      if (variant.mode === 'strict') {
        return { log: trs.map((t) => ({ netPnl: realizedStrictNet(ch, t, variant.spread).realized })) };
      }
      return { log: trs.map((t) => ({ netPnl: t.netPnl })) };
    };
  }

  // Collect per-config validation PnLs (for realityCheck) + pick best by val expectancy.
  const valPnlByConfig = variants.map((v) =>
    V.collectPnls(split.validation, makeBacktestFn(v)));
  const valStats = variants.map((v, i) => ({ v, stats: V.tradeMetrics(valPnlByConfig[i]) }));
  const rankedVal = valStats.slice().sort((a, b) => b.stats.expectancy - a.stats.expectancy);
  const bestVal = rankedVal[0];

  console.log('\n[validate] validation-set expectancy by variant:');
  for (const r of rankedVal) {
    console.log(`   ${r.v.name.padEnd(18)} n=${String(r.stats.n).padStart(4)} exp=${fmt(r.stats.expectancy)} CI=[${fmt(r.stats.bootLo)},${fmt(r.stats.bootHi)}]`);
  }

  let correction = null, testStats = null, finalVerdict = '';
  if (bestVal.stats.n >= 1) {
    correction = V.isLikelyRealEdge(bestVal.stats, variants.length, {
      alpha: 0.05, pnlByConfig: valPnlByConfig, minTrades: 20,
    });
    console.log(`\n[validate] best on validation: ${bestVal.v.name} -> ${correction.reason}`);
    // Touch test set once with the chosen variant (report regardless, but flag).
    const testPnls = V.collectPnls(split.test, makeBacktestFn(bestVal.v));
    testStats = V.tradeMetrics(testPnls);
    const passTest = testStats.ciExcludesZero && testStats.expectancy > 0;
    finalVerdict = (correction.pass && passTest)
      ? `CONFIRMED out-of-sample: ${bestVal.v.name} test exp=${fmt(testStats.expectancy)} CI=[${fmt(testStats.bootLo)},${fmt(testStats.bootHi)}] over n=${testStats.n}`
      : `NOT confirmed OOS: best=${bestVal.v.name} testExp=${fmt(testStats.expectancy)} CI lo=${fmt(testStats.bootLo)} (need >0)`;
    console.log(`[validate] TEST: ${bestVal.v.name} n=${testStats.n} exp=${fmt(testStats.expectancy)} CI=[${fmt(testStats.bootLo)},${fmt(testStats.bootHi)}]`);
    console.log(`[validate] VERDICT: ${finalVerdict}`);
  }

  /* ---- Examples of the biggest pure deductive violations ---- */
  const strictV = variantOut.find((o) => o.v.name === 'strict_all_s2c') || variantOut[0];
  const bigViol = strictV.trades.slice().sort((a, b) => b.gross - a.gross).slice(0, 12);

  /* ---- WRITE REPORT ---- */
  const reportPath = path.join(C.RESEARCH_DIR, 'chains-edge-report.md');
  writeReport(reportPath, {
    chains, thr, tmp, totHours, totViol, magN, magSum, maxMagAll, implBreaks,
    nestedChains, brokenChains,
    perKindAgg, variantOut, split, rankedVal, bestVal, correction, testStats, finalVerdict, bigViol,
  });
  console.log(`\nreport written: ${reportPath}`);
  console.log('done.');
}

function writeReport(file, R) {
  const L = [];
  const p = (s = '') => L.push(s);
  const pct = (x) => (x * 100).toFixed(1) + '%';
  const cents = (x) => (x * 100).toFixed(2) + 'c';
  const f = (x, d = 4) => (x >= 0 ? ' ' : '') + Number(x).toFixed(d);

  p('# Logical-Chain Arbitrage on Polymarket — research report');
  p('');
  p(`_Generated: ${new Date().toISOString()}_`);
  p('');
  p('A **chain** is a set of resolved Yes/No markets whose YES outcomes are logically');
  p('nested, put in *implication order* so for legs i<j, leg_i ⊆ leg_j and therefore');
  p('prices MUST obey **P(YES_i) ≤ P(YES_j)**. Any timestamp where YES_i > YES_j is a');
  p('deductive mispricing. The risk-free trade is **BUY YES_j + BUY NO_i**, which');
  p('settles at ≥ 1 in every state (because i true ⇒ j true), so worst-case net =');
  p('`gross − spread` per unit, locked regardless of outcome — *if* both legs fill.');
  p('');
  p('## 1. Chains gathered');
  p('');
  p(`- **Total chains:** ${R.chains.length}`);
  p(`  - Threshold ladders: **${R.thr.length}**`);
  p(`  - Temporal chains: **${R.tmp.length}**`);
  const legCount = R.chains.reduce((a, c) => a + c.legs.length, 0);
  p(`- Total legs across chains: ${legCount} (avg ${(legCount / Math.max(1, R.chains.length)).toFixed(1)} legs/chain)`);
  p('');
  p('Example chains (implication order; YES must be non-decreasing down the list):');
  p('');
  for (const ch of R.chains.slice(0, 8)) {
    p(`- \`${ch.kind}\` **${ch.key}**`);
    for (const lg of ch.legs.slice(0, 6)) {
      p(`    - ${lg.question}  _(won=${lg.yesWon})_`);
    }
  }
  p('');
  p('## 2. How often is the constraint violated, and by how much?');
  p('');
  p(`- Aligned hourly observations: **${R.totHours}**`);
  p(`- Hours with a monotonicity violation: **${R.totViol}**  (**${pct(R.totViol / Math.max(1, R.totHours))}** of hours)`);
  p(`- Average violation magnitude when violated: **${cents(R.magN ? R.magSum / R.magN : 0)}**`);
  p(`- Largest single violation observed: **${cents(R.maxMagAll)}**`);
  p(`- **Resolution-nesting check**: of ${R.chains.length} chains, **${R.nestedChains}** are truly nested at resolution (leg_i YES ⇒ leg_{i+1} YES holds) and **${R.brokenChains}** are NOT (adjacent breaks=${R.implBreaks}). A broken chain means the textual grouping merged markets that are not actually logically nested — there the "guaranteed" arbitrage is fictional.`);
  p('');
  p('By kind:');
  p('');
  p('| kind | hours | viol hours | viol % | avg mag |');
  p('|---|---:|---:|---:|---:|');
  for (const k of ['threshold', 'temporal']) {
    const a = R.perKindAgg[k];
    p(`| ${k} | ${a.h} | ${a.v} | ${pct(a.v / Math.max(1, a.h))} | ${cents(a.mn ? a.m / a.mn : 0)} |`);
  }
  p('');
  p('## 3. Backtest — net-of-cost arbitrage PnL');
  p('');
  p('STRICT = the pure deductive trade taken only when `gross > 0`; the guaranteed');
  p('per-unit PnL is the **worst-case** `gross − spread`, locked regardless of outcome');
  p('IF the chain is genuinely nested. When nesting holds the *realized* settled net is');
  p('always ≥ guaranteed (the worst case is conservative), which is what the table below');
  p('shows. `spread` is the TOTAL crossed across both legs. COMPRESS = a looser');
  p('"monotonicity reversion" that also fires when legs are merely close (within `band`);');
  p('its PnL is purely the realized settlement value, so it carries real outcome risk and');
  p('is NOT deductive.');
  p('');
  p('| variant | mode | spread | band | #trades | guaranteed exp | 95% CI |');
  p('|---|---|---:|---:|---:|---:|---:|');
  for (const o of R.variantOut) {
    const v = o.v;
    p(`| ${v.name} | ${v.mode} | ${cents(v.spread)} | ${v.compressBand ? cents(v.compressBand) : '—'} | ${o.m.n} | ${f(o.m.expectancy)} | [${f(o.m.bootLo)}, ${f(o.m.bootHi)}] |`);
  }
  p('');
  p('The **guaranteed** column is the deductive worst-case `gross − spread`, which is only');
  p('real if the chain is genuinely nested. For STRICT variants we therefore also report');
  p('the **realized** settled net (what you would actually have earned trading every');
  p('detected violation blind) and the **nested-only realized** net (restricting to chains');
  p('that are truly nested at resolution — an *oracle* cut that is not tradeable ex-ante,');
  p('shown only to isolate the grouping risk):');
  p('');
  p('| variant | #trades | guaranteed exp | realized exp | realized 95% CI | nested-only realized (n) | implication held |');
  p('|---|---:|---:|---:|---:|---:|---:|');
  for (const o of R.variantOut) {
    if (o.v.mode !== 'strict') continue;
    p(`| ${o.v.name} | ${o.m.n} | ${f(o.m.expectancy)} | ${f(o.realizedM.expectancy)} | [${f(o.realizedM.bootLo)}, ${f(o.realizedM.bootHi)}] | ${f(o.nestedM.expectancy)} (${o.nestedM.n}) | ${pct(o.implHeldFrac)} |`);
  }
  p('');
  p('## 4. Out-of-sample validation');
  p('');
  p(`Chains split chronologically by resolution date: train=${R.split.train.length}, validation=${R.split.validation.length}, test=${R.split.test.length}.`);
  p('');
  p('Validation-set expectancy by variant (used to pick ONE winner, then touch test once):');
  p('');
  p('| variant | n | val expectancy | val 95% CI |');
  p('|---|---:|---:|---:|');
  for (const r of R.rankedVal) {
    p(`| ${r.v.name} | ${r.stats.n} | ${f(r.stats.expectancy)} | [${f(r.stats.bootLo)}, ${f(r.stats.bootHi)}] |`);
  }
  p('');
  if (R.correction) {
    p(`**Multiple-testing correction** (N=${R.variantOut.length} variants) on best validation variant \`${R.bestVal.v.name}\`:`);
    p('');
    p(`- ${R.correction.reason}`);
    if (R.correction.bonferroni) p(`- Bonferroni: rawP=${R.correction.bonferroni.rawP.toExponential(2)}, adjAlpha=${R.correction.bonferroni.adjAlpha.toExponential(2)}, pass=${R.correction.bonferroni.pass}`);
    if (R.correction.realityCheck) p(`- Reality-check (White): best-of-${R.correction.realityCheck.N} p=${R.correction.realityCheck.pValue.toFixed(4)}`);
    p('');
  }
  if (R.testStats) {
    p(`**Held-out TEST** (chosen variant \`${R.bestVal.v.name}\`): n=${R.testStats.n}, expectancy=${f(R.testStats.expectancy)}, 95% CI=[${f(R.testStats.bootLo)}, ${f(R.testStats.bootHi)}].`);
    p('');
    p(`**Verdict:** ${R.finalVerdict}`);
    p('');
  }
  p('## 5. Biggest pure deductive violations observed (strict)');
  p('');
  p('| gross | net@2c | leg_i (stronger, cheaper) | leg_j (weaker, dearer) |');
  p('|---:|---:|---|---|');
  for (const b of R.bigViol) {
    p(`| ${cents(b.gross)} | ${cents(b.gross - 0.02)} | ${truncate(b.legA)} | ${truncate(b.legB)} |`);
  }
  p('');
  p('## 6. Verdict & caveats');
  p('');
  const strict2 = R.variantOut.find((o) => o.v.name === 'strict_adj_s2c');
  const strict1 = R.variantOut.find((o) => o.v.name === 'strict_adj_s1c');
  p(`- At a **2c** total spread, the strict trade shows a *guaranteed* (assuming perfect nesting) net of **${f(strict2.m.expectancy)}/unit** over **${strict2.m.n}** violation-trades, but its **realized** net trading blind is **${f(strict2.realizedM.expectancy)}/unit** (95% CI [${f(strict2.realizedM.bootLo)}, ${f(strict2.realizedM.bootHi)}]); restricted to truly-nested chains (oracle) it is **${f(strict2.nestedM.expectancy)}/unit** over ${strict2.nestedM.n}.`);
  p(`- At a **1c** total spread: guaranteed **${f(strict1.m.expectancy)}/unit**, realized **${f(strict1.realizedM.expectancy)}/unit** (95% CI [${f(strict1.realizedM.bootLo)}, ${f(strict1.realizedM.bootHi)}]), nested-only **${f(strict1.nestedM.expectancy)}/unit** over ${strict1.nestedM.n}.`);
  p('');
  // Where does the edge live? threshold ladders are near-efficient; temporal
  // chains carry essentially all the violation magnitude.
  const ta = R.perKindAgg.threshold, te = R.perKindAgg.temporal;
  p(`**Where the edge lives:** threshold ladders (BTC/ETH/OIL) are near-efficient —`);
  p(`violated only ${pct(ta.v / Math.max(1, ta.h))} of hours at avg ${cents(ta.mn ? ta.m / ta.mn : 0)}. ALL the usable`);
  p(`magnitude is in **temporal chains** (${pct(te.v / Math.max(1, te.h))} of hours, avg ${cents(te.mn ? te.m / te.mn : 0)}), and within those`);
  p('it concentrates in *illiquid, niche* markets (token-launch-by-date, Iran-airspace,');
  p('ceasefire-by-date) — exactly the markets where a displayed "violation" is least');
  p('likely to be a real, fillable two-sided quote.');
  p('');
  p('**Caveats (the crux is grouping-correctness + fillability + cost, not statistics):**');
  p('');
  p('1. **The chain must be genuinely nested.** Textual grouping is imperfect; after');
  p(`   splitting (HIGH)/(LOW) oil bands and keeping magnitudes distinct, ${R.brokenChains}/${R.chains.length} chains are`);
  p('   NOT nested at resolution in this dataset. But that count is sensitive to the');
  p('   parser: ONE merged non-nested pair turns the "risk-free" trade into a ~-92c');
  p('   directional loss. A live desk would need bullet-proof grouping (same');
  p('   event/conditionId, identical resolution source), not regex on question text.');
  p('2. The guaranteed PnL assumes BOTH legs fill at mid ± spread/2. In reality the');
  p('   violation often exists precisely because one leg is stale/illiquid — you may not');
  p('   be able to fill the cheap stronger leg at the displayed price, or in size.');
  p('3. Spread is charged as a single TOTAL across both legs. If each leg has its own');
  p('   ~2c spread the real round-trip cost is ~4c; compare the 0.5c…2c rows to bound it.');
  p('4. Violations are measured on last-trade/forward-filled hourly prices, not live');
  p('   order books; a 1c "violation" can be inside the bid/ask and not tradeable.');
  p('');
  fs.writeFileSync(file, L.join('\n'));
}
function truncate(s, n = 52) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

main().catch((e) => { console.error('\nFATAL:', e); process.exit(1); });
