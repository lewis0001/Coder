'use strict';
/* ============================================================
   lib/rewards.js — Polymarket maker LIQUIDITY-REWARDS universe.
   ------------------------------------------------------------
   Polymarket runs a daily maker-rewards program. Each eligible
   market carries a DAILY REWARD POOL paid out to makers who rest
   orders within `max_spread` CENTS of the midpoint at >= `min_size`
   shares. This module builds the universe of reward-bearing live
   markets and extracts the three numbers that decide the farm:

       pool      = USD/day handed to makers in this market
       maxSpread = how far (in cents) from mid your quote still scores
       minSize   = minimum resting size (shares) to qualify

   WHERE THE POOL COMES FROM (verified live):
     Gamma  /markets   -> m.clobRewards = [{ rewardsDailyRate, ... }]
     CLOB   /markets/{conditionId} -> .rewards = { rates:[{rewards_daily_rate}],
                                                   min_size, max_spread }
     Both agree (e.g. Argentina daily match = 400 USD/day, min 1000, spread 1.5c).
     We use Gamma as the bulk source (one paginated call) and treat
     `rewardsDailyRate` summed across the rates array as the pool.
     CLOB /rewards/markets is POST/auth-gated (405 on GET) — not needed.

   The Polymarket scoring function (documented) rewards two-sided
   quotes near the mid with a quadratic in-spread score; a lone
   maker posting `minSize` on both sides at the mid captures roughly
   his size / total qualifying size in the band. We approximate the
   "total qualifying size" by the live book depth within maxSpread.
   Zero dependencies. Reuses lib/orderbook primitives only.
   ============================================================ */
const ob = require('./orderbook');

/* Pull rewardsDailyRate out of the (string-or-array) clobRewards field. */
function poolFromClobRewards(clobRewards) {
  const arr = ob.parseJSON(clobRewards, null);
  if (!Array.isArray(arr) || !arr.length) return 0;
  // Sum daily rate across rates (normally one entry). rewardsDailyRate is USD/day.
  let pool = 0;
  for (const r of arr) {
    const rate = +r.rewardsDailyRate;
    if (Number.isFinite(rate)) pool += rate;
  }
  return pool;
}

/* Extract the reward params + identity from a Gamma market object. */
function rewardParams(m) {
  const pool = poolFromClobRewards(m.clobRewards);
  const maxSpreadCents = +m.rewardsMaxSpread || 0;   // CENTS from mid
  const minSize = +m.rewardsMinSize || 0;            // shares
  let tokenIds = ob.parseJSON(m.clobTokenIds, null);
  let outcomes = ob.parseJSON(m.outcomes, null);
  if (!Array.isArray(tokenIds)) tokenIds = null;
  if (!Array.isArray(outcomes)) outcomes = null;
  return {
    id: m.id,
    conditionId: m.conditionId,
    question: m.question || '',
    slug: m.slug,
    pool,                                  // USD/day reward pool
    maxSpreadCents,                        // cents
    maxSpreadDollars: maxSpreadCents / 100, // price units (shares priced 0..1)
    minSize,                               // shares
    holdingRewardsEnabled: !!m.holdingRewardsEnabled,
    tokenIds,
    outcomes,
    vol24: +m.volume24hr || 0,
    bestBidG: m.bestBid != null ? +m.bestBid : null,
    bestAskG: m.bestAsk != null ? +m.bestAsk : null,
    spreadG: m.spread != null ? +m.spread : null,
    enableOrderBook: m.enableOrderBook !== false,
    acceptingOrders: m.acceptingOrders !== false,
  };
}

/* True if a market actually pays maker rewards and is tradeable. */
function isRewardMarket(p) {
  return p.pool > 0 && p.maxSpreadCents > 0 && p.minSize > 0 &&
         Array.isArray(p.tokenIds) && p.tokenIds.length >= 2 &&
         p.enableOrderBook && p.acceptingOrders;
}

/* Build the universe of reward-bearing live markets (Gamma bulk). */
async function rewardUniverse({ pages = 1500, order = 'volume24hr' } = {}) {
  const all = [];
  for (let off = 0; off < pages; off += 100) {
    let page;
    try {
      page = await ob.getJSON(
        `${ob.GAMMA}/markets?closed=false&active=true&limit=100&offset=${off}&order=${order}&ascending=false`
      );
    } catch { break; }
    if (!Array.isArray(page) || !page.length) break;
    all.push(...page);
    if (page.length < 100) break;
  }
  const params = all.map(rewardParams).filter(isRewardMarket);
  return { scanned: all.length, markets: params };
}

/* Cross-check a single market's pool against the CLOB market object.
   Returns { gammaPool, clobPool, minSize, maxSpread } or null on failure. */
async function clobRewardCheck(conditionId) {
  try {
    const r = await ob.getJSON(`${ob.CLOB}/markets/${conditionId}`);
    const rates = (r.rewards && r.rewards.rates) || [];
    let pool = 0;
    for (const x of rates) { const v = +x.rewards_daily_rate; if (Number.isFinite(v)) pool += v; }
    return {
      clobPool: pool,
      minSize: r.rewards ? +r.rewards.min_size : null,
      maxSpread: r.rewards ? +r.rewards.max_spread : null,
    };
  } catch { return null; }
}

module.exports = {
  poolFromClobRewards, rewardParams, isRewardMarket,
  rewardUniverse, clobRewardCheck,
};
