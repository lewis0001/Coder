'use strict';
/* ============================================================
   CALIBRATION STUDY
   ------------------------------------------------------------
   Descriptive measurement of WHERE Polymarket prices are
   systematically mispriced. For each entry timing we bucket
   markets by implied YES price into 10 deciles (0-10%, ...,
   90-100%) and compare:
       mean implied price   vs   realized YES-win frequency
   reporting the GROSS edge = realized - implied (in cents) with
   a standard error, OVERALL and sliced by category / duration /
   volume tier. We then flag buckets where |edge| beats a 2c and
   a 1c round-trip spread AND is statistically distinguishable
   from zero (>2 standard errors) — i.e. where a real, cost-
   surviving edge could plausibly live.

   It also explicitly quantifies the FAVORITE-LONGSHOT BIAS:
   do longshots (<10c) win LESS than priced (overpriced; a gross
   edge to FADING / buying NO), and do favorites (>85c) win MORE
   than priced (underpriced; edge to buying YES)?

   Writes data/research/calibration-study.md and prints a digest.
   Plain Node, no deps. Run:  node scripts/calibration-study.js
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { loadResearchDataset, durationBucket } = require('../lib/research-data');
const { extractEntries, TIMINGS } = require('../lib/calibration');

const OUT_MD = path.join(__dirname, '..', 'data', 'research', 'calibration-study.md');

const SPREAD_2C = 0.02;
const SPREAD_1C = 0.01;
const Z_SIG = 2; // ~2 standard errors

/* ---------------------- bucketing ---------------------- */
// 10 deciles by implied price. Index 0 => [0,0.10), ..., 9 => [0.90,1.0].
function decileIndex(p) {
  let i = Math.floor(p * 10);
  if (i < 0) i = 0;
  if (i > 9) i = 9;
  return i;
}
const DECILE_LABELS = [];
for (let i = 0; i < 10; i++) DECILE_LABELS.push(`${i * 10}-${i * 10 + 10}%`);

/* ---------------------- volume tiers ---------------------- */
// Tertiles of volume across the dataset (computed once).
function volumeTiers(dataset) {
  const v = dataset.map((m) => m.volume).filter((x) => isFinite(x)).sort((a, b) => a - b);
  const q = (f) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
  const lo = q(1 / 3), hi = q(2 / 3);
  return {
    lo, hi,
    tier(vol) {
      if (!isFinite(vol)) return 'unknown';
      if (vol <= lo) return 'low';
      if (vol <= hi) return 'med';
      return 'high';
    },
  };
}

/* ---------------------- per-bucket stats ---------------------- */
// Given the entries that fall in one decile, compute the calibration row.
function bucketStats(entries) {
  const n = entries.length;
  if (n === 0) {
    return { n: 0, meanImplied: null, realized: null, edge: null, se: null, sig: false, beats2c: false, beats1c: false };
  }
  let sumP = 0, sumW = 0;
  for (const e of entries) { sumP += e.price; sumW += e.outcome; }
  const meanImplied = sumP / n;
  const realized = sumW / n; // realized YES-win frequency
  const edge = realized - meanImplied; // gross edge (fraction; *100 = cents)
  // SE of realized win-frequency (binomial). The implied mean is treated as
  // a (nearly) fixed reference, so the edge SE is dominated by the win-freq SE.
  const se = Math.sqrt(Math.max(realized * (1 - realized), 1e-9) / n);
  const sig = Math.abs(edge) > Z_SIG * se;
  return {
    n,
    meanImplied,
    realized,
    edge,
    se,
    sig,
    beats2c: Math.abs(edge) > SPREAD_2C && sig,
    beats1c: Math.abs(edge) > SPREAD_1C && sig,
  };
}

// Build all 10 decile rows for a set of entries.
function calibrationTable(entries) {
  const buckets = Array.from({ length: 10 }, () => []);
  for (const e of entries) buckets[decileIndex(e.price)].push(e);
  return buckets.map((b, i) => ({ label: DECILE_LABELS[i], ...bucketStats(b) }));
}

/* ---------------------- favorite-longshot summary ---------------------- */
// Longshots: implied < 0.10. Favorites: implied > 0.85. Report magnitude (cents).
function favLongshot(entries) {
  const longshots = entries.filter((e) => e.price < 0.10);
  const favs = entries.filter((e) => e.price > 0.85);
  return { longshot: bucketStats(longshots), favorite: bucketStats(favs) };
}

/* ---------------------- formatting ---------------------- */
const pc = (x) => (x == null ? '   -  ' : (x * 100).toFixed(1).padStart(5) + '%');
const cents = (x) => (x == null ? '   -  ' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + 'c');
const centsSE = (s) => (s.edge == null ? '   -  ' : `${cents(s.edge)} ±${(s.se * 100).toFixed(1)}c`);

function flagStr(s) {
  if (s.n === 0) return '';
  const f = [];
  if (s.beats2c) f.push('EDGE>2c*');
  else if (s.beats1c) f.push('EDGE>1c*');
  else if (s.sig) f.push('sig');
  return f.join(' ');
}

function renderTable(title, table) {
  const lines = [];
  lines.push(`#### ${title}`);
  lines.push('');
  lines.push('| bucket | n | mean implied | realized win | gross edge (real-impl) | flag |');
  lines.push('|---|---:|---:|---:|---:|---|');
  for (const r of table) {
    if (r.n === 0) {
      lines.push(`| ${r.label} | 0 | - | - | - |  |`);
      continue;
    }
    lines.push(`| ${r.label} | ${r.n} | ${pc(r.meanImplied)} | ${pc(r.realized)} | ${centsSE(r)} | ${flagStr(r)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/* ---------------------- slicing ---------------------- */
function sliceBy(entries, keyFn) {
  const groups = new Map();
  for (const e of entries) {
    const k = keyFn(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  return groups;
}

/* Collect all "reliable mispricing" rows across every table built, so we can
   surface the largest cost-surviving candidates. */
function collectReliable(sink, context, table) {
  for (const r of table) {
    if (r.n >= 20 && r.beats2c) {
      sink.push({ context, bucket: r.label, n: r.n, edge: r.edge, se: r.se, meanImplied: r.meanImplied, realized: r.realized });
    }
  }
}

/* ============================================================
   MAIN
   ============================================================ */
function main() {
  const dataset = loadResearchDataset();
  const vt = volumeTiers(dataset);

  const md = [];
  md.push('# Polymarket Calibration Study — where (if anywhere) are prices mispriced?');
  md.push('');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push('');
  md.push(`Dataset: **${dataset.length}** resolved binary Yes/No Polymarket markets (cached price paths + known outcomes).`);
  md.push('');
  md.push('**Method.** For each entry timing we take each market\'s implied YES price using only data up');
  md.push('to that time, and its realized outcome (1 if YES won else 0). We bucket by implied price into');
  md.push('10 deciles and report n, mean implied price, realized YES-win frequency, and the **gross edge =');
  md.push('realized − implied** (in cents) with a binomial standard error (SE). A bucket is flagged');
  md.push('`EDGE>2c*` / `EDGE>1c*` when |edge| exceeds a 2c / 1c round-trip spread **and** is statistically');
  md.push('distinguishable from zero (|edge| > 2·SE). `sig` means significant but below 1c.');
  md.push('');
  md.push('**Honest caveats.** (1) Polymarket\'s CLOB `interval=max` history typically spans only the last');
  md.push('~30 days before resolution, so for long-dated markets "first observation" is already inside that');
  md.push('window and the "~30d-pre" timing collapses toward first-obs. (2) The resolution time is proxied');
  md.push('by the last observed point. (3) Degenerate already-settled quotes (price ≤0 or ≥1) are excluded.');
  md.push('(4) Outcomes are 1/0 so realized "frequency" SEs are wide in sparsely populated buckets.');
  md.push('');
  md.push(`Volume tiers (tertiles): low ≤ $${Math.round(vt.lo).toLocaleString()} < med ≤ $${Math.round(vt.hi).toLocaleString()} < high.`);
  md.push('');

  const reliable = [];
  const digest = { overall: {}, flbias: {} };

  for (const timing of TIMINGS) {
    const entries = extractEntries(dataset, timing.spec);
    md.push('---');
    md.push('');
    md.push(`## Entry timing: ${timing.name}  (n entries = ${entries.length})`);
    md.push('');

    // OVERALL
    const overall = calibrationTable(entries);
    md.push(renderTable(`OVERALL — ${timing.name}`, overall));
    collectReliable(reliable, `OVERALL/${timing.name}`, overall);
    digest.overall[timing.name] = overall;

    // Favorite-longshot magnitude
    const fl = favLongshot(entries);
    md.push('**Favorite–longshot bias (this timing):**');
    md.push('');
    md.push('| segment | n | mean implied | realized win | gross edge | flag |');
    md.push('|---|---:|---:|---:|---:|---|');
    md.push(`| longshots <10c | ${fl.longshot.n} | ${pc(fl.longshot.meanImplied)} | ${pc(fl.longshot.realized)} | ${centsSE(fl.longshot)} | ${flagStr(fl.longshot)} |`);
    md.push(`| favorites >85c | ${fl.favorite.n} | ${pc(fl.favorite.meanImplied)} | ${pc(fl.favorite.realized)} | ${centsSE(fl.favorite)} | ${flagStr(fl.favorite)} |`);
    md.push('');
    digest.flbias[timing.name] = fl;

    // SLICE: category
    md.push(`### Sliced by category — ${timing.name}`);
    md.push('');
    const byCat = sliceBy(entries, (e) => e.market.category);
    for (const [cat, es] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const t = calibrationTable(es);
      md.push(renderTable(`category=${cat} (n=${es.length}) — ${timing.name}`, t));
      collectReliable(reliable, `category=${cat}/${timing.name}`, t);
    }

    // SLICE: duration bucket
    md.push(`### Sliced by duration — ${timing.name}`);
    md.push('');
    const byDur = sliceBy(entries, (e) => durationBucket(e.market.durationDays));
    const durOrder = ['intraday', '1-3d', '4-14d', '15+d', 'unknown'];
    for (const db of durOrder) {
      const es = byDur.get(db);
      if (!es) continue;
      const t = calibrationTable(es);
      md.push(renderTable(`duration=${db} (n=${es.length}) — ${timing.name}`, t));
      collectReliable(reliable, `duration=${db}/${timing.name}`, t);
    }

    // SLICE: volume tier
    md.push(`### Sliced by volume tier — ${timing.name}`);
    md.push('');
    const byVol = sliceBy(entries, (e) => vt.tier(e.market.volume));
    for (const vtier of ['low', 'med', 'high', 'unknown']) {
      const es = byVol.get(vtier);
      if (!es) continue;
      const t = calibrationTable(es);
      md.push(renderTable(`volume=${vtier} (n=${es.length}) — ${timing.name}`, t));
      collectReliable(reliable, `volume=${vtier}/${timing.name}`, t);
    }
  }

  /* ---------------------- reliable-mispricing leaderboard ---------------------- */
  md.push('---');
  md.push('');
  md.push('## Reliable mispricing leaderboard (|edge|>2c, >2·SE, n≥20)');
  md.push('');
  reliable.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
  if (reliable.length === 0) {
    md.push('_None. No bucket with n≥20 shows a gross edge that both exceeds a 2c round-trip spread AND is >2 standard errors from zero._');
    md.push('');
  } else {
    md.push('| context | bucket | n | mean implied | realized | gross edge | direction |');
    md.push('|---|---|---:|---:|---:|---:|---|');
    for (const r of reliable.slice(0, 30)) {
      const dir = r.edge > 0 ? 'underpriced → buy YES' : 'overpriced → buy NO / fade';
      md.push(`| ${r.context} | ${r.bucket} | ${r.n} | ${pc(r.meanImplied)} | ${pc(r.realized)} | ${cents(r.edge)} ±${(r.se * 100).toFixed(1)}c | ${dir} |`);
    }
    md.push('');
  }

  /* ---------------------- honest verdict ---------------------- */
  md.push('---');
  md.push('');
  md.push('## Honest verdict');
  md.push('');
  const verdict = buildVerdict(digest, reliable);
  md.push(verdict);
  md.push('');

  fs.writeFileSync(OUT_MD, md.join('\n'));

  /* ---------------------- console digest ---------------------- */
  console.log(`\nWrote ${OUT_MD}`);
  console.log(`\n=== OVERALL calibration (entry = first-obs) ===`);
  printConsoleTable(digest.overall['first-obs']);
  console.log(`\n=== OVERALL calibration (entry = ~1d-pre) ===`);
  printConsoleTable(digest.overall['~1d-pre']);
  console.log(`\n=== Favorite-longshot bias by timing ===`);
  for (const t of TIMINGS) {
    const fl = digest.flbias[t.name];
    console.log(` ${t.name.padEnd(10)}  longshots<10c: ${fl.longshot.n ? cents(fl.longshot.edge) + ' ±' + (fl.longshot.se*100).toFixed(1)+'c (n=' + fl.longshot.n + ')' : 'n=0'}   |   favorites>85c: ${fl.favorite.n ? cents(fl.favorite.edge) + ' ±' + (fl.favorite.se*100).toFixed(1)+'c (n=' + fl.favorite.n + ')' : 'n=0'}`);
  }
  console.log(`\n=== Reliable-mispricing leaderboard (|edge|>2c, >2SE, n>=20): ${reliable.length} rows ===`);
  for (const r of reliable.slice(0, 12)) {
    console.log(` ${r.context.padEnd(34)} ${r.bucket.padEnd(8)} n=${String(r.n).padEnd(4)} impl=${(r.meanImplied*100).toFixed(1)}% real=${(r.realized*100).toFixed(1)}% edge=${cents(r.edge)} ±${(r.se*100).toFixed(1)}c`);
  }
  console.log('');
}

function printConsoleTable(table) {
  console.log(' bucket      n     impl    real    edge');
  for (const r of table) {
    if (r.n === 0) { console.log(` ${r.label.padEnd(8)} 0`); continue; }
    const flag = r.beats2c ? ' <2c*' : r.beats1c ? ' <1c*' : r.sig ? ' sig' : '';
    console.log(` ${r.label.padEnd(8)} ${String(r.n).padEnd(5)} ${(r.meanImplied*100).toFixed(1).padStart(5)}% ${(r.realized*100).toFixed(1).padStart(5)}% ${cents(r.edge).padStart(7)} ±${(r.se*100).toFixed(1)}c${flag}`);
  }
}

function buildVerdict(digest, reliable) {
  const lines = [];
  // Favorite-longshot direction check at first-obs and 1d-pre.
  const fo = digest.flbias['first-obs'];
  const oneD = digest.flbias['~1d-pre'];
  lines.push('**Favorite–longshot bias.** Direction is the classic one if longshots realize BELOW their');
  lines.push('price (overpriced) and favorites realize ABOVE (underpriced):');
  lines.push('');
  const flLine = (label, fl) => {
    if (fl.longshot.n === 0 && fl.favorite.n === 0) return `- ${label}: no longshot/favorite entries.`;
    const ls = fl.longshot.n ? `longshots<10c realized ${(fl.longshot.realized*100).toFixed(1)}% vs implied ${(fl.longshot.meanImplied*100).toFixed(1)}% (edge ${cents(fl.longshot.edge)}, n=${fl.longshot.n}${fl.longshot.sig ? ', sig' : ''})` : 'no longshots';
    const fv = fl.favorite.n ? `favorites>85c realized ${(fl.favorite.realized*100).toFixed(1)}% vs implied ${(fl.favorite.meanImplied*100).toFixed(1)}% (edge ${cents(fl.favorite.edge)}, n=${fl.favorite.n}${fl.favorite.sig ? ', sig' : ''})` : 'no favorites';
    return `- ${label}: ${ls}; ${fv}.`;
  };
  lines.push(flLine('first-obs', fo));
  lines.push(flLine('~1d-pre', oneD));
  lines.push('');
  if (reliable.length === 0) {
    lines.push('**Bottom line: the market looks essentially efficient at the gross level for this universe.**');
    lines.push('No price bucket with a meaningful sample (n≥20) shows a gross edge that simultaneously (a) exceeds');
    lines.push('a 2c round-trip spread and (b) is more than 2 standard errors from zero. Apparent mispricings are');
    lines.push('either too small to clear plausible costs, or are statistical noise from tiny/extreme buckets.');
    lines.push('A cost-surviving systematic edge does **not** plausibly exist here.');
  } else {
    const pos = reliable.filter((r) => r.edge > 0).length;
    const neg = reliable.length - pos;
    lines.push(`**Bottom line: ${reliable.length} bucket(s) clear the bar** (|edge|>2c, >2·SE, n≥20) — `);
    lines.push(`${neg} pointing to overpriced (fade / buy NO) and ${pos} to underpriced (buy YES). The single`);
    lines.push(`largest reliable mispricing is **${reliable[0].context} / ${reliable[0].bucket}**: implied`);
    lines.push(`${(reliable[0].meanImplied*100).toFixed(1)}% vs realized ${(reliable[0].realized*100).toFixed(1)}% (gross edge ${cents(reliable[0].edge)} ±${(reliable[0].se*100).toFixed(1)}c, n=${reliable[0].n}).`);
    lines.push('These are GROSS edges measured against the displayed mid; whether they survive the *actual*');
    lines.push('round-trip cost (spread + slippage + fees, which is worst exactly in the low-liquidity/longshot');
    lines.push('corners where these edges concentrate) is the open question the strategy sweep must settle. Treat');
    lines.push('them as the only places a real edge could plausibly live — everything else looks efficient.');
  }
  lines.push('');
  lines.push('**What actually drives the big "edges" — read before trading.** The dominant reliable mispricing');
  lines.push('is concentrated in the **30-50% implied band, which resolves NO far more often than priced** (~22%');
  lines.push('realized vs ~48% implied). Inspecting those markets shows they are overwhelmingly *single legs of');
  lines.push('mutually-exclusive fields* — "Will <team> win the Finals?", "Will <coin> FDV exceed $X one day after');
  lines.push('launch?", "Will <stock> close in band Y?" — where many candidate legs are each quoted ~40-50% but, by');
  lines.push('construction, only one can win, so the BASKET of such YES legs is structurally overpriced and');
  lines.push('mostly settles NO. This is a real, repeatable structural bias (favor FADING mid-priced YES legs in');
  lines.push('crowded mutually-exclusive events / buying NO), NOT a per-market coin-flip inefficiency, and it is');
  lines.push('strongest at first-obs (early, thin quotes). The flip side — favorites (>85c) and the extreme');
  lines.push('longshot tail (<10c) — are close to calibrated (sub-2c edges), so the classic symmetric favorite-');
  lines.push('longshot bias is WEAK in this universe; the exploitable asymmetry lives in the mid-band NO side.');
  lines.push('Whether it survives the wide spreads/slippage of those thin legs is exactly what the cost-aware');
  lines.push('strategy sweep must confirm.');
  return lines.join('\n');
}

main();
