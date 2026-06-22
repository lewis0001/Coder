'use strict';
/* ============================================================
   ANTI-OVERFITTING VALIDATION HARNESS
   ------------------------------------------------------------
   We are about to brute-force HUNDREDS of strategy configs against
   historical Polymarket data. If you test enough knobs, some config
   WILL look profitable purely by luck and then bleed money live.
   This file is the immune system against that failure mode.

   It provides four things:

   1. SPLITTING — a deterministic chronological walk-forward split by
      market resolution date: TRAIN (oldest ~50%), VALIDATION
      (next ~25%), and a LOCKED TEST/HOLDOUT (newest ~25%). The test
      set must be touched EXACTLY ONCE, on the single best candidate.
      Also a k-fold-by-time option for more robust selection.

   2. METRICS WITH UNCERTAINTY — for a vector of per-trade PnLs:
      mean expectancy, total net PnL, win rate, t-stat, and a
      BOOTSTRAP 95% CI on the mean. "Profitable" REQUIRES the LOWER
      bound of the bootstrap CI on the TEST set to be > 0.

   3. MULTIPLE-TESTING CORRECTION — when you pick the best of N configs
      you have implicitly run N hypothesis tests. We correct for this
      two ways:
        (a) Bonferroni-adjusted significance threshold (alpha/N).
        (b) A White's-Reality-Check / "deflated expectancy" style
            bootstrap: estimate the null distribution of the BEST-of-N
            mean PnL assuming NO edge, then ask how often pure chance
            beats the observed best. That tail probability is the
            data-mining-adjusted p-value.

   4. selectAndConfirm — the full honest pipeline: rank candidates on
      VALIDATION, take the top one, apply multiple-testing correction
      with N = number of candidates, then — only if it survives —
      evaluate that ONE candidate on the LOCKED TEST set and return a
      final verdict.

   Plain Node, zero dependencies. A seeded PRNG keeps everything
   deterministic so the same dataset always yields the same verdict.
   ============================================================ */

/* ---------- deterministic PRNG (mulberry32) ----------
   Bootstrap must be reproducible: a "winner" can't depend on which
   way the RNG happened to fall today. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   1. SPLITTING
   ============================================================ */

/* Pull a comparable resolution timestamp (ms) out of a market record.
   Accepts endDate (ISO/Date/number) or durationDays as a fallback. */
function resolutionTime(m) {
  if (m == null) return 0;
  if (m.endDate != null) {
    const t = new Date(m.endDate).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (m.endUnix != null) return Number(m.endUnix) * 1000;
  if (m.resolutionDate != null) {
    const t = new Date(m.resolutionDate).getTime();
    if (!Number.isNaN(t)) return t;
  }
  // last resort: durationDays as a relative ordering key (no absolute meaning)
  if (m.durationDays != null) return Number(m.durationDays) * 86400000;
  return 0;
}

/* Chronological three-way split by resolution date.
   TRAIN = oldest trainFrac, VALIDATION = next valFrac, TEST = newest rest.
   Returns { train, validation, test, order } where order is the sorted
   array, plus the index boundaries so callers can audit the split. */
function splitByTime(dataset, opts = {}) {
  const trainFrac = opts.trainFrac != null ? opts.trainFrac : 0.5;
  const valFrac = opts.valFrac != null ? opts.valFrac : 0.25;
  if (!Array.isArray(dataset)) throw new Error('splitByTime: dataset must be an array');

  // Sort oldest -> newest. Stable: tie-break by original index so the split
  // is fully deterministic even when many markets resolve at the same time.
  const indexed = dataset.map((m, i) => ({ m, i, t: resolutionTime(m) }));
  indexed.sort((a, b) => (a.t - b.t) || (a.i - b.i));
  const order = indexed.map((x) => x.m);

  const n = order.length;
  const trainEnd = Math.floor(n * trainFrac);
  const valEnd = Math.floor(n * (trainFrac + valFrac));

  return {
    train: order.slice(0, trainEnd),
    validation: order.slice(trainEnd, valEnd),
    test: order.slice(valEnd),
    order,
    bounds: { n, trainEnd, valEnd },
  };
}

/* k-fold-by-time: split the chronologically-sorted data into k contiguous
   blocks. Each fold uses one block as "validation" and the blocks BEFORE it
   as "train" (expanding/walk-forward window — never trains on the future).
   The very first block can't be a validation fold (no past to train on), so
   we return k-1 usable folds. */
function kFoldByTime(dataset, k = 5) {
  if (k < 2) throw new Error('kFoldByTime: k must be >= 2');
  const indexed = dataset.map((m, i) => ({ m, i, t: resolutionTime(m) }));
  indexed.sort((a, b) => (a.t - b.t) || (a.i - b.i));
  const order = indexed.map((x) => x.m);
  const n = order.length;

  const blocks = [];
  for (let f = 0; f < k; f++) {
    const lo = Math.floor((n * f) / k);
    const hi = Math.floor((n * (f + 1)) / k);
    blocks.push(order.slice(lo, hi));
  }
  const folds = [];
  for (let f = 1; f < k; f++) {
    let train = [];
    for (let g = 0; g < f; g++) train = train.concat(blocks[g]);
    folds.push({ fold: f, train, validation: blocks[f] });
  }
  return folds;
}

/* ============================================================
   2. METRICS WITH UNCERTAINTY
   ============================================================ */

function mean(xs) {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function stdev(xs) {
  const nn = xs.length;
  if (nn < 2) return 0;
  const mu = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - mu) * (x - mu);
  return Math.sqrt(s / (nn - 1)); // sample stdev
}

/* Bootstrap the sampling distribution of the MEAN of `pnls`.
   Resamples with replacement `iters` times; returns the sorted means and
   the [lo, hi] percentile CI. Deterministic given `seed`. */
function bootstrapMeans(pnls, iters = 2000, seed = 12345, ci = 0.95) {
  const n = pnls.length;
  if (n === 0) return { means: [], lo: 0, hi: 0 };
  const rng = makeRng(seed);
  const means = new Array(iters);
  for (let b = 0; b < iters; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += pnls[(rng() * n) | 0];
    }
    means[b] = s / n;
  }
  means.sort((a, b) => a - b);
  const alpha = (1 - ci) / 2;
  const lo = means[Math.floor(alpha * iters)];
  const hi = means[Math.min(iters - 1, Math.floor((1 - alpha) * iters))];
  return { means, lo, hi };
}

/* Full metric bundle for one set of per-trade PnLs. */
function tradeMetrics(pnls, opts = {}) {
  const iters = opts.bootIters != null ? opts.bootIters : 2000;
  const seed = opts.seed != null ? opts.seed : 12345;
  const ci = opts.ci != null ? opts.ci : 0.95;

  const n = pnls.length;
  const mu = mean(pnls);
  const sd = stdev(pnls);
  const total = mu * n;
  const wins = pnls.filter((x) => x > 0).length;
  const winRate = n ? wins / n : 0;
  // t-stat of mean vs 0 = mean / (sd/sqrt(n))
  const se = n > 0 && sd > 0 ? sd / Math.sqrt(n) : 0;
  const tStat = se > 0 ? mu / se : 0;

  const boot = bootstrapMeans(pnls, iters, seed, ci);

  return {
    n,
    expectancy: mu,        // mean per-trade PnL
    totalNetPnl: total,
    winRate,
    stdev: sd,
    tStat,
    bootLo: boot.lo,       // lower bound of CI on mean per-trade PnL
    bootHi: boot.hi,
    ci,
    // The single gate that matters on TEST: is the CI lower bound > 0?
    ciExcludesZero: boot.lo > 0,
  };
}

/* ============================================================
   3. MULTIPLE-TESTING CORRECTION
   ============================================================ */

/* (a) Bonferroni: with N configs tested, a per-test alpha must shrink to
   alpha/N to keep the family-wise error rate at alpha. We convert the
   observed t-stat into a (normal-approx) one-sided p-value and compare it
   to the Bonferroni threshold. */
function normalCdf(z) {
  // Abramowitz & Stegun 7.1.26 approximation of erf
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 +
    t * (-1.821255978 + t * 1.330274429))));
  if (z > 0) p = 1 - p;
  return p;
}

function bonferroni(bestStats, N, alpha = 0.05) {
  const adjAlpha = alpha / Math.max(1, N);
  const z = bestStats.tStat || 0;
  const pOneSided = 1 - normalCdf(z); // P(t-stat this large under null mean=0)
  return {
    rawP: pOneSided,
    adjAlpha,
    N,
    alpha,
    pass: pOneSided < adjAlpha,
  };
}

/* (b) White's Reality Check / deflated-best bootstrap.
   The honest question is NOT "is this one config's mean > 0", it is
   "could the BEST of N configs look this good if NONE of them had an edge?"

   We simulate the null directly. For each config we have its per-trade PnL
   vector. Under the null each config's TRUE expectancy is 0, so we DE-MEAN
   each config (subtract its own mean) to kill any real edge, then bootstrap.
   On each bootstrap iteration we resample every config and record the MAX
   demeaned mean across all N configs — that is the best-of-N statistic you
   would expect from luck alone. The p-value is the fraction of null
   best-of-N draws that meet or beat the observed best config's REAL
   (centered) expectancy.

   pnlByConfig : array (length N) of per-trade PnL arrays (the validation
                 PnLs for every candidate).
   bestStats   : metrics of the chosen (highest-expectancy) config.        */
function realityCheck(pnlByConfig, bestObservedExpectancy, opts = {}) {
  const iters = opts.iters != null ? opts.iters : 2000;
  const seed = opts.seed != null ? opts.seed : 99991;
  const N = pnlByConfig.length;
  if (N === 0) return { pValue: 1, iters, N, nullQuantiles: {} };

  // De-mean each config so its null expectancy is exactly 0.
  const centered = pnlByConfig.map((arr) => {
    const mu = mean(arr);
    return arr.map((x) => x - mu);
  });

  const rng = makeRng(seed);
  const bestOfN = new Array(iters);
  for (let b = 0; b < iters; b++) {
    let best = -Infinity;
    for (let c = 0; c < N; c++) {
      const arr = centered[c];
      const m = arr.length;
      if (m === 0) continue;
      let s = 0;
      for (let i = 0; i < m; i++) s += arr[(rng() * m) | 0];
      const mu = s / m;
      if (mu > best) best = mu;
    }
    bestOfN[b] = best;
  }
  bestOfN.sort((a, b) => a - b);

  // p-value: how often does luck-only best-of-N reach the observed best?
  let ge = 0;
  for (let b = 0; b < iters; b++) if (bestOfN[b] >= bestObservedExpectancy) ge++;
  const pValue = (ge + 1) / (iters + 1); // +1 smoothing, never reports exactly 0

  const q = (p) => bestOfN[Math.min(iters - 1, Math.floor(p * iters))];
  return {
    pValue,
    iters,
    N,
    nullQuantiles: { p50: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99) },
    bestObservedExpectancy,
  };
}

/* Combined gate. Given the best config's stats and the population of
   per-config validation PnLs, decide whether the apparent edge survives
   BOTH corrections. */
function isLikelyRealEdge(bestStats, N, opts = {}) {
  const alpha = opts.alpha != null ? opts.alpha : 0.05;
  const reasons = [];

  // Need a minimum sample of trades to say anything at all.
  const minTrades = opts.minTrades != null ? opts.minTrades : 30;
  if (!bestStats || bestStats.n < minTrades) {
    return {
      pass: false,
      reason: `too few trades (${bestStats ? bestStats.n : 0} < ${minTrades}) to judge`,
      pValueApprox: 1,
    };
  }

  // (a) Bonferroni on the t-stat.
  const bon = bonferroni(bestStats, N, alpha);
  if (!bon.pass) {
    reasons.push(`bonferroni fail: rawP=${bon.rawP.toExponential(2)} >= alpha/N=${bon.adjAlpha.toExponential(2)}`);
  }

  // (b) Reality-check bootstrap, if the caller supplied the per-config PnLs.
  let rc = null;
  if (opts.pnlByConfig && opts.pnlByConfig.length) {
    rc = realityCheck(opts.pnlByConfig, bestStats.expectancy, {
      iters: opts.rcIters, seed: opts.rcSeed,
    });
    if (rc.pValue >= alpha) {
      reasons.push(`reality-check fail: best-of-${N} p=${rc.pValue.toFixed(4)} >= ${alpha}`);
    }
  }

  // Expectancy itself must be positive on validation.
  if (bestStats.expectancy <= 0) reasons.push('validation expectancy <= 0');

  const pValueApprox = rc ? rc.pValue : bon.rawP;
  const pass = reasons.length === 0;
  return {
    pass,
    reason: pass
      ? `survived correction (bonferroni rawP=${bon.rawP.toExponential(2)} < ${bon.adjAlpha.toExponential(2)}${rc ? `, reality-check p=${rc.pValue.toFixed(4)}` : ''})`
      : reasons.join('; '),
    pValueApprox,
    bonferroni: bon,
    realityCheck: rc,
  };
}

/* ============================================================
   helper: run a per-market backtest over a set of markets and collect
   the flat per-trade PnL vector. The backtestFn must return an object
   with a `.log` array of per-trade results (each having `.netPnl`),
   matching lib/backtest.js's backtestMarket().
   ============================================================ */
function collectPnls(markets, backtestFn) {
  const pnls = [];
  for (const m of markets) {
    const r = backtestFn(m);
    if (r && Array.isArray(r.log)) {
      for (const tr of r.log) {
        if (tr && typeof tr.netPnl === 'number') pnls.push(tr.netPnl);
      }
    } else if (r && typeof r.netPnl === 'number' && r.trades > 0) {
      // fallback: only aggregate available -> treat each market as one "trade"
      pnls.push(r.netPnl);
    }
  }
  return pnls;
}

/* ============================================================
   4. selectAndConfirm  — the full honest pipeline
   ============================================================
   candidates   : array of arbitrary config objects.
   datasetSplit : output of splitByTime (needs .validation and .test).
   backtestFn   : (market, candidate) => per-market result with `.log`.
   ============================================================ */
function selectAndConfirm(candidates, datasetSplit, backtestFn, opts = {}) {
  const N = candidates.length;
  const alpha = opts.alpha != null ? opts.alpha : 0.05;
  const metricOpts = { bootIters: opts.bootIters, seed: opts.seed, ci: opts.ci };

  if (!datasetSplit || !datasetSplit.validation || !datasetSplit.test) {
    throw new Error('selectAndConfirm: datasetSplit must have .validation and .test');
  }
  if (N === 0) {
    return { profitable: false, verdict: 'no candidates supplied', testCI: null, pValueApprox: 1 };
  }

  // --- Evaluate EVERY candidate on VALIDATION only ---
  const valResults = candidates.map((cand, idx) => {
    const pnls = collectPnls(datasetSplit.validation, (m) => backtestFn(m, cand));
    const stats = tradeMetrics(pnls, metricOpts);
    return { idx, cand, pnls, stats };
  });

  // --- Rank by validation expectancy (mean per-trade PnL) ---
  const ranked = valResults.slice().sort((a, b) => b.stats.expectancy - a.stats.expectancy);
  const best = ranked[0];

  // --- Multiple-testing correction using N = number of candidates ---
  const correction = isLikelyRealEdge(best.stats, N, {
    alpha,
    pnlByConfig: valResults.map((v) => v.pnls),
    rcIters: opts.rcIters,
    rcSeed: opts.rcSeed,
    minTrades: opts.minTrades,
  });

  // If the best candidate doesn't even survive the validation-set correction,
  // we DO NOT touch the locked test set. Reject now.
  if (!correction.pass) {
    return {
      profitable: false,
      verdict: `REJECTED on validation (no edge survives multiple-testing correction). ${correction.reason}`,
      bestCandidate: best.cand,
      validationStats: best.stats,
      correction,
      testCI: null,
      pValueApprox: correction.pValueApprox,
      touchedTest: false,
    };
  }

  // --- LOCKED TEST: evaluate the ONE chosen candidate exactly once ---
  const testPnls = collectPnls(datasetSplit.test, (m) => backtestFn(m, best.cand));
  const testStats = tradeMetrics(testPnls, metricOpts);

  // The hard gate: profitable ONLY if the bootstrap CI lower bound on the
  // TEST set is strictly > 0.
  const profitable = testStats.ciExcludesZero && testStats.expectancy > 0;

  return {
    profitable,
    verdict: profitable
      ? `CONFIRMED edge: survived multiple-testing on validation AND test-set 95% CI lower bound (${testStats.bootLo.toFixed(4)}) > 0. Expectancy ${testStats.expectancy.toFixed(4)}/trade over ${testStats.n} held-out trades.`
      : `NOT confirmed: passed validation correction but test-set CI lower bound (${testStats.bootLo.toFixed(4)}) <= 0 (expectancy ${testStats.expectancy.toFixed(4)}). Out-of-sample edge not established.`,
    bestCandidate: best.cand,
    validationStats: best.stats,
    correction,
    testStats,
    testCI: [testStats.bootLo, testStats.bootHi],
    pValueApprox: correction.pValueApprox,
    touchedTest: true,
  };
}

module.exports = {
  // splitting
  splitByTime,
  kFoldByTime,
  resolutionTime,
  // metrics
  tradeMetrics,
  bootstrapMeans,
  mean,
  stdev,
  // multiple-testing
  bonferroni,
  realityCheck,
  isLikelyRealEdge,
  normalCdf,
  // pipeline
  collectPnls,
  selectAndConfirm,
  // util
  makeRng,
};
