'use strict';
/* ============================================================
   Signal-based strategy — "CRYPTO TAIL SNIPER"
   ------------------------------------------------------------
   This is a fully INSPECTABLE rule, not a magic edge. It buys
   cheap "long-shot" YES contracts that are showing short-term
   upward momentum, and exits on take-profit / stop / momentum
   reversal / approaching resolution.

   Every decision returns a human-readable `reason` so you can
   audit exactly why a trade fired.
   ============================================================ */

const DEFAULTS = {
  // ENTRY band: cheap "tail" long shots up through coin-flip momentum plays.
  // The strategy is momentum-primary; cheapness just boosts conviction/size,
  // which is what gives it the "tail sniper" character.
  entryMin: 0.03,      // 3¢  — ignore dust that can't realistically fill
  entryMax: 0.68,      // 68¢ — above this there's little upside left
  tailMax: 0.30,       // <=30¢ counts as a genuine "tail" (size/conf boost)
  momentumLookback: 4, // samples
  momentumMin: 0.0015, // mid must have risen >= 0.15¢ over the window
  minVolume24h: 0,     // intraday markets start at 0 vol; the live book is the gate
  maxSpread: 0.05,     // skip wide books (paper fills would be unrealistic)
  requireEdgeOverCost: true, // only trade when expected move > round-trip spread
  edgeSafety: 1.0,     // multiple of spread the expected move must clear
  // EXITS
  takeProfit: 0.40,    // +40% on the contract price
  stopLoss: 0.30,      // -30%
  resolveCutoffH: 0.05, // flatten if < 3 min to resolution
};

// linear slope of recent mids (per sample), simple & transparent
function slope(history, n) {
  const h = history.slice(-n);
  if (h.length < 2) return 0;
  const xs = h.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = h.reduce((a, b) => a + b, 0) / h.length;
  let num = 0, den = 0;
  for (let i = 0; i < h.length; i++) { num += (xs[i] - mx) * (h[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? num / den : 0;
}

function hoursUntil(endDate) {
  if (!endDate) return Infinity;
  return (new Date(endDate).getTime() - Date.now()) / 3600000;
}

/* Decide on a single market given its live snapshot + price history.
   Returns {action, reason, confidence} where action ∈ enter|exit|hold. */
function decide(market, history, position, cfg = DEFAULTS) {
  const mid = market.mid;
  const spread = market.bestAsk > 0 && market.bestBid > 0 ? market.bestAsk - market.bestBid : 1;
  const mom = slope(history, cfg.momentumLookback);
  const hrs = hoursUntil(market.endDate);

  if (position) {
    const ret = (mid - position.avgPrice) / position.avgPrice;
    if (hrs < cfg.resolveCutoffH) return { action: 'exit', reason: `resolve<${cfg.resolveCutoffH}h`, confidence: 1 };
    if (ret >= cfg.takeProfit) return { action: 'exit', reason: `take-profit +${(ret * 100).toFixed(0)}%`, confidence: 0.9 };
    if (ret <= -cfg.stopLoss) return { action: 'exit', reason: `stop-loss ${(ret * 100).toFixed(0)}%`, confidence: 0.9 };
    if (mom < -cfg.momentumMin) return { action: 'exit', reason: 'momentum reversed', confidence: 0.7 };
    return { action: 'hold', reason: `holding ${(ret * 100).toFixed(0)}%`, confidence: 0.5 };
  }

  // ENTRY gate — every condition must pass
  if (mid < cfg.entryMin || mid > cfg.entryMax) return { action: 'hold', reason: 'outside tail band', confidence: 0 };
  if (market.volume24hr < cfg.minVolume24h) return { action: 'hold', reason: 'illiquid', confidence: 0 };
  if (spread > cfg.maxSpread) return { action: 'hold', reason: 'spread too wide', confidence: 0 };
  if (hrs < cfg.resolveCutoffH) return { action: 'hold', reason: 'too close to resolution', confidence: 0 };
  if (mom < cfg.momentumMin) return { action: 'hold', reason: 'no upward momentum', confidence: 0.2 };

  // SIGNAL-MUST-EXCEED-COST GATE. A round trip pays the full spread (you buy at
  // the ask, sell at the bid). Only enter if the move we expect over the hold
  // plausibly exceeds that cost — otherwise we're trading noise into a guaranteed
  // spread loss, which backtesting proved is a net loser. This makes the bot
  // trade rarely on near-efficient markets, which is the honest behaviour.
  if (cfg.requireEdgeOverCost !== false) {
    const expectedMove = mom * cfg.momentumLookback;   // projected drift over the window
    if (expectedMove < spread * (cfg.edgeSafety || 1)) {
      return { action: 'hold', reason: `edge<cost (${(expectedMove * 100).toFixed(2)}¢ < ${(spread * 100).toFixed(2)}¢ spread)`, confidence: 0.1 };
    }
  }

  // confidence scales with momentum strength and cheapness of the tail
  const cheapEdge = Math.max(0, 1 - mid / cfg.entryMax);  // cheaper = better payoff
  const momEdge = Math.min(1, mom / (cfg.momentumMin * 6));
  const confidence = Math.max(0, Math.min(1, 0.4 + 0.35 * momEdge + 0.25 * cheapEdge));
  const isTail = mid <= cfg.tailMax;
  const tag = isTail ? `tail snipe @${(mid * 100).toFixed(1)}¢` : `momentum @${(mid * 100).toFixed(1)}¢`;
  return { action: 'enter', reason: `${tag} mom+${(mom * 100).toFixed(2)}`, confidence };
}

module.exports = { decide, slope, hoursUntil, DEFAULTS };
