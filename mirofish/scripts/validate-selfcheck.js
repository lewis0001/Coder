'use strict';
/* ============================================================
   SELF-CHECK for lib/validate.js
   ------------------------------------------------------------
   We trust the harness only if it does two opposite things right:

   (A) NOISE TEST (guard against false positives / data-mining):
       Build N=200 "strategies" that have NO edge — each produces
       random per-trade PnLs with true mean 0. The best of 200 WILL
       look profitable on validation by luck. The harness must
       REJECT it: selectAndConfirm.profitable === false.

   (B) TRUE-EDGE TEST (guard against false negatives):
       One strategy has a small but real positive expectancy. The
       harness must be ABLE to detect it: profitable === true and a
       test-set CI lower bound > 0.

   Everything is deterministic (seeded PRNG) so PASS/FAIL is stable.
   ============================================================ */

const V = require('../lib/validate');

/* --- local seeded PRNG (independent of the harness's) --- */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Box-Muller normal
function makeNormal(rng) {
  return function (mu, sd) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/* Build a synthetic dataset: M markets spread across time so splitByTime
   produces clean train/val/test partitions. Each market just carries an
   endDate and an index; the "trades" live in the backtestFn closure. */
function makeDataset(M, seed) {
  const start = Date.UTC(2024, 0, 1);
  const day = 86400000;
  const data = [];
  for (let i = 0; i < M; i++) {
    data.push({
      id: 'm' + i,
      idx: i,
      endDate: new Date(start + i * day).toISOString(),
    });
  }
  return data;
}

/* A "candidate" backtestFn maps (market, cand) -> per-market result whose
   `.log` holds per-trade PnLs. We synthesise tradesPerMarket trades per
   market, drawn from a normal with the candidate's true mean/sd.
   Each (candidate, market) pair gets its own seed so results are stable
   and a candidate's edge is consistent across val and test. */
function makeBacktestFn(tradesPerMarket) {
  return function backtestFn(market, cand) {
    const rng = makeRng((cand.seed * 2654435761 + market.idx * 40503) >>> 0);
    const norm = makeNormal(rng);
    const log = [];
    let net = 0;
    for (let k = 0; k < tradesPerMarket; k++) {
      const pnl = norm(cand.trueMean, cand.sd);
      log.push({ netPnl: pnl });
      net += pnl;
    }
    return { netPnl: net, trades: log.length, log };
  };
}

function line() { console.log('-'.repeat(64)); }

let allPass = true;

/* ============================================================
   (A) NOISE TEST — N=200 no-edge strategies
   ============================================================ */
function noiseTest() {
  line();
  console.log('(A) NOISE TEST: 200 zero-edge strategies, best-of-200 must be REJECTED');
  line();

  const M = 240; // markets; ~120 train / 60 val / 60 test
  const dataset = makeDataset(M, 1);
  const split = V.splitByTime(dataset);

  const N = 200;
  const candidates = [];
  for (let i = 0; i < N; i++) {
    candidates.push({ seed: 1000 + i, trueMean: 0.0, sd: 1.0 }); // NO edge
  }
  const backtestFn = makeBacktestFn(4); // 4 trades/market

  const res = V.selectAndConfirm(candidates, split, backtestFn, {
    bootIters: 2000, rcIters: 2000, seed: 4242, rcSeed: 7,
  });

  console.log('best validation expectancy :', res.validationStats.expectancy.toFixed(4),
    '(t=' + res.validationStats.tStat.toFixed(2) + ', n=' + res.validationStats.n + ')');
  console.log('multiple-testing p (approx):', res.pValueApprox.toFixed(4));
  if (res.correction && res.correction.realityCheck) {
    const rc = res.correction.realityCheck;
    console.log('reality-check null p95     :', rc.nullQuantiles.p95.toFixed(4),
      ' observed best:', rc.bestObservedExpectancy.toFixed(4));
  }
  console.log('touched locked test set    :', res.touchedTest);
  console.log('verdict                    :', res.verdict);

  const ok = res.profitable === false;
  console.log('\nEXPECTED profitable=false  GOT profitable=' + res.profitable);
  console.log((ok ? 'PASS' : 'FAIL') + ' — noise correctly ' + (ok ? 'REJECTED' : 'ACCEPTED (false positive!)'));
  if (!ok) allPass = false;
  return ok;
}

/* ============================================================
   (B) TRUE-EDGE TEST — one real edge among decoys
   ============================================================ */
function edgeTest() {
  line();
  console.log('(B) TRUE-EDGE TEST: one real small edge must be DETECTED');
  line();

  const M = 240;
  const dataset = makeDataset(M, 2);
  const split = V.splitByTime(dataset);

  // One strong-but-realistic edge plus 199 no-edge decoys, so the harness
  // also has to pick the right one out of N=200.
  const N = 200;
  const candidates = [];
  // index 0 is the real edge: mean +0.18 per trade, sd 1.0  (decent Sharpe)
  candidates.push({ seed: 500, trueMean: 0.18, sd: 1.0 });
  for (let i = 1; i < N; i++) candidates.push({ seed: 2000 + i, trueMean: 0.0, sd: 1.0 });

  const backtestFn = makeBacktestFn(6); // 6 trades/market -> more samples

  const res = V.selectAndConfirm(candidates, split, backtestFn, {
    bootIters: 2000, rcIters: 2000, seed: 4242, rcSeed: 7,
  });

  console.log('chosen candidate seed      :', res.bestCandidate.seed,
    '(true edge seed was 500)');
  console.log('validation expectancy      :', res.validationStats.expectancy.toFixed(4),
    '(t=' + res.validationStats.tStat.toFixed(2) + ', n=' + res.validationStats.n + ')');
  console.log('multiple-testing p (approx):', res.pValueApprox.toFixed(4));
  if (res.testStats) {
    console.log('TEST expectancy            :', res.testStats.expectancy.toFixed(4),
      '(n=' + res.testStats.n + ')');
    console.log('TEST 95% CI                : [' + res.testCI[0].toFixed(4) + ', ' + res.testCI[1].toFixed(4) + ']');
  }
  console.log('touched locked test set    :', res.touchedTest);
  console.log('verdict                    :', res.verdict);

  const pickedRight = res.bestCandidate.seed === 500;
  const ok = res.profitable === true && pickedRight;
  console.log('\nEXPECTED profitable=true   GOT profitable=' + res.profitable +
    ' (picked right edge=' + pickedRight + ')');
  console.log((ok ? 'PASS' : 'FAIL') + ' — true edge correctly ' + (ok ? 'DETECTED' : 'MISSED (false negative!)'));
  if (!ok) allPass = false;
  return ok;
}

noiseTest();
console.log('');
edgeTest();
line();
console.log(allPass ? 'OVERALL: PASS (harness rejects noise AND accepts a true edge)'
                    : 'OVERALL: FAIL');
line();
process.exit(allPass ? 0 : 1);
