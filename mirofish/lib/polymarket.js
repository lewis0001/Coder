'use strict';
/* ============================================================
   Polymarket API client — REAL data, no dependencies.
   Public read endpoints:
     - Gamma:  https://gamma-api.polymarket.com/markets   (market metadata)
     - CLOB:   https://clob.polymarket.com/price|midpoint  (live order book)
   ============================================================ */
const https = require('https');

const UA = 'mirofish-trader/1.0 (+paper)';
const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';

function getJSON(url, { timeout = 15000 } = {}) {
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

// Gamma encodes several fields as JSON strings.
function parseMaybeJSON(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

const CRYPTO_RE = /\b(bitcoin|btc|ethereum|ether|solana|\bsol\b|dogecoin|doge|xrp|ripple|cardano|\bada\b|crypto|binance|\bbnb\b|litecoin)\b/i;

function classifyAsset(q) {
  const s = q.toLowerCase();
  if (/bitcoin|btc/.test(s)) return 'BTC';
  if (/ethereum|ether|\beth\b/.test(s)) return 'ETH';
  if (/solana|\bsol\b/.test(s)) return 'SOL';
  if (/xrp|ripple/.test(s)) return 'XRP';
  if (/dogecoin|doge/.test(s)) return 'DOGE';
  if (/crypto|binance|bnb|litecoin|cardano|ada/.test(s)) return 'ALT';
  return 'MKT';
}

/* Fetch a normalized list of tradeable markets (crypto-first).
   Merges two gamma queries so we catch BOTH high-volume markets and
   the continuously-refreshing intraday crypto "Up or Down" markets
   (which have ~0 24h volume because they were just created). */
async function fetchMarkets({ limit = 200, cryptoOnly = true } = {}) {
  const nowISO = new Date().toISOString();
  const urls = [
    `${GAMMA}/markets?closed=false&active=true&limit=${limit}&order=volume24hr&ascending=false`,
    `${GAMMA}/markets?closed=false&active=true&limit=${limit}&order=endDate&ascending=true&end_date_min=${encodeURIComponent(nowISO)}`,
  ];
  const results = await Promise.allSettled(urls.map((u) => getJSON(u)));
  const raw = [];
  const seen = new Set();
  for (const r of results) {
    if (r.status !== 'fulfilled' || !Array.isArray(r.value)) continue;
    for (const m of r.value) { if (!seen.has(m.id)) { seen.add(m.id); raw.push(m); } }
  }
  const out = [];
  for (const m of raw) {
    const outcomes = parseMaybeJSON(m.outcomes, []);
    const tokenIds = parseMaybeJSON(m.clobTokenIds, []);
    if (!Array.isArray(tokenIds) || tokenIds.length < 2) continue;
    // index of the "Yes"/up outcome
    let yesIdx = outcomes.findIndex((o) => /^(yes|up|over|above)/i.test(String(o)));
    if (yesIdx < 0) yesIdx = 0;
    const noIdx = yesIdx === 0 ? 1 : 0;
    const ask = Number(m.bestAsk);
    const bid = Number(m.bestBid);
    const mid = ask > 0 && bid > 0 ? (ask + bid) / 2 : Number(m.lastTradePrice) || null;
    if (mid == null || !isFinite(mid)) continue;
    const isCrypto = CRYPTO_RE.test(m.question || '');
    out.push({
      id: String(m.id),
      question: m.question,
      asset: classifyAsset(m.question || ''),
      isCrypto,
      tokenYes: tokenIds[yesIdx],
      tokenNo: tokenIds[noIdx],
      bestBid: bid, bestAsk: ask, mid,
      lastTradePrice: Number(m.lastTradePrice) || mid,
      volume24hr: Number(m.volume24hr) || 0,
      liquidity: Number(m.liquidity) || 0,
      endDate: m.endDate || null,
    });
  }
  const crypto = out.filter((m) => m.isCrypto);
  const pool = cryptoOnly && crypto.length >= 6 ? crypto : (crypto.length ? crypto.concat(out.filter(m => !m.isCrypto)) : out);
  return pool;
}

/* Live order-book price for one token. side: 'buy' (ask) | 'sell' (bid). */
async function fetchPrice(tokenId, side) {
  const d = await getJSON(`${CLOB}/price?token_id=${tokenId}&side=${side}`, { timeout: 8000 });
  return Number(d && d.price);
}
async function fetchMidpoint(tokenId) {
  const d = await getJSON(`${CLOB}/midpoint?token_id=${tokenId}`, { timeout: 8000 });
  return Number(d && d.mid);
}

/* Live quote (bid+ask+mid) for a token, resilient to partial failure. */
async function fetchQuote(tokenId) {
  const [buy, sell] = await Promise.allSettled([fetchPrice(tokenId, 'buy'), fetchPrice(tokenId, 'sell')]);
  const ask = buy.status === 'fulfilled' ? buy.value : null;
  const bid = sell.status === 'fulfilled' ? sell.value : null;
  let mid = null;
  if (ask != null && bid != null && ask > 0 && bid > 0) mid = (ask + bid) / 2;
  else { try { mid = await fetchMidpoint(tokenId); } catch { /* ignore */ } }
  return { bid, ask, mid };
}

module.exports = { fetchMarkets, fetchPrice, fetchMidpoint, fetchQuote, classifyAsset };
