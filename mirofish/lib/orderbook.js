'use strict';
/* ============================================================
   lib/orderbook.js — LIVE Polymarket CLOB order-book primitives.
   ------------------------------------------------------------
   The whole point: judge every candidate edge on what you could
   ACTUALLY FILL right now, by walking real book depth (VWAP +
   slippage), never on a mid-price fiction. This is the standard
   that killed the overround "edge" (stale, unfillable quotes).

   Public read endpoints (no auth):
     GET  /book?token_id=...        -> { bids:[{price,size}], asks:[...] }
     GET  /spread?token_id=...      -> { spread }
     GET  /midpoint?token_id=...    -> { mid }
     GET  /price?token_id=..&side=  -> { price }
   Zero dependencies.
   ============================================================ */
const https = require('https');

const UA = 'mirofish-trader/1.0';
const CLOB = 'https://clob.polymarket.com';
const GAMMA = 'https://gamma-api.polymarket.com';

function getJSON(url, { timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} ${url}`)); }
      let buf = ''; res.on('data', (c) => (buf += c));
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('timeout ' + url)));
  });
}

/* Normalize a raw book into sorted levels + best quotes + spread. */
function normalizeBook(raw) {
  const bids = (raw.bids || []).map((x) => ({ price: +x.price, size: +x.size })).filter((x) => x.size > 0)
    .sort((a, b) => b.price - a.price);                 // best (highest) bid first
  const asks = (raw.asks || []).map((x) => ({ price: +x.price, size: +x.size })).filter((x) => x.size > 0)
    .sort((a, b) => a.price - b.price);                 // best (lowest) ask first
  const bestBid = bids.length ? bids[0].price : null;
  const bestAsk = asks.length ? asks[0].price : null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const mid = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  return { bids, asks, bestBid, bestAsk, spread, mid };
}

async function getBook(tokenId) {
  return normalizeBook(await getJSON(`${CLOB}/book?token_id=${tokenId}`));
}

/* Batch books via POST /books, falling back to concurrent GETs. */
async function getBooks(tokenIds, { concurrency = 6 } = {}) {
  const out = {};
  let i = 0;
  async function worker() {
    while (i < tokenIds.length) {
      const id = tokenIds[i++];
      try { out[id] = await getBook(id); } catch { out[id] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tokenIds.length) }, worker));
  return out;
}

/* VWAP cost to BUY `shares` by walking the asks (real slippage).
   Returns { filled, cost, avgPrice, exhausted } — exhausted=true if the
   book ran out before filling the full size (i.e. you CANNOT fill that clip). */
function buyCost(book, shares) {
  let need = shares, cost = 0;
  for (const lvl of book.asks) {
    const take = Math.min(need, lvl.size);
    cost += take * lvl.price; need -= take;
    if (need <= 1e-9) break;
  }
  const filled = shares - Math.max(0, need);
  return { filled, cost, avgPrice: filled > 0 ? cost / filled : null, exhausted: need > 1e-9 };
}

/* VWAP proceeds to SELL `shares` by walking the bids. */
function sellProceeds(book, shares) {
  let need = shares, proceeds = 0;
  for (const lvl of book.bids) {
    const take = Math.min(need, lvl.size);
    proceeds += take * lvl.price; need -= take;
    if (need <= 1e-9) break;
  }
  const filled = shares - Math.max(0, need);
  return { filled, proceeds, avgPrice: filled > 0 ? proceeds / filled : null, exhausted: need > 1e-9 };
}

/* Liquidity within `maxSlip` of the best ask (how much you can buy without
   moving price more than maxSlip). A real tradeability gauge. */
function depthWithin(book, side, maxSlip) {
  const levels = side === 'buy' ? book.asks : book.bids;
  if (!levels.length) return 0;
  const ref = levels[0].price;
  let sz = 0;
  for (const lvl of levels) {
    if (side === 'buy' ? (lvl.price - ref > maxSlip) : (ref - lvl.price > maxSlip)) break;
    sz += lvl.size;
  }
  return sz;
}

/* ---- live market / event discovery (for scanners) ---- */
async function liveMarkets({ limit = 500 } = {}) {
  const out = [];
  for (let off = 0; off < limit; off += 100) {
    let page;
    try { page = await getJSON(`${GAMMA}/markets?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`); }
    catch { break; }
    if (!Array.isArray(page) || !page.length) break;
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}
async function liveEvents({ limit = 300 } = {}) {
  const out = [];
  for (let off = 0; off < limit; off += 100) {
    let page;
    try { page = await getJSON(`${GAMMA}/events?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`); }
    catch { break; }
    if (!Array.isArray(page) || !page.length) break;
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

function parseJSON(v, d) { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? d); } catch { return d; } }

module.exports = {
  getJSON, getBook, getBooks, normalizeBook,
  buyCost, sellProceeds, depthWithin,
  liveMarkets, liveEvents, parseJSON, CLOB, GAMMA,
};
