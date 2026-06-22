'use strict';
/* ============================================================
   lib/mm-live.js — LIVE passive spread-capture (market-making)
   edge estimator for Polymarket CLOB markets.
   ------------------------------------------------------------
   WHY THIS EXISTS:
   The earlier maker BACKTEST (lib/backtest-maker.js) lost money
   because it made markets on intraday crypto coin-flips that
   resolve to $1/$0 fast: the maker kept catching the losing side
   into binary settlement (the "inventory tail"). The structural
   fix — IF an edge exists — is to make markets only where that
   trap is WEAK:
     * WIDE real spread        (you actually earn something per RT)
     * genuine two-sided depth (real size to quote against)
     * LONG time-to-resolution (price mean-reverts; you can flatten
                                inventory before settlement)

   This module does NOT backtest a fiction. It SAMPLES the LIVE
   order book of each candidate market repeatedly over a short
   window and estimates the realized maker edge the SAME honest
   way the backtester did:

     (A) FILL ONLY ON A TRADE-THROUGH. A resting maker order at
         level L fills only when the market actually trades through
         L. Between two book snapshots we declare a maker fill on a
         side ONLY when the mid crosses our quoted level (a strict
         cross, not a touch). This is conservative: a real maker at
         the top of the book might fill more often, but we never
         claim a fill the tape didn't justify.

     (B) MARK FILLS TO THE SUBSEQUENT MID (adverse selection). You
         get filled BECAUSE price is moving against you. So every
         simulated fill is marked to the NEXT snapshot's mid, and
         the distance the mid ran past our quote is booked as an
         adverse-selection loss. Net per round-trip =
             captured_spread  -  adverse_move.

   QUOTING MODEL (one tick inside on each side):
     We post a passive BID at bestBid + 1 tick and a passive ASK
     at bestAsk - 1 tick (improve the book by one tick on each
     side — the standard maker move that still rests inside the
     spread). Our effective HALF-spread captured on a round trip
     is (spread - 2*tick)/2 per side; a full round-trip (buy on
     the bid, sell on the ask) captures (spread - 2*tick).

   We do not place real orders. We read the public book over time
   and ask: across these snapshots, how often would each side have
   filled, and what did the mid do right after? Aggregating that
   over a whole segment of markets gives an HONEST estimate of net
   maker edge per round-trip and the capacity at that edge.
   ============================================================ */

const ob = require('./orderbook');

/* ---------- helpers ---------- */
function parseTokens(m) {
  const t = ob.parseJSON(m.clobTokenIds, null);
  return Array.isArray(t) && t.length >= 2 ? t : null;
}
function num(v, d = 0) { const n = +v; return Number.isFinite(n) ? n : d; }
function daysUntil(iso, now = Date.now()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (t - now) / 86400000 : null;
}
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ============================================================
   SCREEN: from a Gamma market list, keep the wide-spread /
   liquid / slow-resolution profile worth sampling live.
   Uses the cheap fields Gamma already returns (bestBid/bestAsk/
   spread/endDate/volume) to avoid hammering the book endpoint.
   ============================================================ */
function screenMarkets(markets, opts = {}) {
  const minSpread = opts.minSpread != null ? opts.minSpread : 0.03;   // wide spread floor
  const minDays = opts.minDays != null ? opts.minDays : 3;            // slow resolution
  const minVol24 = opts.minVol24 != null ? opts.minVol24 : 500;       // real two-sided flow
  const priceLo = opts.priceLo != null ? opts.priceLo : 0.10;         // avoid $1/$0 tails
  const priceHi = opts.priceHi != null ? opts.priceHi : 0.90;
  const now = Date.now();

  const kept = [];
  const stats = { total: markets.length, noBook: 0, tight: 0, tooSoon: 0, tail: 0, thin: 0, noTok: 0, notAccepting: 0, kept: 0 };

  for (const m of markets) {
    const bb = num(m.bestBid, NaN), ba = num(m.bestAsk, NaN);
    if (!(bb > 0 && ba > 0 && ba > bb)) { stats.noBook++; continue; }
    const spread = ba - bb;
    if (spread < minSpread) { stats.tight++; continue; }
    if (bb < priceLo || ba > priceHi) { stats.tail++; continue; }
    const days = daysUntil(m.endDate, now);
    if (days == null || days < minDays) { stats.tooSoon++; continue; }
    if (m.acceptingOrders === false) { stats.notAccepting++; continue; }
    const v24 = num(m.volume24hr, 0);
    if (v24 < minVol24) { stats.thin++; continue; }
    const toks = parseTokens(m);
    if (!toks) { stats.noTok++; continue; }

    kept.push({
      id: m.id,
      question: m.question,
      yesToken: toks[0],
      tick: num(m.orderPriceMinTickSize, 0.01) || 0.01,
      endDate: m.endDate,
      days,
      spreadHint: spread,
      bbHint: bb, baHint: ba,
      vol24: v24,
      liq: num(m.liquidityNum, 0) || num(m.liquidity, 0),
    });
    stats.kept++;
  }
  kept.sort((a, b) => b.vol24 - a.vol24);
  return { kept, stats, params: { minSpread, minDays, minVol24, priceLo, priceHi } };
}

/* ============================================================
   SAMPLE: snapshot one token's book and reduce it to the few
   numbers the estimator needs.
   ============================================================ */
function snapshot(book, tick) {
  if (!book || book.bestBid == null || book.bestAsk == null) return null;
  const spread = book.bestAsk - book.bestBid;
  if (!(spread > 0)) return null;
  return {
    t: Date.now(),
    bestBid: book.bestBid,
    bestAsk: book.bestAsk,
    mid: book.mid,
    spread,
    // maker quote levels: one tick INSIDE the current best on each side
    bidQuote: book.bestBid + tick,
    askQuote: book.bestAsk - tick,
    // real size resting AT the best on each side (capacity proxy)
    bidSize: book.bids.length ? book.bids[0].size : 0,
    askSize: book.asks.length ? book.asks[0].size : 0,
    // depth within 1 tick of best on each side (how much we'd compete with)
    depthBid1: ob.depthWithin(book, 'sell', tick),
    depthAsk1: ob.depthWithin(book, 'buy', tick),
  };
}

/* ============================================================
   ESTIMATE maker edge for ONE market from its time series of
   snapshots. This is the heart of the honesty.

   For each consecutive pair of snapshots (s0 -> s1) we use the
   quote levels we WOULD have been resting at, decided from s0
   (no look-ahead), and test a strict trade-through using the
   movement of the mid from s0.mid to s1.mid:

     BID fills  when the mid falls THROUGH our bid quote:
                s0.mid > bidQuote AND s1.mid < bidQuote
                -> we BOUGHT at bidQuote. Captured edge vs s0.mid
                   = s0.mid - bidQuote (= s0.spread/2 - tick).
                   Adverse move = max(0, bidQuote - s1.mid)
                   (the mid kept running below our buy).

     ASK fills  when the mid rises THROUGH our ask quote:
                s0.mid < askQuote AND s1.mid > askQuote
                -> we SOLD at askQuote. Captured edge vs s0.mid
                   = askQuote - s0.mid.
                   Adverse move = max(0, s1.mid - askQuote).

   Net contribution of a fill (per share) = captured - adverse.
   A round-trip needs one fill on each side; since fills arrive
   asynchronously we aggregate per-SIDE and report:
     - per-side fill rate (fraction of intervals a side filled)
     - per-side captured & adverse (¢/share)
     - net edge per ROUND-TRIP = (capturedBid+capturedAsk)
                                 - (adverseBid+adverseAsk),
       i.e. the spread you earn buying low + selling high MINUS
       the adverse drift you ate on both legs.

   This is deliberately conservative: trade-through-only fills
   UNDERcount fills (a resting maker at the touch gets hit more
   often than the mid strictly crossing), while adverse marking
   to the next mid FULLY charges the information in the move.
   ============================================================ */
function estimateMarket(series, ctx = {}) {
  const n = series.length;
  if (n < 2) return null;

  let intervals = 0;
  let bidFills = 0, askFills = 0;
  let capBid = 0, capAsk = 0;       // captured ¢ summed over fills (per share)
  let advBid = 0, advAsk = 0;       // adverse ¢ summed over fills (per share)
  const spreads = [], depthBids = [], depthAsks = [], bestBidSizes = [], bestAskSizes = [];

  for (let i = 1; i < n; i++) {
    const s0 = series[i - 1], s1 = series[i];
    if (!s0 || !s1) continue;
    intervals++;
    spreads.push(s0.spread);
    depthBids.push(s0.depthBid1); depthAsks.push(s0.depthAsk1);
    bestBidSizes.push(s0.bidSize); bestAskSizes.push(s0.askSize);

    const bidQuote = s0.bidQuote, askQuote = s0.askQuote;

    // BID fill: mid fell strictly through our resting bid quote.
    if (s0.mid > bidQuote && s1.mid < bidQuote) {
      bidFills++;
      capBid += (s0.mid - bidQuote);                 // earned vs the mid we quoted around
      advBid += Math.max(0, bidQuote - s1.mid);      // mid ran below our buy
    }
    // ASK fill: mid rose strictly through our resting ask quote.
    if (s0.mid < askQuote && s1.mid > askQuote) {
      askFills++;
      capAsk += (askQuote - s0.mid);
      advAsk += Math.max(0, s1.mid - askQuote);      // mid ran above our sell
    }
  }

  if (intervals < 1) return null;

  const fills = bidFills + askFills;
  const bidFillRate = bidFills / intervals;
  const askFillRate = askFills / intervals;

  // Per-FILL averages (¢/share), guarding empty sides.
  const capBidPer = bidFills ? capBid / bidFills : 0;
  const capAskPer = askFills ? capAsk / askFills : 0;
  const advBidPer = bidFills ? advBid / bidFills : 0;
  const advAskPer = askFills ? advAsk / askFills : 0;

  // Net edge per FILL on each side (capture minus adverse) — the cleanest
  // honest per-event number.
  const netBidPer = capBidPer - advBidPer;
  const netAskPer = capAskPer - advAskPer;

  // Net edge per ROUND-TRIP (buy one + sell one). We pair the average
  // bid-fill and average ask-fill economics. If a side never filled in
  // the window, its capture/adverse are 0 and it contributes nothing —
  // honest, because we never observed that leg trading.
  const netRoundTrip = netBidPer + netAskPer;
  const grossRoundTrip = capBidPer + capAskPer;
  const adverseRoundTrip = advBidPer + advAskPer;

  // Expected net edge per INTERVAL weighting fills by how often they happen
  // (a side that captures a lot but rarely fills is worth less). This is the
  // realized $/share/interval the segment would actually earn.
  const expPerInterval = bidFillRate * netBidPer + askFillRate * netAskPer;

  // Capacity proxy: the size resting at the best you can realistically
  // join/improve. Use the median best-of-book size on the thinner side.
  const capacityShares = Math.min(median(bestBidSizes), median(bestAskSizes));

  return {
    id: ctx.id, question: ctx.question, days: ctx.days,
    intervals, fills, bidFills, askFills,
    bidFillRate, askFillRate,
    avgSpread: mean(spreads),
    medSpread: median(spreads),
    capBidPer, capAskPer, advBidPer, advAskPer,
    netBidPer, netAskPer,
    grossRoundTrip, adverseRoundTrip, netRoundTrip,
    expPerInterval,
    medDepthBid: median(depthBids), medDepthAsk: median(depthAsks),
    capacityShares,
    medBestBidSize: median(bestBidSizes), medBestAskSize: median(bestAskSizes),
  };
}

/* ============================================================
   Aggregate per-market estimates into a segment verdict.
   We weight round-trip economics by observed fills so a market
   that barely traded doesn't dominate, and we report capacity.
   ============================================================ */
function aggregate(estimates) {
  const valid = estimates.filter(Boolean);
  let totBidFills = 0, totAskFills = 0, totIntervals = 0;
  let capBidW = 0, capAskW = 0, advBidW = 0, advAskW = 0;
  for (const e of valid) {
    totBidFills += e.bidFills; totAskFills += e.askFills; totIntervals += e.intervals;
    capBidW += e.capBidPer * e.bidFills; advBidW += e.advBidPer * e.bidFills;
    capAskW += e.capAskPer * e.askFills; advAskW += e.advAskPer * e.askFills;
  }
  const capBid = totBidFills ? capBidW / totBidFills : 0;
  const advBid = totBidFills ? advBidW / totBidFills : 0;
  const capAsk = totAskFills ? capAskW / totAskFills : 0;
  const advAsk = totAskFills ? advAskW / totAskFills : 0;

  const grossRT = capBid + capAsk;
  const advRT = advBid + advAsk;
  const netRT = grossRT - advRT;

  return {
    markets: valid.length,
    totIntervals, totBidFills, totAskFills,
    capBid, capAsk, advBid, advAsk,
    grossRoundTrip: grossRT, adverseRoundTrip: advRT, netRoundTrip: netRT,
    medCapacity: median(valid.map((e) => e.capacityShares)),
  };
}

module.exports = {
  screenMarkets, snapshot, estimateMarket, aggregate,
  // helpers exported for the scanner / tests
  parseTokens, daysUntil, mean, median,
};
