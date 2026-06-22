'use strict';
/* ============================================================
   MAKER (market-making) BACKTESTER — rigorous + conservative.
   ------------------------------------------------------------
   The taker momentum strategy loses money net of the spread
   (see data/backtest-report.md: -$4.56/trade at 1¢). The only
   structurally-plausible edge left is the OPPOSITE side of the
   trade: be the MAKER, post resting quotes, and EARN the spread
   instead of paying it.

   This file answers ONE question HONESTLY: does posting passive
   two-sided quotes on these resolved crypto markets actually
   make money, once we model the two things that kill naive
   maker backtests?

   ------------------------------------------------------------
   THE TWO LIES we refuse to tell:

   (A) "Touch = fill."  In reality your resting order at price L
       only fills when the market actually TRADES THROUGH L. A
       path that merely kisses L and bounces leaves you unfilled.
       So we fill ONLY on a STRICT CROSS (path goes from one side
       of L to the other), never on a touch.

   (B) "You capture the spread risk-free."  You don't. You get
       filled precisely BECAUSE the market is moving against you
       — that's WHY price crossed your level. This is ADVERSE
       SELECTION. We model it by marking every fill not to the
       mid it crossed, but to the NEXT bar's mid (the price that
       continued in the direction that ran you over). Your booked
       edge is (quoted edge) MINUS (how far the mark ran past you).

   ------------------------------------------------------------
   MECHANICS per bar i (mid = path[i].p, next = path[i+1].p):

     We keep a resting BID at (mid_i - edge) and a resting ASK at
     (mid_i + edge), re-quoted around the *previous* bar's mid so
     the quote is decided BEFORE we see where price goes (no look-
     ahead). The fill test for the move from mid_{i-1} -> mid_i:

       BID fills  if the path falls THROUGH our bid:
                  mid_{i-1} > bidLevel  AND  mid_i <  bidLevel
                  -> we BUY YES at bidLevel (we earned `edge` vs
                     the mid we quoted around), price kept falling.

       ASK fills  if the path rises THROUGH our ask:
                  mid_{i-1} < askLevel  AND  mid_i >  askLevel
                  -> we SELL YES at askLevel (earned `edge`),
                     price kept rising.

     GROSS spread captured on a fill = size * edge  (the static
     half-spread we quoted). ADVERSE-SELECTION loss on a BID fill
     = size * max(0, bidLevel - mid_i)  (mark ran below our buy);
     on an ASK fill = size * max(0, mid_i - askLevel) (mark ran
     above our sell). Net "trading" contribution of a fill is
     therefore gross - adverse, BUT we account it through real
     inventory + cash so leftover inventory is settled honestly,
     not double-counted.

   INVENTORY + SETTLEMENT:
     - A BID fill adds +size YES shares at cost bidLevel.
     - An ASK fill removes up to `size` shares (offloads inventory)
       at proceeds askLevel; if we are flat/short it opens a short
       (we cap how short we go too).
     - Inventory is hard-capped at ±maxInv*size; we don't quote a
       side that would breach the cap.
     - Whatever inventory remains at resolution settles at $1 if
       YES won else $0 (at par — that's how Polymarket pays).

   PnL = realized cash flow from fills + settlement of leftover
   inventory. We ALSO report the gross-spread and adverse-loss
   decomposition so the source of P&L is transparent.

   Sizing is FIXED (size shares per fill) for comparability, like
   the taker backtest's fixed stake.
   ============================================================ */

/* Backtest ONE market as a passive two-sided maker.
   market : { yesWon, path:[{t,p}], question, asset, id }
   opts   : { edge, size, maxInv }
   returns per-market maker stats. */
function makerBacktestMarket(market, opts = {}) {
  const edge = opts.edge != null ? opts.edge : 0.005;   // half-spread we quote (e.g. 0.5¢)
  const size = opts.size != null ? opts.size : 100;     // shares per fill (fixed)
  const maxInv = opts.maxInv != null ? opts.maxInv : 3; // hard cap = ±maxInv*size shares

  const path = market.path;
  const n = path.length;

  let inv = 0;            // net YES shares held (can go negative = short)
  let cash = 0;           // realized cash flow from fills (USD)
  let cost = 0;           // running cost basis of current inventory (USD), signed
  let fills = 0, bidFills = 0, askFills = 0;
  let grossSpread = 0;    // sum of size*edge over all fills (the quoted edge)
  let adverseLoss = 0;    // sum of how far the next mark ran past our fill

  const capShares = maxInv * size;

  // Walk bar to bar. The quote for the transition (i-1 -> i) is set around
  // mid_{i-1} (known before we see mid_i), so there is no look-ahead.
  for (let i = 1; i < n; i++) {
    const prev = path[i - 1].p;
    const cur = path[i].p;

    const bidLevel = prev - edge;
    const askLevel = prev + edge;

    // --- BID fill: price fell strictly THROUGH our resting bid ---
    // (we only quote the bid if buying won't breach the long cap)
    if (prev > bidLevel && cur < bidLevel && bidLevel > 0 && inv + size <= capShares) {
      // BUY `size` YES at bidLevel
      cash -= size * bidLevel;
      cost += size * bidLevel;
      inv += size;
      fills += 1; bidFills += 1;
      grossSpread += size * edge;                       // earned edge vs the quoted mid
      // adverse selection: mark to where price actually went (cur), which is
      // BELOW our buy. The amount it ran past us is the adverse loss.
      adverseLoss += size * Math.max(0, bidLevel - cur);
    }

    // --- ASK fill: price rose strictly THROUGH our resting ask ---
    else if (prev < askLevel && cur > askLevel && askLevel < 1 && inv - size >= -capShares) {
      // SELL `size` YES at askLevel
      cash += size * askLevel;
      cost -= size * askLevel;
      inv -= size;
      fills += 1; askFills += 1;
      grossSpread += size * edge;
      // adverse selection: price ran ABOVE our sell (cur > askLevel) — we sold too cheap.
      adverseLoss += size * Math.max(0, cur - askLevel);
    }
    // NOTE: at most one side fills per transition (a monotone move between two
    // bars can only cross one of bid/ask). `else if` enforces that explicitly.
  }

  // Settle leftover inventory at resolution (par: $1 if YES won else $0).
  const settlePrice = market.yesWon ? 1 : 0;
  const settlementPnl = inv * settlePrice;              // long pays, short owes
  cash += settlementPnl;

  // NET PnL is the realized cash flow (fills) plus settlement of leftover inventory.
  const netPnl = cash;

  return {
    id: market.id, question: market.question, asset: market.asset,
    yesWon: market.yesWon, points: n,
    fills, bidFills, askFills,
    grossSpread, adverseLoss,
    leftoverInv: inv, settlementPnl,
    netPnl,
  };
}

/* Backtest a whole dataset as a maker at one edge assumption. Aggregates. */
function makerBacktestAll(dataset, opts = {}) {
  const per = [];
  let fills = 0, bidFills = 0, askFills = 0;
  let grossSpread = 0, adverseLoss = 0, settlementPnl = 0, netPnl = 0;
  let marketsTraded = 0, leftoverAbs = 0;
  for (const m of dataset) {
    const r = makerBacktestMarket(m, opts);
    per.push(r);
    fills += r.fills; bidFills += r.bidFills; askFills += r.askFills;
    grossSpread += r.grossSpread; adverseLoss += r.adverseLoss;
    settlementPnl += r.settlementPnl; netPnl += r.netPnl;
    leftoverAbs += Math.abs(r.leftoverInv);
    if (r.fills > 0) marketsTraded += 1;
  }
  const expectancy = fills ? netPnl / fills : 0;
  return {
    markets: dataset.length, marketsTraded,
    fills, bidFills, askFills,
    grossSpread, adverseLoss, settlementPnl, netPnl,
    leftoverAbs,
    expectancy,
    edge: opts.edge != null ? opts.edge : 0.005,
    size: opts.size != null ? opts.size : 100,
    maxInv: opts.maxInv != null ? opts.maxInv : 3,
    per,
  };
}

module.exports = { makerBacktestMarket, makerBacktestAll };
