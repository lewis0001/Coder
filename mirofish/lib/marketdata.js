'use strict';
/* ============================================================
   Market data for the BACKTESTER — REAL Polymarket history.
   ------------------------------------------------------------
   Two jobs:
     1) discover RESOLVED crypto markets (with their known
        winning outcome) from the Gamma API.
     2) fetch the historical YES-token price PATH for each, and
        cache it to data/history/<tokenId>.json so reruns are
        offline + fast.

   Zero dependencies — plain Node https, same style as
   lib/polymarket.js.
   ============================================================ */
const https = require('https');
const fs = require('fs');
const path = require('path');

const UA = 'mirofish/1.0';
const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';

const HISTORY_DIR = path.join(__dirname, '..', 'data', 'history');
const MARKETS_CACHE = path.join(__dirname, '..', 'data', 'resolved-crypto-markets.json');

// Same crypto matcher as lib/polymarket.js (kept local so this file is standalone).
const CRYPTO_RE = /\b(bitcoin|btc|ethereum|ether|\beth\b|solana|\bsol\b|dogecoin|doge|xrp|ripple|cardano|\bada\b|crypto|binance|\bbnb\b|litecoin)\b/i;

function getJSON(url, { timeout = 20000 } = {}) {
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

function parseMaybeJSON(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

function classifyAsset(q) {
  const s = String(q || '').toLowerCase();
  if (/bitcoin|btc/.test(s)) return 'BTC';
  if (/ethereum|ether|\beth\b/.test(s)) return 'ETH';
  if (/solana|\bsol\b/.test(s)) return 'SOL';
  if (/xrp|ripple/.test(s)) return 'XRP';
  if (/dogecoin|doge/.test(s)) return 'DOGE';
  if (/crypto|binance|bnb|litecoin|cardano|ada/.test(s)) return 'ALT';
  return 'MKT';
}

function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch { /* exists */ } }

/* ------------------------------------------------------------
   Discover resolved crypto markets with a KNOWN winning outcome.
   The Gamma `limit` param is capped at 100 server-side, so we
   page with `offset`. The very top-of-volume slice is sports /
   politics; crypto markets (mostly "Up or Down" intraday + some
   "Will X reach $Y") appear a few pages in.
   Returns an array of:
     { id, question, asset, yesTokenId, yesOutcome, yesWon,
       endDate, volume24hr }
   where yesWon ∈ {true,false} is the GROUND-TRUTH resolution.
   ------------------------------------------------------------ */
async function fetchResolvedCryptoMarkets({ want = 60, maxPages = 12 } = {}) {
  const out = [];
  const seen = new Set();
  for (let page = 0; page < maxPages && out.length < want; page++) {
    const offset = page * 100;
    let batch;
    try {
      batch = await getJSON(`${GAMMA}/markets?closed=true&limit=100&order=volume24hr&ascending=false&offset=${offset}`);
    } catch (e) {
      // transient: skip this page rather than abort the whole discovery
      continue;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const m of batch) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const q = m.question || '';
      if (!CRYPTO_RE.test(q)) continue;

      const outcomes = parseMaybeJSON(m.outcomes, []);
      const prices = parseMaybeJSON(m.outcomePrices, []);     // FINAL settlement prices, e.g. ["1","0"]
      const tokenIds = parseMaybeJSON(m.clobTokenIds, []);
      if (outcomes.length < 2 || prices.length < 2 || tokenIds.length < 2) continue;

      // Identify the "Yes / Up" outcome index (same convention as the live bot).
      let yesIdx = outcomes.findIndex((o) => /^(yes|up|over|above)/i.test(String(o)));
      if (yesIdx < 0) yesIdx = 0;

      // A clean binary resolution settles to exactly 1/0. Require that so we
      // are never guessing the winner.
      const p = prices.map(Number);
      const settled1 = p.filter((x) => Math.abs(x - 1) < 1e-6).length === 1
        && p.filter((x) => Math.abs(x) < 1e-6).length === (p.length - 1);
      if (!settled1) continue;
      const yesWon = Math.abs(p[yesIdx] - 1) < 1e-6;

      out.push({
        id: String(m.id),
        question: q,
        asset: classifyAsset(q),
        yesTokenId: String(tokenIds[yesIdx]),
        yesOutcome: String(outcomes[yesIdx]),
        yesWon,
        endDate: m.endDate || m.endDateIso || null,
        volume24hr: Number(m.volume24hr) || 0,
      });
      if (out.length >= want) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------
   Historical price PATH for one token, with on-disk cache.
   Returns [{ t:<unix seconds>, p:<price 0..1> }, ...] sorted by t.
   We try progressively finer requests and keep the densest result.
   ------------------------------------------------------------ */
async function fetchPriceHistory(tokenId, { refresh = false } = {}) {
  ensureDir(HISTORY_DIR);
  const file = path.join(HISTORY_DIR, `${tokenId}.json`);
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(cached)) return cached;
    } catch { /* not cached yet */ }
  }

  // The CLOB returns the densest path under different interval/fidelity combos
  // depending on the market's age; probe a few and keep the longest.
  const variants = [
    'interval=max&fidelity=1',
    'interval=1d&fidelity=1',
    'interval=1w&fidelity=60',
    'interval=max&fidelity=60',
  ];
  let best = [];
  for (const v of variants) {
    try {
      const d = await getJSON(`${CLOB}/prices-history?market=${tokenId}&${v}`, { timeout: 20000 });
      const h = (d && Array.isArray(d.history)) ? d.history : [];
      if (h.length > best.length) best = h;
    } catch { /* try next variant */ }
  }
  const path0 = best
    .map((x) => ({ t: Number(x.t), p: Number(x.p) }))
    .filter((x) => isFinite(x.t) && isFinite(x.p))
    .sort((a, b) => a.t - b.t);

  try { fs.writeFileSync(file, JSON.stringify(path0)); } catch { /* cache best-effort */ }
  return path0;
}

/* ------------------------------------------------------------
   Build a ready-to-backtest dataset: resolved crypto markets,
   each enriched with its cached price path. Markets without a
   meaningful path (>= minPoints) are dropped. The whole list is
   cached to data/resolved-crypto-markets.json so reruns are
   fully offline.
   ------------------------------------------------------------ */
async function buildDataset({ want = 60, minPoints = 30, refresh = false } = {}) {
  ensureDir(path.dirname(MARKETS_CACHE));
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(MARKETS_CACHE, 'utf8'));
      if (Array.isArray(cached) && cached.length) return cached;
    } catch { /* rebuild below */ }
  }

  // Over-fetch markets because some will lack a usable price path.
  const markets = await fetchResolvedCryptoMarkets({ want: Math.ceil(want * 2.2) });
  const dataset = [];
  for (const m of markets) {
    if (dataset.length >= want) break;
    let path0;
    try { path0 = await fetchPriceHistory(m.yesTokenId, { refresh }); }
    catch { continue; }
    if (!Array.isArray(path0) || path0.length < minPoints) continue;
    dataset.push({ ...m, path: path0 });
  }

  try { fs.writeFileSync(MARKETS_CACHE, JSON.stringify(dataset)); } catch { /* best-effort */ }
  return dataset;
}

module.exports = {
  fetchResolvedCryptoMarkets,
  fetchPriceHistory,
  buildDataset,
  classifyAsset,
  HISTORY_DIR,
  MARKETS_CACHE,
};
