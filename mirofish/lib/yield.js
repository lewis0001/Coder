'use strict';
/* ============================================================
   lib/yield.js — two SIMPLE, practical YIELD angles on Polymarket.
   ------------------------------------------------------------
   ANGLE A — HOLDING REWARDS
     Polymarket pays a fixed, treasury-funded HOLDING reward on
     positions in eligible markets (the Gamma flag
     `holdingRewardsEnabled === true`). Verified against the
     official help-center mechanics (June 2026):

        reward/hour = positionValue * (HOLD_APR / 365 / 24)
        positionValue = sum_over_outcomes(shares_o * mid_o)
        HOLD_APR = 0.0325 (3.25% annualized, "variable, at
                   Polymarket's discretion"; launched at 4%).
        Sampled once/hour, paid daily, BOTH Yes and No holders
        earn, valued at the live MID-price.

     The public API does NOT expose a per-market holding rate —
     only the boolean eligibility flag. The rate is the single
     program-wide APR above. So the holding YIELD is simply
     HOLD_APR on the mid-value of whatever you hold, and the only
     per-market variables that matter are:
       (1) is the market fee-free? (entry/exit taker fee is the
           main cost that can swamp a 3.25%/yr subsidy), and
       (2) is the position DIRECTIONALLY RISKLESS? The clean play
           is to hold a HEDGED set: buy YES and NO so the pair is
           worth ~$1 at resolution regardless of outcome, and earn
           3.25%/yr on the mid-value with no directional risk. The
           ONLY costs are the bid/ask you cross to build the set
           and (if not fee-free) the taker fee.

   ANGLE B — CONVERGENCE CARRY
     Buy a near-CERTAIN, FEE-FREE leg that still trades below $1
     and hold to resolution for the gap to $1. We take favorites
     (buy YES at an executable ask in [0.90,0.995]) and near-dead
     longshots (buy NO at an executable ask in [0.90,0.995] on the
     NO token, i.e. the YES side is a [0.005,0.10] longshot). The
     carry is honest only if the implied breakeven upset rate is
     comfortably above the true upset probability.

        cost  = VWAP you actually pay to fill `shares` (buyCost)
        gap   = 1 - cost/share            (gross profit if it resolves your way)
        carry = gap / cost                (return on capital, to resolution)
        annualized = (1+carry)^(365/days) - 1  (compounded)
        breakeven hit-rate p* solves: p*(1) + (1-p*)(0) = cost
            => p* = cost   (you need to be right at least `cost` of the time)
        edge  = (your near-certainty estimate) - p*

   Zero dependencies. Reuses lib/orderbook + lib/feefree only.
   Does NOT edit any existing lib/*.js.
   ============================================================ */

const ob = require('./orderbook');

/* Program-wide holding-reward APR (official help-center, June 2026). */
const HOLD_APR = 0.0325;

/* Known reward-token addresses (lowercased) seen in clobRewards.assetAddress. */
const USDC_POLYGON = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // USDC.e, 6 dp

/* ---------------- ANGLE A: holding-reward universe ---------------- */

/* Pull every live market flagged holdingRewardsEnabled (paginated, polite). */
async function holdingUniverse({ pages = 1500, pageSleep = 80 } = {}) {
  const all = [];
  for (let off = 0; off < pages; off += 100) {
    let page;
    try {
      page = await ob.getJSON(
        `${ob.GAMMA}/markets?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`
      );
    } catch { break; }
    if (!Array.isArray(page) || !page.length) break;
    all.push(...page);
    if (page.length < 100) break;
    await new Promise((r) => setTimeout(r, pageSleep));
  }
  const hold = all.filter((m) => m.holdingRewardsEnabled === true);
  return { scanned: all.length, markets: hold };
}

/* The fee status that decides whether holding yield survives entry/exit.
   feesEnabled===false => no taker fee (the only markets where a 3.25%/yr
   subsidy isn't immediately swamped by a 3-7% round-trip fee). */
function holdMarketFee(m) {
  if (m.feesEnabled === false) return { free: true, rate: 0 };
  const r = m.feeSchedule && m.feeSchedule.rate != null ? +m.feeSchedule.rate : null;
  return { free: false, rate: r != null ? r : null, feeType: m.feeType || null };
}

/* The clean, directionally-RISKLESS holding play on one Yes/No market:
   buy a hedged set (1 YES + 1 NO) for the crossed cost, then earn HOLD_APR
   on the mid-value of the set for `days` until you can unwind / it resolves.
   Returns the per-$1-of-mid-value economics, fully net of the spread you
   cross to BUILD the set (and the taker fee if not fee-free), and the
   break-even holding days for the subsidy to pay back the entry cost. */
function hedgedHoldEconomics(bookYes, bookNo, m, { shares = 100 } = {}) {
  const fee = holdMarketFee(m);
  const by = ob.buyCost(bookYes, shares);
  const bn = ob.buyCost(bookNo, shares);
  if (by.exhausted || bn.exhausted || by.avgPrice == null || bn.avgPrice == null) return null;
  const setPrice = by.avgPrice + bn.avgPrice;          // $ to buy 1 YES + 1 NO
  const midSet = (bookYes.mid != null && bookNo.mid != null) ? bookYes.mid + bookNo.mid : setPrice;
  // entry cost above the $1 you get back at resolution (the overround you cross),
  // plus the taker fee on the dollars deployed if the market is fee-paying.
  const crossCost = Math.max(0, setPrice - 1);         // $ lost crossing the spread to build the set
  const feeCost = fee.free ? 0 : (fee.rate != null ? fee.rate * setPrice : null);
  const entryCost = feeCost != null ? crossCost + feeCost : null;
  // daily subsidy on the set's mid-value:
  const dailySubsidy = midSet * (HOLD_APR / 365);      // $/day on a hedged set
  const breakevenDays = (entryCost != null && dailySubsidy > 0) ? entryCost / dailySubsidy : null;
  return {
    fee, shares, setPrice, midSet,
    crossCost, feeCost, entryCost,
    dailySubsidy, breakevenDays,
    holdAprOnMid: HOLD_APR,               // gross subsidy yield on mid-value
  };
}

/* ---------------- ANGLE B: convergence carry --------------------- */

/* Carry economics for buying `shares` of a token at its executable ask and
   holding to resolution. `days` = days to endDate. Returns the executable
   cost, gap to $1, annualized carry, and the breakeven hit-rate. */
function carryEconomics(book, shares, days) {
  const bc = ob.buyCost(book, shares);
  if (bc.exhausted || bc.avgPrice == null || bc.filled <= 0) {
    return { fillable: false, filled: bc.filled, exhausted: bc.exhausted };
  }
  const cost = bc.avgPrice;                       // $/share you actually pay (VWAP)
  if (cost >= 1) return { fillable: false, cost };
  const gap = 1 - cost;                           // gross $/share if it resolves your way
  const carry = gap / cost;                       // return on capital to resolution
  const d = Math.max(days, 0.25);                 // floor to avoid blow-ups on same-day
  const annualized = Math.pow(1 + carry, 365 / d) - 1;
  const breakevenP = cost;                        // need to win >= `cost` of the time
  const capitalPerClip = bc.cost;                 // $ deployed for this clip
  return {
    fillable: true, filled: bc.filled, cost, gap, carry,
    annualized, breakevenP, capitalPerClip,
    impliedUpset: 1 - cost,                        // market-implied P(upset) = gap
  };
}

module.exports = {
  HOLD_APR, USDC_POLYGON,
  holdingUniverse, holdMarketFee, hedgedHoldEconomics,
  carryEconomics,
};
