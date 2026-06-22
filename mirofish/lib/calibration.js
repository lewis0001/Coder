'use strict';
/* ============================================================
   CALIBRATION HELPERS (descriptive measurement — no strategy)
   ------------------------------------------------------------
   Given the cached research dataset (resolved binary Polymarket
   markets, each with a YES-token price path and a known outcome),
   these helpers extract, FOR A CHOSEN ENTRY TIMING, each market's
   implied entry YES price and its realized outcome (1 if YES won,
   else 0). A downstream study then compares implied price vs
   realized win-frequency to measure where the market is mispriced.

   Key honesty constraints baked in here:
     - We only ever use information available UP TO the entry time
       ("price as of T" = the last observation at-or-before T,
       i.e. no peeking forward).
     - The CLOB `interval=max` history typically spans only the
       last ~30 days before resolution, so for long-dated markets
       the "first observation" is already inside that ~30d window,
       not the true market open. We treat the path's last timestamp
       as the resolution proxy and define the "N days before
       resolution" timings relative to it.
     - If a requested entry time falls BEFORE a market's first
       observation, that market simply has no usable entry at that
       timing and is excluded for that timing (not forward-filled
       from nothing).

   Zero dependencies. Plain Node.
   ============================================================ */

const DAY = 86400; // seconds

/* Last observed price AT or BEFORE time t (no look-ahead). Returns
   null if t precedes the first observation (no info available yet). */
function priceAsOf(path, t) {
  if (!Array.isArray(path) || path.length === 0) return null;
  if (t < path[0].t) return null;
  // binary search for the last point with point.t <= t
  let lo = 0, hi = path.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (path[mid].t <= t) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  if (ans < 0) return null;
  const p = path[ans].p;
  return (isFinite(p)) ? p : null;
}

/* Resolution-time proxy: the timestamp of the LAST observation in
   the path. (Prices typically pin to 0/1 at/after resolution; the
   last observed point is the closest we have to settlement.) */
function resolutionTime(path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  return path[path.length - 1].t;
}

/* Resolve an entry-timing SPEC to an absolute entry time for one market.
   Supported specs:
     { kind: 'first' }                  -> first observation
     { kind: 'beforeEnd', days: N }     -> N days before resolution proxy
   Returns the absolute time in seconds, or null if not determinable. */
function entryTimeFor(path, spec) {
  if (!Array.isArray(path) || path.length === 0) return null;
  if (spec.kind === 'first') return path[0].t;
  if (spec.kind === 'beforeEnd') {
    const tEnd = resolutionTime(path);
    if (tEnd == null) return null;
    return tEnd - spec.days * DAY;
  }
  return null;
}

/* For one market + one entry-timing spec, return:
     { price, outcome, t } where price is the implied YES entry price
     (using only data up to t), outcome is 1 if YES won else 0.
   Returns null if there is no usable entry at that timing for this
   market (e.g. the timing precedes the first observation, or the
   "before end" target equals/exceeds the last point so there is no
   genuine pre-resolution price). */
function entryFor(market, spec) {
  const path = market.path;
  if (!Array.isArray(path) || path.length < 1) return null;
  const t = entryTimeFor(path, spec);
  if (t == null) return null;

  // For "N days before end", require the target to be strictly before the
  // resolution proxy AND at/after the first observation, so it is a real
  // pre-resolution quote with information behind it.
  if (spec.kind === 'beforeEnd') {
    const tEnd = resolutionTime(path);
    if (t >= tEnd) return null;        // would be the settlement point itself
    if (t < path[0].t) return null;    // no observation that early -> exclude
  }

  const price = priceAsOf(path, t);
  if (price == null || !isFinite(price)) return null;
  // Guard: ignore degenerate already-settled quotes (exactly 0 or 1) — those
  // carry no calibration information (the market is already resolved in price).
  if (price <= 0 || price >= 1) return null;

  return {
    price,
    outcome: market.outcomeYesWon ? 1 : 0,
    t,
  };
}

/* Map an entry timing over a whole dataset, returning the kept entries
   (each tagged back to its market for later slicing). */
function extractEntries(dataset, spec) {
  const out = [];
  for (const m of dataset) {
    const e = entryFor(m, spec);
    if (!e) continue;
    out.push({
      price: e.price,
      outcome: e.outcome,
      t: e.t,
      market: m,
    });
  }
  return out;
}

/* Standard entry-timing specs used by the study. */
const TIMINGS = [
  { name: 'first-obs', spec: { kind: 'first' } },
  { name: '~30d-pre', spec: { kind: 'beforeEnd', days: 30 } },
  { name: '~7d-pre', spec: { kind: 'beforeEnd', days: 7 } },
  { name: '~1d-pre', spec: { kind: 'beforeEnd', days: 1 } },
];

module.exports = {
  DAY,
  priceAsOf,
  resolutionTime,
  entryTimeFor,
  entryFor,
  extractEntries,
  TIMINGS,
};
