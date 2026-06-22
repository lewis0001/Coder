'use strict';
/* ============================================================
   lib/feefree.js — build the FEE-FREE live Polymarket universe and
   VERIFY the fee status of every candidate market, then group it into
   the structures we want to test for NET-tradeable structural edges
   (temporal "by-date" chains; negRisk multi-candidate fields).

   WHY THIS FILE EXISTS
   --------------------
   The whole research program proved the gross structural edges (temporal
   logical arb on nested by-date chains; overround / buy-all-NO on
   mutually-exclusive fields) are REAL but get killed by Polymarket's
   category taker fees (sports 3% / politics 4% / econ-culture 5% /
   crypto 7%). One liquid category is FEE-FREE: geopolitics / world-leader
   markets (Strait of Hormuz "by <date>", Iran/Israel, "next PM of X").
   On a fee-free market, net edge == gross edge (you still cross the real
   bid/ask spread via a book walk, but pay no taker fee). This module
   isolates that universe so the scanner can test whether removing the fee
   turns any gross edge into a real one.

   FEE-FREE DETECTION (verified per market, never assumed)
   ------------------------------------------------------
   A Gamma market object is fee-free iff `feesEnabled === false`. Empirically
   (verified live) fee-free markets ALSO carry feeType=null and have no
   feeSchedule, while fee-paying markets carry feeType e.g. "sports_fees_v2"
   and feeSchedule={rate:0.03..0.07, takerOnly:true}. We treat a market as
   fee-free only when feesEnabled===false AND there is no positive-rate
   feeSchedule. isFeeFree() returns that boolean + a reason so the scanner
   can print the verification.

   KEY STRUCTURAL FIX vs lib/arb-logical.js
   ----------------------------------------
   In arb-logical.js temporal chains are grouped WITHIN a single Gamma
   event. But the live geopolitics by-date chains are split across SEPARATE
   single-market events (e.g. "Hormuz returns to normal by July 15?" and
   "...by July 31?" are events 591973 and 455867). So here we chain
   temporally ACROSS events, keyed on a subject signature (the question with
   the date stripped). We also take the deadline from the Gamma `endDate`
   field first (precise ISO), falling back to text parsing, which fixes
   un-parseable phrasings like "by end of June".

   Zero dependencies. Does NOT edit any existing lib/*.js.
   ============================================================ */

const { getJSON, GAMMA, parseJSON } = require('./orderbook');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- fee verification ---------------------------------- */
/* Returns { free, rate, reason }. `free` is true only when the market is
   genuinely fee-free. `rate` is the taker fee rate that WOULD apply if it
   were a fee-paying market (from feeSchedule, else inferred from feeType),
   so the scanner can contrast net-vs-fee-paying. */
function isFeeFree(m) {
  const fe = m.feesEnabled;
  const fs = m.feeSchedule || null;
  const scheduleRate = fs && fs.rate != null ? +fs.rate : null;
  // fee-paying: feesEnabled true (or a positive-rate schedule present)
  if (fe === true || (scheduleRate != null && scheduleRate > 0)) {
    return { free: false, rate: scheduleRate != null && scheduleRate > 0 ? scheduleRate : inferRate(m), reason: `fee-paying (feesEnabled=${fe}, feeType=${m.feeType || 'n/a'}, rate=${scheduleRate})` };
  }
  if (fe === false) {
    return { free: true, rate: 0, reason: `fee-free (feesEnabled=false, feeType=${m.feeType == null ? 'null' : m.feeType}, feeSchedule=${fs ? 'present' : 'null'})` };
  }
  // Unknown / undefined feesEnabled: be conservative, treat as NOT verified fee-free.
  return { free: false, rate: inferRate(m), reason: `fee status unverified (feesEnabled=${fe})` };
}
/* Category taker rate a fee-paying market of this type would charge — used
   ONLY for the "what it would cost on a fee market" contrast. */
function inferRate(m) {
  const t = String(m.feeType || '').toLowerCase();
  if (m.feeSchedule && m.feeSchedule.rate != null) return +m.feeSchedule.rate;
  if (/sport/.test(t)) return 0.03;
  if (/polit/.test(t)) return 0.04;
  if (/crypto/.test(t)) return 0.07;
  if (/econ|culture/.test(t)) return 0.05;
  return 0.04; // politics-default for the geopolitics class we contrast against
}

/* A market is a tradeable leg only if its book is open and orders accepted. */
function isTradeable(m) {
  return !!m
    && m.closed === false
    && m.active !== false
    && m.acceptingOrders === true
    && m.enableOrderBook === true;
}

/* Has the resolution deadline already passed? Expired by-date markets (e.g.
   "by June 15?" when today is June 22) are dead — their books are stale /
   one-sided and must never be counted as a live leg. */
function isExpired(m, now = Date.now()) {
  const d = m.endDate ? Date.parse(m.endDate) : NaN;
  return isFinite(d) && d < now - 12 * 3600 * 1000; // small grace for tz
}

/* yes/no CLOB token ids for a clean 2-outcome Yes/No market. */
function yesNoTokens(m) {
  const outcomes = parseJSON(m.outcomes, []);
  const toks = parseJSON(m.clobTokenIds, []);
  if (!Array.isArray(outcomes) || outcomes.length !== 2) return null;
  if (!Array.isArray(toks) || toks.length !== 2) return null;
  const o0 = String(outcomes[0]).trim().toLowerCase();
  const o1 = String(outcomes[1]).trim().toLowerCase();
  let yesIdx;
  if (o0 === 'yes' && o1 === 'no') yesIdx = 0;
  else if (o0 === 'no' && o1 === 'yes') yesIdx = 1;
  else return null;
  return { yes: String(toks[yesIdx]), no: String(toks[1 - yesIdx]) };
}

/* ---------------- deadline parsing (endDate-first) ------------------ */
const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
function parseDeadlineText(q) {
  const s = String(q || '');
  // "end of June", "end of the month" -> last day of that month
  let m = s.match(/end of (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?:,?\s*(\d{4}))?/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()]; const yr = m[2] ? Number(m[2]) : 2026;
    return Date.UTC(yr, mo + 1, 0) / 86400000; // day 0 of next month = last day
  }
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/gi;
  let last = null, mm;
  while ((mm = re.exec(s))) {
    const mo = MONTHS[mm[1].toLowerCase()];
    if (mo == null) continue;
    last = { mo, day: Number(mm[2]), yr: mm[3] ? Number(mm[3]) : null };
  }
  if (!last) return null;
  return Date.UTC(last.yr || 2026, last.mo, last.day) / 86400000;
}
/* Deadline as an epoch-day Number. Prefer the precise Gamma endDate; fall
   back to text. Returns null if neither yields a date. */
function marketDeadline(m) {
  const d = m.endDate ? Date.parse(m.endDate) : NaN;
  if (isFinite(d)) return Math.round(d / 86400000);
  return parseDeadlineText(m.question);
}
/* Is this a CUMULATIVE "by/before <date>" question (nests temporally) vs a
   disjoint window ("between X and Y") that does not? */
function isCumulativeDeadline(q) {
  const s = String(q || '').toLowerCase();
  if (/\bbetween\b/.test(s)) return false;
  return /\b(by|before|prior to|on or before|no later than|by end of|returns to normal by)\b/.test(s)
    || /\bby (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s)
    || /\bby end of\b/i.test(s);
}
/* Subject signature: question with the specific deadline / date stripped, so
   the SAME underlying subject across different by-dates collapses to one key.
   We strip month-day(-year), "end of <month>", and standalone years. */
function temporalSubjectKey(q) {
  return String(q || '')
    .toLowerCase()
    .replace(/by end of (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(,?\s*\d{4})?/gi, 'by #')
    .replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(,?\s*\d{4})?/gi, '#')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/[?.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* =====================================================================
   UNIVERSE BUILD
   ===================================================================== */

/* Pull the live market universe (by 24h volume) and the live events, verify
   each market's fee status, and return the FEE-FREE tradeable subset plus
   bookkeeping. Polite: concurrency is just sequential paging here.

   Returns {
     markets:   [feeFreeMarket...],         // verified fee-free + tradeable + not expired
     allCount, freeCount, paidCount, expiredFree,
     events:    Map(eventId -> {event, legs}) // negRisk fields, fee-free legs only
   }
*/
async function buildFeeFreeUniverse({ marketLimit = 2500, eventLimit = 1500, pageSleep = 110 } = {}) {
  // ---- markets (for fee verification + temporal chains across events) ----
  const allMarkets = [];
  for (let off = 0; off < marketLimit; off += 100) {
    let page;
    try { page = await getJSON(`${GAMMA}/markets?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`); }
    catch { break; }
    if (!Array.isArray(page) || !page.length) break;
    allMarkets.push(...page);
    if (page.length < 100) break;
    await sleep(pageSleep);
  }

  let freeCount = 0, paidCount = 0, unverified = 0, expiredFree = 0;
  const feeFree = [];
  for (const m of allMarkets) {
    const ff = isFeeFree(m);
    if (!ff.free) { if (m.feesEnabled === true) paidCount++; else unverified++; continue; }
    freeCount++;
    if (!isTradeable(m)) continue;
    if (isExpired(m)) { expiredFree++; continue; }
    m.__fee = ff; // attach verification
    feeFree.push(m);
  }

  // ---- events (for negRisk multi-candidate fields) ----
  const allEvents = [];
  for (let off = 0; off < eventLimit; off += 100) {
    let page;
    try { page = await getJSON(`${GAMMA}/events?closed=false&active=true&limit=100&offset=${off}&order=volume24hr&ascending=false`); }
    catch { break; }
    if (!Array.isArray(page) || !page.length) break;
    allEvents.push(...page);
    if (page.length < 100) break;
    await sleep(pageSleep);
  }

  return {
    markets: feeFree,
    allMarkets,
    allEvents,
    allCount: allMarkets.length,
    freeCount, paidCount, unverified, expiredFree,
  };
}

/* ---------------- temporal chains (CROSS-EVENT) --------------------- */
/* Group fee-free, cumulative-deadline, Yes/No markets by subject signature.
   A "chain" is a subject with >=2 distinct deadlines. Each is sorted by
   deadline ascending. Returns [{ subject, legs:[{m,tokens,deadline}] }]. */
function temporalChains(feeFreeMarkets) {
  const groups = new Map();
  for (const m of feeFreeMarkets) {
    if (!isCumulativeDeadline(m.question)) continue;
    const tokens = yesNoTokens(m);
    if (!tokens) continue;
    const dl = marketDeadline(m);
    if (dl == null) continue;
    const key = temporalSubjectKey(m.question);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ m, tokens, deadline: dl });
  }
  const chains = [];
  for (const [subject, legs] of groups) {
    // de-dup identical deadlines (keep the more liquid)
    const byDl = new Map();
    for (const l of legs) {
      const prev = byDl.get(l.deadline);
      if (!prev || (l.m.volume24hr || 0) > (prev.m.volume24hr || 0)) byDl.set(l.deadline, l);
    }
    const uniq = [...byDl.values()].sort((a, b) => a.deadline - b.deadline);
    if (uniq.length < 2) continue;
    chains.push({ subject, legs: uniq });
  }
  return chains;
}

/* Build the executable TEMPORAL LEG-PAIRS from chains: for every (early,late)
   pair in a chain, the lock is YES(by LATE) + NO(by EARLY) — pays >= $1 in
   every state because {by EARLY} ⊆ {by LATE}. */
function temporalPairsFromChains(chains) {
  const pairs = [];
  for (const c of chains) {
    for (let i = 0; i < c.legs.length; i++) {
      for (let j = i + 1; j < c.legs.length; j++) {
        const early = c.legs[i], late = c.legs[j];
        if (early.deadline === late.deadline) continue;
        pairs.push({
          type: 'temporal',
          subject: c.subject,
          why: `temporal: YES(by ${dlLabel(late)}) + NO(by ${dlLabel(early)}); {by earlier}⊆{by later}`,
          left: { token: late.tokens.yes, side: 'YES', m: late.m },
          right: { token: early.tokens.no, side: 'NO', m: early.m },
          earlyDeadline: early.deadline, lateDeadline: late.deadline,
        });
      }
    }
  }
  return pairs;
}
function dlLabel(leg) {
  const m = leg.m || {};
  if (m.endDate) return String(m.endDate).slice(0, 10);
  return String(leg.deadline);
}

/* ---------------- negRisk fields (all-NO / overround) --------------- */
/* From the live events, build FEE-FREE negRisk fields: events flagged
   negRisk whose tradeable, non-expired legs are ALL fee-free (verified) and
   2-outcome Yes/No. Returns [{ event, legs:[{m,tokens,fee}] }]. */
function feeFreeFields(allEvents) {
  const fields = [];
  for (const e of allEvents) {
    if (e.negRisk !== true) continue;
    const legs = [];
    let anyPaid = false;
    for (const m of e.markets || []) {
      if (!isTradeable(m) || isExpired(m)) continue;
      const ff = isFeeFree(m);
      const tokens = yesNoTokens(m);
      if (!tokens) continue;
      if (!ff.free) { anyPaid = true; continue; }
      legs.push({ m, tokens, fee: ff });
    }
    if (legs.length >= 2 && !anyPaid) fields.push({ event: e, legs });
  }
  return fields;
}

module.exports = {
  isFeeFree, inferRate, isTradeable, isExpired, yesNoTokens,
  marketDeadline, parseDeadlineText, isCumulativeDeadline, temporalSubjectKey,
  buildFeeFreeUniverse, temporalChains, temporalPairsFromChains, feeFreeFields,
  dlLabel,
};
