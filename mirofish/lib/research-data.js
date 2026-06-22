'use strict';
/* ============================================================
   RESEARCH DATA — a LARGE, DIVERSE, cached universe of RESOLVED
   binary (Yes/No) Polymarket markets with known outcomes and
   price histories.
   ------------------------------------------------------------
   Why this exists (separate from lib/marketdata.js):
     The original backtester only looked at ~60 intraday BTC
     "Up or Down" markets — the single most efficient corner of
     Polymarket, where no edge can survive. To honestly look for
     a real edge (e.g. favorite–longshot bias) we need a MUCH
     larger and MORE DIVERSE set of resolved markets, especially
     LONGER-DATED and LESS-LIQUID ones.

   What it does:
     1) Pages MANY resolved binary markets from the Gamma API
        across several orderings (volume, endDate, ...) and
        de-dupes by id, to maximize variety of CATEGORIES and
        DURATIONS — NOT restricted to crypto.
     2) Requires a clean 1/0 settlement so the winner is known
        and unambiguous (skips anything else).
     3) Fetches + caches each market's YES-token price PATH from
        the CLOB prices-history endpoint, on disk under
        data/research/ (gitignored), so reruns are fully offline.

   Zero dependencies — plain Node https, same style as
   lib/marketdata.js.

   IMPORTANT API constraints discovered empirically:
     - Gamma caps `limit` at 100; page with `offset`.
     - Gamma rejects `offset` beyond ~2000-2400 (HTTP 422), so a
       SINGLE ordering can only reach ~2000 markets. We therefore
       sweep MULTIPLE orderings and de-dupe to widen the universe.
     - Many closed markets return an EMPTY prices-history (no CLOB
       data was ever persisted / it was purged). When empty, every
       interval/fidelity variant is empty too — so we just skip
       those markets. The usable hit-rate is ~10%, which is why we
       scan a large candidate pool.
   ============================================================ */

const https = require('https');
const fs = require('fs');
const path = require('path');

const UA = 'mirofish/1.0';
const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';

const RESEARCH_DIR = path.join(__dirname, '..', 'data', 'research');
const HIST_DIR = path.join(RESEARCH_DIR, 'history');
const MARKETS_CACHE = path.join(RESEARCH_DIR, 'markets.json'); // cached candidate metadata
const MANIFEST = path.join(RESEARCH_DIR, 'manifest.json');

/* ----------------------------- HTTP ----------------------------- */
function getJSON(url, { timeout = 25000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('timeout ' + url)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// getJSON with retries + small backoff; resolves null on persistent failure.
async function getJSONRetry(url, { tries = 3, baseDelay = 400, timeout = 25000 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await getJSON(url, { timeout }); }
    catch (e) {
      lastErr = e;
      // HTTP 4xx (e.g. 422 offset-out-of-range, 404) won't fix on retry — bail fast.
      if (/HTTP 4\d\d/.test(e.message)) break;
      await sleep(baseDelay * (i + 1));
    }
  }
  return { __err: lastErr ? lastErr.message : 'unknown' };
}

function parseMaybeJSON(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch { /* exists */ } }

/* ------------------------- categorization ------------------------- */
// Rough, keyword-based category for a question. Purely for the diversity
// summary — NOT used for any trading logic.
function classifyCategory(q) {
  const s = String(q || '').toLowerCase();
  if (/\b(bitcoin|btc|ethereum|ether|\beth\b|solana|\bsol\b|dogecoin|doge|xrp|ripple|cardano|\bada\b|crypto|binance|\bbnb\b|litecoin|hyperliquid|token|fdv|airdrop|\bnft\b|stablecoin|usdc|usdt|memecoin|altcoin)\b/.test(s)) return 'crypto';
  if (/\b(election|president|senate|congress|governor|mayor|parliament|prime minister|vote|poll|democrat|republican|trump|biden|harris|nominee|primary|referendum|cabinet|impeach|government)\b/.test(s)) return 'politics';
  if (/\b(nba|nfl|nhl|mlb|soccer|football|basketball|baseball|hockey|tennis|ufc|fight|win the|vs\.?|game|match|cup|league|champion|playoff|super bowl|world series|premier|liga|series|score|o\/u|over\/under|defeat|beat)\b/.test(s)) return 'sports';
  if (/\b(fed|interest rate|inflation|cpi|gdp|recession|unemployment|jobs report|rate cut|rate hike|s&p|nasdaq|dow|stock|earnings|ipo|treasury|yield|oil|wti|crude|gold)\b/.test(s)) return 'economics';
  if (/\b(war|ceasefire|invade|invasion|strike|missile|nuclear|treaty|sanction|israel|iran|ukraine|russia|gaza|china|taiwan|nato|military|troops|hostage)\b/.test(s)) return 'geopolitics';
  if (/\b(movie|box office|oscar|grammy|album|spotify|netflix|taylor swift|celebrity|tweet|elon|musk|gpt|openai|ai\b|launch|release|model|apple|google|tesla|spacex)\b/.test(s)) return 'tech-culture';
  if (/\b(weather|hurricane|temperature|earthquake|covid|pandemic|vaccine|fda|nasa|space|asteroid)\b/.test(s)) return 'science-misc';
  return 'other';
}

function durationBucket(days) {
  if (days == null || !isFinite(days)) return 'unknown';
  if (days < 1) return 'intraday';
  if (days <= 3) return '1-3d';
  if (days <= 14) return '4-14d';
  return '15+d';
}

function priceBucket(p) {
  if (p == null || !isFinite(p)) return 'unknown';
  if (p < 0.1) return '<0.10';
  if (p < 0.25) return '0.10-0.25';
  if (p < 0.45) return '0.25-0.45';
  if (p <= 0.55) return '0.45-0.55';
  if (p <= 0.75) return '0.55-0.75';
  if (p <= 0.9) return '0.75-0.90';
  return '>0.90';
}

/* --------------------- clean a raw Gamma market --------------------- */
// Returns a normalized candidate { ... , yesWon } or null if it is not a
// clean, resolved, binary Yes/No market.
function normalizeMarket(m) {
  const q = m.question || '';
  const outcomes = parseMaybeJSON(m.outcomes, []);
  const prices = parseMaybeJSON(m.outcomePrices, []).map(Number);
  const tokenIds = parseMaybeJSON(m.clobTokenIds, []);

  if (outcomes.length !== 2 || prices.length !== 2 || tokenIds.length !== 2) return null;

  // Strictly a binary Yes/No market (keeps the dataset interpretable; excludes
  // Over/Under, scalar, and multi-leg event legs that masquerade as 2-outcome).
  const o0 = String(outcomes[0]).trim().toLowerCase();
  const o1 = String(outcomes[1]).trim().toLowerCase();
  const yesNo = (o0 === 'yes' && o1 === 'no') || (o0 === 'no' && o1 === 'yes');
  if (!yesNo) return null;

  // Require a CLEAN 1/0 settlement so the winner is unambiguous.
  const isOne = (x) => Math.abs(x - 1) < 1e-6;
  const isZero = (x) => Math.abs(x) < 1e-6;
  const cleanSettle = (isOne(prices[0]) && isZero(prices[1])) || (isOne(prices[1]) && isZero(prices[0]));
  if (!cleanSettle) return null;

  // YES token / outcome index.
  const yesIdx = o0 === 'yes' ? 0 : 1;
  const yesTokenId = String(tokenIds[yesIdx]);
  const yesWon = isOne(prices[yesIdx]);

  const startMs = m.startDate ? new Date(m.startDate).getTime() : (m.startDateIso ? new Date(m.startDateIso).getTime() : (m.createdAt ? new Date(m.createdAt).getTime() : NaN));
  const endMs = m.endDate ? new Date(m.endDate).getTime() : (m.endDateIso ? new Date(m.endDateIso).getTime() : NaN);
  const durationDays = (isFinite(startMs) && isFinite(endMs)) ? (endMs - startMs) / 86400000 : null;

  return {
    id: String(m.id),
    question: q,
    category: classifyCategory(q),
    outcomes,
    yesTokenId,
    yesIdx,
    yesWon,
    startDate: m.startDate || m.startDateIso || m.createdAt || null,
    endDate: m.endDate || m.endDateIso || null,
    durationDays: durationDays == null ? null : Math.round(durationDays * 100) / 100,
    volume: Number(m.volume) || Number(m.volumeNum) || Number(m.volumeClob) || 0,
    // Gamma's closed-markets list does not return a liquidity field, so we treat
    // volume as the size proxy and record liquidity if it ever appears.
    liquidity: (m.liquidity != null ? Number(m.liquidity) : (m.liquidityNum != null ? Number(m.liquidityNum) : null)),
  };
}

/* ----------------- page MANY candidates from Gamma ----------------- */
/*
  Sweep several orderings (each capped at ~2000 offset by Gamma) and de-dupe by
  id to build a broad, diverse candidate pool. Stops a given ordering on an
  empty page or a 4xx (offset out of range).

  opts:
    orderings   : list of {order, ascending} to sweep
    maxOffset   : per-ordering offset ceiling (Gamma rejects beyond ~2000)
    pageDelayMs : politeness pause between Gamma pages
    onProgress  : (info) => void
*/
async function fetchCandidateMarkets({
  orderings = [
    // High-volume head (efficient markets) ...
    { order: 'volumeNum', ascending: false },
    // ... down through the LOW-volume / longshot tail (where favorite-longshot
    // bias is most likely to live) ...
    { order: 'volumeNum', ascending: true },
    // ... spread across end dates (durations) ...
    { order: 'endDate', ascending: false },
    { order: 'endDate', ascending: true },
    // ... and across creation/start time (OLD markets + intraday crypto),
    // each a distinct cohort that widens category + duration diversity.
    { order: 'startDate', ascending: false },
    { order: 'startDate', ascending: true },
    { order: 'createdAt', ascending: false },
    { order: 'createdAt', ascending: true },
  ],
  maxOffset = 2000,
  pageDelayMs = 120,
  maxCandidates = Infinity,
  onProgress = () => {},
} = {}) {
  const byId = new Map();
  for (const { order, ascending } of orderings) {
    for (let offset = 0; offset <= maxOffset; offset += 100) {
      if (byId.size >= maxCandidates) break;
      const url = `${GAMMA}/markets?closed=true&limit=100&offset=${offset}&order=${order}&ascending=${ascending}`;
      const batch = await getJSONRetry(url, { tries: 3 });
      if (!Array.isArray(batch)) break; // 4xx (offset cap) or persistent error -> next ordering
      if (batch.length === 0) break;
      let added = 0;
      for (const m of batch) {
        const id = String(m.id);
        if (byId.has(id)) continue;
        const norm = normalizeMarket(m);
        if (!norm) continue;
        byId.set(id, norm);
        added++;
      }
      onProgress({ order, ascending, offset, batch: batch.length, added, total: byId.size });
      await sleep(pageDelayMs);
    }
    if (byId.size >= maxCandidates) break;
  }
  return [...byId.values()];
}

/* ------------- cached YES-token price history (per market) ------------- */
/*
  Per the task: https://clob.polymarket.com/prices-history?market=<tokenId>&interval=max&fidelity=60
  Returns [{t,p}] sorted by time. Raw response is cached to
  data/research/history/<tokenId>.json so reruns are offline.

  When the primary (max/60) query is EMPTY we probe a couple of denser variants
  — but empirically, if max/60 is empty the others are too, so this mostly just
  recovers extra density for markets that DO have data.
*/
async function fetchPriceHistory(tokenId, { refresh = false } = {}) {
  ensureDir(HIST_DIR);
  const file = path.join(HIST_DIR, `${tokenId}.json`);
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(cached)) return cached;
    } catch { /* not cached */ }
  }

  const variants = [
    'interval=max&fidelity=60', // task default (hourly bars) — primary
    'interval=max&fidelity=10',
    'interval=max&fidelity=1',
  ];
  let best = [];
  for (let vi = 0; vi < variants.length; vi++) {
    const v = variants[vi];
    const d = await getJSONRetry(`${CLOB}/prices-history?market=${tokenId}&${v}`, { tries: 2, baseDelay: 300 });
    const h = (d && Array.isArray(d.history)) ? d.history : [];
    if (h.length > best.length) best = h;
    // CRUCIAL for throughput: empirically, when the PRIMARY (max/60) query is
    // empty, every denser variant is empty too (the market's CLOB history was
    // never persisted / was purged). Since empties are ~75% of candidates,
    // probing them further is pure wasted latency — bail immediately.
    if (vi === 0 && best.length === 0) break;
    // If we already have a healthy path, don't hammer the API for more density.
    if (best.length >= 50) break;
  }

  const path0 = best
    .map((x) => ({ t: Number(x.t), p: Number(x.p) }))
    .filter((x) => isFinite(x.t) && isFinite(x.p))
    .sort((a, b) => a.t - b.t);

  try { fs.writeFileSync(file, JSON.stringify(path0)); } catch { /* best-effort */ }
  return path0;
}

/* -------- run history fetches with small concurrency + politeness -------- */
async function fetchHistoriesConcurrent(candidates, {
  concurrency = 4,
  minPoints = 20,
  refresh = false,
  onProgress = () => {},
} = {}) {
  const usable = [];
  let done = 0, kept = 0, empty = 0, failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < candidates.length) {
      const c = candidates[idx++];
      let pathArr = null;
      try { pathArr = await fetchPriceHistory(c.yesTokenId, { refresh }); }
      catch { failed++; }
      done++;
      if (Array.isArray(pathArr) && pathArr.length >= minPoints) {
        kept++;
        usable.push({ ...c, path: pathArr, points: pathArr.length, firstPrice: pathArr[0].p });
      } else if (Array.isArray(pathArr) && pathArr.length === 0) {
        empty++;
      }
      if (done % 50 === 0 || done === candidates.length) {
        onProgress({ done, total: candidates.length, kept, empty, failed });
      }
      // brief pause so we never hammer the CLOB
      await sleep(40);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.max(1, concurrency); i++) workers.push(worker());
  await Promise.all(workers);
  return { usable, stats: { scanned: candidates.length, kept, empty, failed } };
}

/* -------------------------- the loader -------------------------- */
/*
  loadResearchDataset() — returns the in-memory dataset other scripts can use:
    [{ id, question, category, durationDays, liquidity, volume,
       outcomeYesWon:bool, firstPrice, points, path:[{t,p}], ... }]

  It reads the manifest written by the fetch script, then loads each cached
  YES-token history from disk. Fully offline. Throws a helpful error if the
  manifest is missing (i.e. the fetch script hasn't been run yet).
*/
function loadResearchDataset({ manifestPath = MANIFEST } = {}) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (e) {
    throw new Error(`research dataset not built yet — run scripts/fetch-research-data.js first (${e.message})`);
  }
  const entries = Array.isArray(manifest.markets) ? manifest.markets : [];
  const out = [];
  for (const e of entries) {
    let pathArr = null;
    try { pathArr = JSON.parse(fs.readFileSync(path.join(RESEARCH_DIR, e.file), 'utf8')); }
    catch {
      // absolute path fallback
      try { pathArr = JSON.parse(fs.readFileSync(e.file, 'utf8')); } catch { continue; }
    }
    if (!Array.isArray(pathArr) || pathArr.length === 0) continue;
    out.push({
      id: e.id,
      question: e.question,
      category: e.category,
      durationDays: e.durationDays,
      liquidity: e.liquidity,
      volume: e.volume,
      outcomeYesWon: !!e.outcomeYesWon,
      firstPrice: e.firstPrice,
      points: pathArr.length,
      startDate: e.startDate,
      endDate: e.endDate,
      yesTokenId: e.yesTokenId,
      path: pathArr.map((x) => ({ t: Number(x.t), p: Number(x.p) })),
    });
  }
  return out;
}

module.exports = {
  // discovery + fetch
  fetchCandidateMarkets,
  fetchPriceHistory,
  fetchHistoriesConcurrent,
  normalizeMarket,
  // helpers / buckets
  classifyCategory,
  durationBucket,
  priceBucket,
  // loader
  loadResearchDataset,
  // paths
  RESEARCH_DIR,
  HIST_DIR,
  MARKETS_CACHE,
  MANIFEST,
};
