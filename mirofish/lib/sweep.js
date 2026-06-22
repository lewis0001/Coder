'use strict';
/* ============================================================
   STRATEGY SWEEP — config grid + custom backtestFn for the
   anti-overfitting harness (lib/validate.js selectAndConfirm).
   ------------------------------------------------------------
   This file is the SEARCH-phase engine. It does NOT touch the
   locked test set itself — that gate lives in selectAndConfirm.

   It provides:
     (a) adapt(market)        : research-market -> internal shape.
     (b) backtestFn(market,cfg): returns {log:[{netPnl}], netPnl}
                                 — selectAndConfirm reads
                                 result.log[].netPnl.
     (c) buildGrid()          : a few-hundred-config grid spanning
                                 the requested strategy families.

   COST MODEL (matches lib/backtest.js conventions, extended to
   the NO side):
     - We only have a mid/last price PATH (no bid/ask). We assume a
       round-trip `spread` and CROSS it.
     - BUY YES at  mid + spread/2  (you lift the ask).
     - BUY NO  at  (1-mid) + spread/2  (the NO ask = 1 - YES bid).
     - Settlement is at PAR ($1 if your side won, else $0) with NO
       extra spread — exactly like real Polymarket resolution.
     - Optional volume-scaled spread widens the assumed spread for
       low-volume markets (sensitivity only; off by default).

   NO LOOK-AHEAD:
     - Entry decision at time t uses ONLY path points with t' <= t.
     - The outcome is realized only at settlement.

   Money model: fixed $100 stake per entry, so per-trade PnL is
   directly comparable across markets (same as lib/backtest.js).
   ============================================================ */

const STAKE = 100;

/* ---------- adapter: research market -> internal shape ---------- */
// loadResearchDataset() rows have: path:[{t,p}], outcomeYesWon, category,
// durationDays, volume, firstPrice, endDate. We normalize the one field name
// that differs from lib/backtest.js (outcomeYesWon -> yesWon) and pass the
// rest through. The path is already sorted ascending by t.
function adapt(market) {
  return {
    id: market.id,
    question: market.question,
    category: market.category,
    durationDays: market.durationDays,
    volume: market.volume,
    firstPrice: market.firstPrice,
    endDate: market.endDate,
    yesWon: !!market.outcomeYesWon,
    path: market.path,
  };
}

/* ---------- effective spread (optionally volume-scaled) ---------- */
function effectiveSpread(cfg, volume) {
  const base = cfg.spread != null ? cfg.spread : 0.02;
  if (!cfg.volScaledSpread) return base;
  // Wider for low-volume markets. Below volLowThresh -> base*volWideMult,
  // above volHighThresh -> base, linear in log-volume between.
  const lo = cfg.volLowThresh != null ? cfg.volLowThresh : 1000;
  const hi = cfg.volHighThresh != null ? cfg.volHighThresh : 1000000;
  const mult = cfg.volWideMult != null ? cfg.volWideMult : 2.5;
  const v = Math.max(1, volume || 0);
  if (v <= lo) return base * mult;
  if (v >= hi) return base;
  const frac = (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return base * (mult - (mult - 1) * frac);
}

/* ---------- duration bucket filter ---------- */
function inDurationBucket(durationDays, bucket) {
  if (bucket == null || bucket === 'any') return true;
  const d = durationDays;
  if (d == null || !isFinite(d)) return bucket === 'any';
  switch (bucket) {
    case 'intraday': return d < 1;
    case '1-3d': return d >= 1 && d <= 3;
    case '4-14d': return d > 3 && d <= 14;
    case '15+': return d > 14;
    default: return true;
  }
}

/* ---------- price as of a cutoff time (no look-ahead) ---------- */
// Returns the last path point with t <= cutoffT, plus its index. If no point
// is at/before the cutoff, returns null.
function priceAsOf(path, cutoffT) {
  let lo = 0, hi = path.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (path[mid].t <= cutoffT) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  if (ans < 0) return null;
  return { idx: ans, t: path[ans].t, p: path[ans].p };
}

/* ---------- choose the entry observation (entry-timing) ---------- */
// timing:
//   'first'  -> first path point.
//   'Nd'     -> the price as of N days before resolution (endDate), using only
//               data up to that time. Falls back gracefully if endDate missing.
function entryObs(market, cfg) {
  const path = market.path;
  const n = path.length;
  if (n === 0) return null;
  const timing = cfg.entryTiming || 'first';
  if (timing === 'first') return { idx: 0, t: path[0].t, p: path[0].p };

  // N-days-before-resolution timings.
  const mDays = { '30d': 30, '7d': 7, '1d': 1 }[timing];
  if (mDays == null) return { idx: 0, t: path[0].t, p: path[0].p };

  const endMs = market.endDate ? new Date(market.endDate).getTime() : NaN;
  let endT;
  if (isFinite(endMs) && endMs > 0) {
    endT = endMs / 1000; // path t is in seconds
  } else {
    endT = path[n - 1].t;
  }
  const cutoffT = endT - mDays * 86400;
  // If the cutoff is before the first observation, this timing has no valid
  // entry for this market (we don't want to silently fall back to 'first',
  // which would conflate timings) -> no trade.
  if (cutoffT < path[0].t) return null;
  return priceAsOf(path, cutoffT);
}

/* ============================================================
   The custom backtestFn.
   Returns { log:[{netPnl}], netPnl, trades } per market.
   At most ONE trade per market (hold-to-resolution / single path
   entry). Mean-reversion & momentum scan the path for one entry.
   ============================================================ */
function backtestFn(market, cfg) {
  const m = market.path ? market : adapt(market); // accept raw research rows too
  const empty = { log: [], netPnl: 0, trades: 0 };
  const path = m.path;
  if (!Array.isArray(path) || path.length < 2) return empty;

  // ---- shared filters ----
  if (!inDurationBucket(m.durationDays, cfg.durationBucket)) return empty;
  if (cfg.category && cfg.category !== 'any' && m.category !== cfg.category) return empty;
  if (cfg.minVolume != null && (m.volume || 0) < cfg.minVolume) return empty;

  const family = cfg.family;
  if (family === 'hold-yes') return holdToResolution(m, cfg, 'yes');
  if (family === 'hold-no') return holdToResolution(m, cfg, 'no');
  if (family === 'meanrev') return pathStrategy(m, cfg, 'meanrev');
  if (family === 'momentum') return pathStrategy(m, cfg, 'momentum');
  return empty;
}

/* ---- HOLD-TO-RESOLUTION (YES or NO side) ---- */
function holdToResolution(m, cfg, side) {
  const obs = entryObs(m, cfg);
  if (!obs) return { log: [], netPnl: 0, trades: 0 };
  const yesMid = obs.p;
  if (!(yesMid > 0) || !(yesMid < 1)) return { log: [], netPnl: 0, trades: 0 };

  // band is expressed in terms of the YES price for BOTH sides (so a NO config
  // with band [0.02,0.15] means "enter NO when the YES longshot price is cheap").
  const lo = cfg.loBand, hi = cfg.hiBand;
  if (yesMid < lo || yesMid > hi) return { log: [], netPnl: 0, trades: 0 };

  const half = effectiveSpread(cfg, m.volume) / 2;
  let entryCost, won;
  if (side === 'yes') {
    entryCost = yesMid + half;            // buy YES at the ask
    won = m.yesWon;
  } else {
    entryCost = (1 - yesMid) + half;      // buy NO at the NO-ask = 1 - YES-bid
    won = !m.yesWon;
  }
  if (!(entryCost > 0) || entryCost >= 1) return { log: [], netPnl: 0, trades: 0 };

  const shares = STAKE / entryCost;       // each share settles at $1 if won
  const proceeds = shares * (won ? 1 : 0);
  const net = round2(proceeds - STAKE);   // settlement at par, no exit spread
  return { log: [{ netPnl: net }], netPnl: net, trades: 1 };
}

/* ---- PATH strategies: mean-reversion / momentum on the YES price ----
   Single entry, realistic exit. We scan the path forward (no look-ahead:
   at bar i we use only mids[0..i]). On entry we BUY YES at the ask. We exit
   on a take-profit / stop target back at the spread-adjusted bid, else hold
   to settlement at par. Always YES-side here (simple, inspectable).      */
function pathStrategy(m, cfg, kind) {
  const path = m.path;
  const n = path.length;
  const half = effectiveSpread(cfg, m.volume) / 2;
  const look = cfg.lookback != null ? cfg.lookback : 10;
  const dropThresh = cfg.dropThresh != null ? cfg.dropThresh : 0.05; // meanrev
  const upThresh = cfg.upThresh != null ? cfg.upThresh : 0.05;       // momentum
  const takeProfit = cfg.takeProfit != null ? cfg.takeProfit : 0.05; // abs price move
  const stopLoss = cfg.stopLoss != null ? cfg.stopLoss : 0.10;       // abs price move
  const loBand = cfg.loBand != null ? cfg.loBand : 0.05;
  const hiBand = cfg.hiBand != null ? cfg.hiBand : 0.95;

  let position = null; // { entryAsk }
  let net = null;

  for (let i = 0; i < n; i++) {
    const mid = path[i].p;
    if (position) {
      // exits (sell crosses to the bid)
      const bid = Math.max(0, mid - half);
      if (bid - position.entryAsk >= takeProfit) {
        net = round2((STAKE / position.entryAsk) * bid - STAKE);
        position = null; break;
      }
      if (position.entryAsk - bid >= stopLoss) {
        net = round2((STAKE / position.entryAsk) * bid - STAKE);
        position = null; break;
      }
      continue;
    }
    if (i < look) continue; // need a warmed-up window
    // rolling mean of the visible window (excluding current bar)
    let s = 0;
    for (let k = i - look; k < i; k++) s += path[k].p;
    const roll = s / look;
    let signal = false;
    if (kind === 'meanrev') signal = (mid <= roll - dropThresh);     // bought a dip
    else signal = (mid >= roll + upThresh);                          // momentum up
    if (!signal) continue;
    if (mid < loBand || mid > hiBand) continue;
    const ask = mid + half;
    if (!(ask > 0) || ask >= 1) continue;
    position = { entryAsk: ask };
  }

  if (net == null) {
    if (position) {
      // held to settlement at par
      const won = m.yesWon;
      net = round2((STAKE / position.entryAsk) * (won ? 1 : 0) - STAKE);
    } else {
      return { log: [], netPnl: 0, trades: 0 };
    }
  }
  return { log: [{ netPnl: net }], netPnl: net, trades: 1 };
}

function round2(x) { return Math.round(x * 100) / 100; }

/* ============================================================
   GRID — a few hundred configs across the families.
   Each config carries a human-readable `label`.
   ============================================================ */
function buildGrid(opts = {}) {
  const spread = opts.spread != null ? opts.spread : 0.02;
  const volScaled = !!opts.volScaledSpread;
  const base = { spread, volScaledSpread: volScaled };
  if (volScaled) {
    base.volLowThresh = 1000; base.volHighThresh = 1000000; base.volWideMult = 2.5;
  }
  const configs = [];
  const push = (c) => configs.push(Object.assign({}, base, c));

  const durations = ['any', 'intraday', '1-3d', '4-14d', '15+'];
  const timings = ['first', '30d', '7d', '1d'];
  const minVols = [0, 1000, 50000];

  // ---- FAMILY 1: HOLD-TO-RESOLUTION, YES side (favorites) ----
  // Bands sweep across favorite territory.
  const yesBands = [
    [0.80, 0.97], [0.85, 0.97], [0.90, 0.98], [0.70, 0.90],
    [0.60, 0.80], [0.55, 0.97], [0.95, 0.99],
  ];
  for (const [lo, hi] of yesBands) {
    for (const timing of timings) {
      for (const dur of durations) {
        for (const minVol of minVols) {
          // prune: keep the grid a few hundred, not thousands
          if (minVol === 50000 && dur !== 'any') continue;
          push({
            family: 'hold-yes', loBand: lo, hiBand: hi, entryTiming: timing,
            durationBucket: dur, minVolume: minVol,
            label: `HOLD-YES band[${lo},${hi}] @${timing} dur=${dur} vol>=${minVol}`,
          });
        }
      }
    }
  }

  // ---- FAMILY 2: HOLD-TO-RESOLUTION, NO side (fade longshots) ----
  const noBands = [
    [0.02, 0.15], [0.03, 0.10], [0.05, 0.20], [0.02, 0.10],
    [0.10, 0.25], [0.01, 0.05], [0.03, 0.30],
  ];
  for (const [lo, hi] of noBands) {
    for (const timing of timings) {
      for (const dur of durations) {
        for (const minVol of minVols) {
          if (minVol === 50000 && dur !== 'any') continue;
          push({
            family: 'hold-no', loBand: lo, hiBand: hi, entryTiming: timing,
            durationBucket: dur, minVolume: minVol,
            label: `HOLD-NO yesBand[${lo},${hi}] @${timing} dur=${dur} vol>=${minVol}`,
          });
        }
      }
    }
  }

  // ---- FAMILY 3: PATH mean-reversion (longer-dated) ----
  const mrParams = [
    { lookback: 10, dropThresh: 0.05, takeProfit: 0.05, stopLoss: 0.10 },
    { lookback: 20, dropThresh: 0.08, takeProfit: 0.08, stopLoss: 0.12 },
    { lookback: 10, dropThresh: 0.10, takeProfit: 0.10, stopLoss: 0.15 },
    { lookback: 30, dropThresh: 0.10, takeProfit: 0.10, stopLoss: 0.20 },
  ];
  for (const p of mrParams) {
    for (const dur of ['any', '4-14d', '15+']) {
      for (const minVol of [0, 1000]) {
        push({
          family: 'meanrev', loBand: 0.05, hiBand: 0.95,
          durationBucket: dur, minVolume: minVol, entryTiming: 'first', ...p,
          label: `MEANREV look${p.lookback} drop${p.dropThresh} tp${p.takeProfit} sl${p.stopLoss} dur=${dur} vol>=${minVol}`,
        });
      }
    }
  }

  // ---- FAMILY 4: PATH momentum (longer-dated) ----
  const momParams = [
    { lookback: 10, upThresh: 0.05, takeProfit: 0.05, stopLoss: 0.10 },
    { lookback: 20, upThresh: 0.08, takeProfit: 0.08, stopLoss: 0.12 },
    { lookback: 10, upThresh: 0.10, takeProfit: 0.10, stopLoss: 0.15 },
    { lookback: 30, upThresh: 0.10, takeProfit: 0.10, stopLoss: 0.20 },
  ];
  for (const p of momParams) {
    for (const dur of ['any', '4-14d', '15+']) {
      for (const minVol of [0, 1000]) {
        push({
          family: 'momentum', loBand: 0.05, hiBand: 0.95,
          durationBucket: dur, minVolume: minVol, entryTiming: 'first', ...p,
          label: `MOMENTUM look${p.lookback} up${p.upThresh} tp${p.takeProfit} sl${p.stopLoss} dur=${dur} vol>=${minVol}`,
        });
      }
    }
  }

  return configs;
}

module.exports = {
  adapt, backtestFn, buildGrid, effectiveSpread,
  inDurationBucket, priceAsOf, entryObs, STAKE,
};
