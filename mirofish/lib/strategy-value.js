'use strict';
/* ============================================================
   VALUATION / MISPRICING strategies — honest test harness.
   ------------------------------------------------------------
   These are decide()-compatible strategies (same interface as
   lib/strategy.js):

       decide(market, history, position, cfg)
         -> { action:'enter'|'exit'|'hold', reason, confidence }

   The thesis under test (from the review): the plausible edge on
   Polymarket binaries is VALUATION, not momentum. Specifically:

     a. FAVORITE–LONGSHOT BIAS. Longshots (cheap YES) are
        systematically OVERpriced and resolve NO more often than
        their price implies; favorites (expensive YES) are
        UNDERpriced. Since the backtester only trades YES long,
        we express "fade the longshot" as simply NOT buying it,
        and instead BUYING THE FAVORITE (mid in ~0.80–0.95) and
        holding to resolution. If favorites are underpriced, this
        wins more than (entry-price) of the time, beating spread.

     b. MEAN REVERSION. Buy YES after a sharp DOWN-move that
        pushes the mid well below its recent average (dislocation),
        then hold for reversion / to resolution.

     c. BUY-AND-HOLD baseline at a configurable entry-price band.
        Used both as a strategy and (in the runner) to MEASURE the
        empirical calibration curve — does buying YES at price p
        actually win ~p of the time, and where are the biases?

   Design rules to avoid look-ahead and avoid curve-fitting:
     - Every strategy is a single, inspectable rule with round-number
       thresholds. No per-market tuning.
     - A strategy ENTERS AT MOST ONCE per market (first bar that
       satisfies its gate), then HOLDS to resolution. That makes
       per-market outcome == the calibration of the entry price,
       which is exactly what we want to measure. We do NOT add
       take-profit / stop-loss layers (those are the momentum
       machinery that already proved unprofitable).
     - `position` truthiness is how the backtester tells us we are
       already in; once in, we always 'hold' (let it settle at par).

   Each factory returns a `decide` plus a `name`/`label`.
   ============================================================ */

// ---- helpers (kept local; same spirit as lib/strategy.js) ----
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

function hoursUntil(endDate) {
  if (!endDate) return Infinity;
  return (new Date(endDate).getTime() - Date.now()) / 3600000;
}

/* ------------------------------------------------------------
   (a) FAVORITE strategy — buy underpriced favorites, hold to par.
   Buy the FIRST bar whose mid is in [favMin, favMax] (a strong but
   not-yet-certain favorite). Explicitly REFUSE longshots: we never
   buy below favMin. Hold to resolution (no momentum exits).
   ------------------------------------------------------------ */
function makeFavorite(cfg = {}) {
  const favMin = cfg.favMin != null ? cfg.favMin : 0.80;
  const favMax = cfg.favMax != null ? cfg.favMax : 0.95;
  const cutoffH = cfg.cutoffH != null ? cfg.cutoffH : 0; // don't enter past this many hrs-left
  function decide(market, history, position /*, c */) {
    if (position) return { action: 'hold', reason: 'hold-to-resolution', confidence: 0.5 };
    const mid = market.mid;
    if (mid < favMin || mid > favMax) return { action: 'hold', reason: 'not a favorite', confidence: 0 };
    if (cutoffH > 0 && hoursUntil(market.endDate) < cutoffH) {
      return { action: 'hold', reason: 'too close to resolution', confidence: 0 };
    }
    return { action: 'enter', reason: `favorite @${(mid * 100).toFixed(0)}c`, confidence: 0.6 };
  }
  return { name: 'favorite', label: `Favorite buy ${favMin}-${favMax}`, decide };
}

/* ------------------------------------------------------------
   (b) MEAN-REVERSION strategy — buy a fresh down-dislocation.
   Compute the recent average mid over `lookback` bars. If the
   current mid is BELOW that average by >= `dropMin` (a sharp dip),
   AND the mid is in a sane band (not a dying longshot, not already
   a near-certain favorite), buy once and hold to resolution.
   The bet: the dip over-shot and the price reverts.
   ------------------------------------------------------------ */
function makeMeanRevert(cfg = {}) {
  const lookback = cfg.lookback != null ? cfg.lookback : 12;
  const dropMin = cfg.dropMin != null ? cfg.dropMin : 0.08; // mid must be >=8c below recent avg
  const bandMin = cfg.bandMin != null ? cfg.bandMin : 0.15;
  const bandMax = cfg.bandMax != null ? cfg.bandMax : 0.85;
  function decide(market, history, position /*, c */) {
    if (position) return { action: 'hold', reason: 'hold-to-resolution', confidence: 0.5 };
    const mid = market.mid;
    if (mid < bandMin || mid > bandMax) return { action: 'hold', reason: 'outside band', confidence: 0 };
    if (history.length < lookback) return { action: 'hold', reason: 'warming up', confidence: 0 };
    const recent = history.slice(-lookback - 1, -1); // bars BEFORE the current one
    if (recent.length < 2) return { action: 'hold', reason: 'warming up', confidence: 0 };
    const avg = mean(recent);
    const drop = avg - mid; // positive => price fell below its recent average
    if (drop < dropMin) return { action: 'hold', reason: 'no dislocation', confidence: 0 };
    return { action: 'enter', reason: `revert dip -${(drop * 100).toFixed(1)}c @${(mid * 100).toFixed(0)}c`, confidence: 0.6 };
  }
  return { name: 'meanrevert', label: `Mean-revert dip>=${dropMin} band ${bandMin}-${bandMax}`, decide };
}

/* ------------------------------------------------------------
   (c) BUY-AND-HOLD baseline at an entry-price bucket.
   Buy the FIRST bar whose mid falls in [lo, hi); hold to par.
   With lo/hi sweeping the deciles this directly traces the
   calibration curve under the REAL cost model.
   ------------------------------------------------------------ */
function makeBuyHold(lo, hi, cfg = {}) {
  const label = cfg.label || `Buy&hold ${Math.round(lo * 100)}-${Math.round(hi * 100)}c`;
  function decide(market, history, position /*, c */) {
    if (position) return { action: 'hold', reason: 'hold-to-resolution', confidence: 0.5 };
    const mid = market.mid;
    if (mid < lo || mid >= hi) return { action: 'hold', reason: 'outside bucket', confidence: 0 };
    return { action: 'enter', reason: `bucket @${(mid * 100).toFixed(0)}c`, confidence: 0.5 };
  }
  return { name: `buyhold_${Math.round(lo * 100)}_${Math.round(hi * 100)}`, label, decide };
}

module.exports = {
  makeFavorite,
  makeMeanRevert,
  makeBuyHold,
  hoursUntil,
  mean,
};
