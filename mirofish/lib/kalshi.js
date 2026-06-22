'use strict';
/* ============================================================
   lib/kalshi.js — LIVE Kalshi (public, no-auth) market data.
   ------------------------------------------------------------
   Mirrors the discipline of lib/orderbook.js for Polymarket:
   we never trust a mid-price. For Kalshi we walk the REAL
   order book (the /orderbook endpoint) so every cross-venue
   edge is judged on what you could actually fill, AND we model
   Kalshi's per-contract trading fee on every Kalshi leg.

   API shape notes (verified live 2026-06):
     * /markets and /events return prices as decimal-dollar
       STRINGS in [0,1] in `*_dollars` fields (yes_ask_dollars,
       no_bid_dollars, ...). The old integer-cents fields are
       gone in this endpoint version.
     * `liquidity_dollars` is reported as 0 on this endpoint —
       it is NOT usable. Tradeable size lives in the order book
       (yes_ask_size_fp / yes_bid_size_fp at top, full depth in
       /markets/{ticker}/orderbook).
     * Order book: orderbook_fp = { yes_dollars:[[price,size]...],
       no_dollars:[[price,size]...] }. BOTH sides are *bids*
       (resting buy orders). A NO bid at price p is equivalent to
       an offer to SELL YES at (1-p). So:
          YES ask levels = { price: 1-noBidPrice, size }  (buy YES)
          NO  ask levels = { price: 1-yesBidPrice, size } (buy NO)
       (verified: 1-bestNoBid == quoted yes_ask exactly.)
     * The /markets firehose is ~99.7% multivariate parlay combos
       (KXMVE* tickers) with no liquidity; we pull via /events with
       nested markets and DROP KXMVE* so the real single-outcome
       markets aren't buried.

   FEES: Kalshi charges a per-contract trading fee, charged on
   BOTH the buy leg and (if you ever sell) the sell leg. The
   standard general fee schedule is:
        fee_per_contract = round_up_to_cent( 0.07 * P * (1-P) )
   with P the trade price in dollars [0,1]. We apply this on
   every Kalshi leg we trade. (round-up => conservative.)

   Zero dependencies.
   ============================================================ */
const https = require('https');

const UA = 'mirofish-trader/1.0';
const BASE = 'https://api.elections.kalshi.com/trade-api/v2';

function getJSON(url, { timeout = 20000 } = {}) {
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

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- per-contract Kalshi trading fee (dollars). round-up to the cent. ---- */
function kalshiFee(price) {
  const p = Math.max(0, Math.min(1, price));
  return Math.ceil(0.07 * p * (1 - p) * 100) / 100;
}

/* ============================================================
   Discovery: pull OPEN events with nested markets, paginated.
   Returns { events, markets } where markets are flattened and
   annotated with their event's category/title/mutex, and KXMVE*
   parlay combos are dropped.
   ============================================================ */
async function fetchOpenEvents({ maxPages = 60, pageDelayMs = 120, onlyCategories = null } = {}) {
  let cursor = '';
  const events = [];
  for (let p = 0; p < maxPages; p++) {
    const url = `${BASE}/events?limit=200&status=open&with_nested_markets=true${cursor ? '&cursor=' + cursor : ''}`;
    let j;
    try { j = await getJSON(url); } catch (e) { if (p === 0) throw e; break; }
    const evs = j.events || [];
    for (const e of evs) {
      if (onlyCategories && !onlyCategories.has(e.category)) continue;
      events.push(e);
    }
    cursor = j.cursor;
    if (!cursor || evs.length === 0) break;
    if (pageDelayMs) await sleep(pageDelayMs);
  }
  return events;
}

/* Flatten nested markets into normalized records (drop parlay combos). */
function normalizeMarkets(events) {
  const out = [];
  for (const e of events) {
    for (const m of e.markets || []) {
      if (!m.ticker || m.ticker.startsWith('KXMVE')) continue; // parlay combos
      const yesAsk = num(m.yes_ask_dollars);
      const yesBid = num(m.yes_bid_dollars);
      const noAsk = num(m.no_ask_dollars);
      const noBid = num(m.no_bid_dollars);
      out.push({
        venue: 'kalshi',
        ticker: m.ticker,
        eventTicker: m.event_ticker || e.event_ticker,
        seriesTicker: e.series_ticker,
        category: e.category || null,
        eventTitle: e.title || '',
        title: m.title || '',
        yesSubTitle: m.yes_sub_title || '',
        noSubTitle: m.no_sub_title || '',
        mutuallyExclusive: !!e.mutually_exclusive,
        // top-of-book quotes (dollars, 0..1)
        yesAsk, yesBid, noAsk, noBid,
        yesAskSize: num(m.yes_ask_size_fp),
        yesBidSize: num(m.yes_bid_size_fp),
        // activity
        volume: num(m.volume_fp),
        volume24h: num(m.volume_24h_fp),
        openInterest: num(m.open_interest_fp),
        closeTime: m.close_time || e.close_time || null,
        expirationTime: m.expiration_time || null,
        status: m.status,
        rulesPrimary: m.rules_primary || '',
        strikeType: m.strike_type || null,
      });
    }
  }
  return out;
}

/* ============================================================
   Real order book for one market. Returns synthetic ASK ladders
   for BUYING YES and for BUYING NO, plus best quotes — the same
   mental model as Polymarket's asks (lowest price first).
   ============================================================ */
function buildAskLadders(orderbook_fp) {
  const yesB = (orderbook_fp && orderbook_fp.yes_dollars || []).map(([p, s]) => ({ price: num(p), size: num(s) }));
  const noB = (orderbook_fp && orderbook_fp.no_dollars || []).map(([p, s]) => ({ price: num(p), size: num(s) }));
  // To BUY YES you lift the NO bids: each NO bid @p sells you YES @ (1-p).
  const yesAsks = noB.map((l) => ({ price: 1 - l.price, size: l.size }))
    .filter((l) => l.size > 0 && l.price > 0 && l.price < 1)
    .sort((a, b) => a.price - b.price);
  // To BUY NO you lift the YES bids: each YES bid @p sells you NO @ (1-p).
  const noAsks = yesB.map((l) => ({ price: 1 - l.price, size: l.size }))
    .filter((l) => l.size > 0 && l.price > 0 && l.price < 1)
    .sort((a, b) => a.price - b.price);
  return {
    yesAsks, noAsks,
    bestYesAsk: yesAsks.length ? yesAsks[0].price : null,
    bestNoAsk: noAsks.length ? noAsks[0].price : null,
  };
}

async function getOrderbook(ticker, { depth = 100 } = {}) {
  const url = `${BASE}/markets/${encodeURIComponent(ticker)}/orderbook?depth=${depth}`;
  const j = await getJSON(url);
  return buildAskLadders(j.orderbook_fp || {});
}

/* VWAP cost (in dollars) to BUY `contracts` by walking an ask ladder,
   then ADD the Kalshi per-contract fee on the filled clip (priced at
   the average fill price — conservative & matches per-contract spec).
   Returns { filled, costNoFee, fee, cost, avgPrice, exhausted }. */
function buyCostKalshi(asks, contracts) {
  let need = contracts, cost = 0;
  for (const lvl of asks) {
    const take = Math.min(need, lvl.size);
    cost += take * lvl.price; need -= take;
    if (need <= 1e-9) break;
  }
  const filled = contracts - Math.max(0, need);
  const avg = filled > 0 ? cost / filled : null;
  const fee = filled > 0 ? kalshiFee(avg) * filled : 0;
  return { filled, costNoFee: cost, fee, cost: cost + fee, avgPrice: avg, exhausted: need > 1e-9 };
}

/* depth (contracts) available within maxSlip of the best ask. */
function depthWithin(asks, maxSlip) {
  if (!asks.length) return 0;
  const ref = asks[0].price; let sz = 0;
  for (const lvl of asks) { if (lvl.price - ref > maxSlip) break; sz += lvl.size; }
  return sz;
}

module.exports = {
  getJSON, fetchOpenEvents, normalizeMarkets,
  getOrderbook, buildAskLadders, buyCostKalshi, depthWithin,
  kalshiFee, BASE,
};
