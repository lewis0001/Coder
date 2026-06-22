'use strict';
/* ============================================================
   scripts/fetch-research-data.js
   ------------------------------------------------------------
   Build a LARGE, DIVERSE, cached research dataset of RESOLVED
   binary (Yes/No) Polymarket markets with KNOWN outcomes and
   price histories.

   Pipeline:
     1) Page MANY candidate markets from Gamma across several
        orderings, de-dupe by id, keep only clean 1/0-settled
        Yes/No markets (winner unambiguous).
     2) Fetch + cache each market's YES-token price PATH from the
        CLOB (data/research/history/<tokenId>.json) so reruns are
        offline. Keep markets with >= 20 price points.
     3) Print progress + a summary: total usable, distribution by
        durationDays bucket, by rough category, by entry-price
        bucket.
     4) Write data/research/manifest.json listing the usable
        markets (id, file, outcome, durationDays, liquidity,
        firstPrice, ...).

   Plain Node, zero deps. Polite to the API (small concurrency,
   retries, skip-on-failure).

   Usage:
     node scripts/fetch-research-data.js [--max-offset=2000]
        [--concurrency=4] [--min-points=20] [--refresh]
        [--max-candidates=N]
   ============================================================ */

const fs = require('fs');
const path = require('path');
const {
  fetchCandidateMarkets,
  fetchHistoriesConcurrent,
  durationBucket,
  priceBucket,
  RESEARCH_DIR,
  HIST_DIR,
  MARKETS_CACHE,
  MANIFEST,
} = require('../lib/research-data');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  if (process.argv.includes(`--${name}`)) return true;
  return def;
}

function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch { /* exists */ } }

function tally(arr, keyFn) {
  const m = {};
  for (const x of arr) { const k = keyFn(x); m[k] = (m[k] || 0) + 1; }
  return m;
}

function printTally(title, obj, order) {
  console.log(`\n  ${title}`);
  const keys = order ? order.filter((k) => k in obj).concat(Object.keys(obj).filter((k) => !order.includes(k))) : Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  for (const k of keys) {
    const n = obj[k];
    const pct = ((n / total) * 100).toFixed(1).padStart(5);
    const bar = '#'.repeat(Math.round((n / total) * 40));
    console.log(`    ${String(k).padEnd(12)} ${String(n).padStart(5)}  ${pct}%  ${bar}`);
  }
}

async function main() {
  const maxOffset = Number(arg('max-offset', 2000));
  const concurrency = Number(arg('concurrency', 4));
  const minPoints = Number(arg('min-points', 20));
  const refresh = !!arg('refresh', false);
  // --rediscover re-pages Gamma for candidates but REUSES cached histories on
  // disk (so widening the ordering set is cheap — only new tokens are fetched).
  const rediscover = !!arg('rediscover', false) || refresh;
  const maxCandidates = Number(arg('max-candidates', Infinity));

  ensureDir(RESEARCH_DIR);
  ensureDir(HIST_DIR);

  console.log('============================================================');
  console.log(' mirofish — RESEARCH DATASET builder (resolved binary markets)');
  console.log('============================================================');
  console.log(` maxOffset=${maxOffset} concurrency=${concurrency} minPoints=${minPoints} refresh=${refresh}`);

  /* -------- 1) candidate discovery (cached) -------- */
  let candidates;
  if (!rediscover) {
    try {
      const cached = JSON.parse(fs.readFileSync(MARKETS_CACHE, 'utf8'));
      if (Array.isArray(cached) && cached.length) {
        candidates = cached;
        console.log(`\n[1/3] candidate metadata loaded from cache: ${candidates.length} clean binary markets`);
      }
    } catch { /* fetch below */ }
  }

  if (!candidates) {
    console.log('\n[1/3] paging clean binary Yes/No resolved markets from Gamma (multiple orderings)...');
    candidates = await fetchCandidateMarkets({
      maxOffset,
      maxCandidates,
      onProgress: ({ order, ascending, offset, added, total }) => {
        if (offset % 500 === 0 || added > 0) {
          process.stdout.write(`\r   order=${order}/${ascending ? 'asc' : 'desc'} offset=${String(offset).padStart(4)}  +${String(added).padStart(3)}  clean-binary total=${total}      `);
        }
      },
    });
    process.stdout.write('\n');
    try { fs.writeFileSync(MARKETS_CACHE, JSON.stringify(candidates)); } catch { /* best-effort */ }
    console.log(`   discovered ${candidates.length} unique clean binary Yes/No resolved markets`);
  }

  // Diversity-aware ordering of the candidate pool: interleave by category so a
  // capped run still samples broadly rather than draining one category first.
  candidates = interleaveByCategory(candidates);

  /* -------- 2) fetch + cache price histories -------- */
  console.log(`\n[2/3] fetching + caching YES-token price histories (>= ${minPoints} pts to keep)...`);
  const t0 = Date.now();
  const { usable, stats } = await fetchHistoriesConcurrent(candidates, {
    concurrency,
    minPoints,
    refresh,
    onProgress: ({ done, total, kept, empty, failed }) => {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      process.stdout.write(`\r   ${done}/${total}  kept=${kept} empty=${empty} failed=${failed}  ${secs}s      `);
    },
  });
  process.stdout.write('\n');
  console.log(`   scanned=${stats.scanned} usable=${usable.length} empty-history=${stats.empty} failed=${stats.failed}`);

  /* -------- 3) summary + manifest -------- */
  console.log('\n[3/3] summary');
  console.log(`\n  USABLE RESOLVED MARKETS: ${usable.length}`);

  const durOrder = ['intraday', '1-3d', '4-14d', '15+d', 'unknown'];
  const priceOrder = ['<0.10', '0.10-0.25', '0.25-0.45', '0.45-0.55', '0.55-0.75', '0.75-0.90', '>0.90', 'unknown'];

  printTally('by durationDays bucket', tally(usable, (m) => durationBucket(m.durationDays)), durOrder);
  printTally('by category', tally(usable, (m) => m.category));
  printTally('by YES entry-price bucket (first price point)', tally(usable, (m) => priceBucket(m.firstPrice)), priceOrder);

  const yesWins = usable.filter((m) => m.yesWon).length;
  console.log(`\n  YES resolved TRUE: ${yesWins} / ${usable.length} (${((yesWins / (usable.length || 1)) * 100).toFixed(1)}%)`);

  // Manifest of usable markets.
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'gamma-api.polymarket.com (closed=true) + clob.polymarket.com prices-history',
    minPoints,
    counts: {
      usable: usable.length,
      scanned: stats.scanned,
      emptyHistory: stats.empty,
      failed: stats.failed,
      byDuration: tally(usable, (m) => durationBucket(m.durationDays)),
      byCategory: tally(usable, (m) => m.category),
      byEntryPrice: tally(usable, (m) => priceBucket(m.firstPrice)),
      yesWinRate: usable.length ? yesWins / usable.length : 0,
    },
    markets: usable.map((m) => ({
      id: m.id,
      question: m.question,
      category: m.category,
      yesTokenId: m.yesTokenId,
      file: path.join('history', `${m.yesTokenId}.json`),
      outcomeYesWon: m.yesWon,
      durationDays: m.durationDays,
      durationBucket: durationBucket(m.durationDays),
      liquidity: m.liquidity,
      volume: m.volume,
      points: m.points,
      firstPrice: m.firstPrice,
      startDate: m.startDate,
      endDate: m.endDate,
    })),
  };
  try {
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`\n  manifest written: ${MANIFEST}`);
  } catch (e) {
    console.log(`\n  FAILED to write manifest: ${e.message}`);
  }

  console.log('\n  cache dirs:');
  console.log(`    candidates: ${MARKETS_CACHE}`);
  console.log(`    histories : ${HIST_DIR}/`);
  console.log('\n done.');
}

// Round-robin candidates across categories so a capped/early-stopped run still
// covers the full diversity of categories rather than front-loading one.
function interleaveByCategory(list) {
  const buckets = {};
  for (const m of list) { (buckets[m.category] ||= []).push(m); }
  // within each category, prefer longer-dated markets first (the interesting ones)
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => (b.durationDays || 0) - (a.durationDays || 0));
  }
  const cats = Object.keys(buckets);
  const out = [];
  let added = true;
  while (added) {
    added = false;
    for (const c of cats) {
      const arr = buckets[c];
      if (arr.length) { out.push(arr.shift()); added = true; }
    }
  }
  return out;
}

main().catch((e) => { console.error('\nFATAL:', e); process.exit(1); });
