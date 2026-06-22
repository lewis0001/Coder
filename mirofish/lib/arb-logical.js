'use strict';
/* ============================================================
   lib/arb-logical.js — LOGICAL ARBITRAGE between live markets.
   ------------------------------------------------------------
   Goal: find pairs of CURRENTLY-LIVE Polymarket markets whose
   outcomes are logically linked, where the live order books are
   crossable RIGHT NOW for a locked profit.

   The whole edge reduces to ONE executable primitive:

     Find two outcome-tokens L1, L2 (each its own order book) such
     that holding ONE share of each pays >= $1 in EVERY state of
     the world. Then if you can BUY both for a combined VWAP cost
     < $1 (walking each leg's real ask depth for the SAME clip),
     you have locked (>=1 - cost) per share, risk-free.

   Three constraint families, all collapsing to that primitive:

   1) NESTED THRESHOLDS  (same asset + date)
        {price > HIGH} ⊆ {price > LOW}  =>  P(>HIGH) <= P(>LOW).
        Lock: buy YES(>LOW) + NO(>HIGH).
          state price<=LOW : 0 + 1 = 1
          state LOW<p<=HIGH: 1 + 1 = 2
          state p>HIGH     : 1 + 0 = 1     -> pays >= 1 always.
        Profit iff  ask(YES>LOW) + ask(NO>HIGH) < 1.
        (Symmetric "below/dip-to" thresholds invert the direction.)

   2) TEMPORAL  (same subject, cumulative "by/before" deadlines)
        {by EARLY} ⊆ {by LATE}  =>  P(by EARLY) <= P(by LATE).
        Lock: buy YES(by LATE) + NO(by EARLY).  Pays >= 1 always.
        Profit iff  ask(YES byLATE) + ask(NO byEARLY) < 1.

   3) MUTUALLY-EXCLUSIVE  (negRisk exhaustive sets; complementary
      or duplicate pairs)
        Pick two outcomes A,B that can NEVER both be YES.
        Lock: buy NO(A) + NO(B).
          at most one of A,B is YES => at least one NO pays =>
          payoff in {1,2} -> pays >= 1 always.
        Profit iff  ask(NO A) + ask(NO B) < 1.

   So a "chain" here is a LEG PAIR (tokenL, tokenR, why) where one
   share of each is guaranteed to redeem for >= $1. The scanner
   walks each leg's real ask book with buyCost() for a shared clip
   and reports only pairs that actually fill for net profit.

   This module only PARSES + GROUPS + emits leg pairs. It never
   mid-prices. Execution judgement lives in the scanner via
   lib/orderbook.buyCost(). Zero dependencies.

   NOTE: do NOT edit lib/orderbook.js / research-data.js / etc.
   ============================================================ */

const { parseJSON } = require('./orderbook');

/* ---------- only genuinely tradeable markets ----------
   liveEvents() returns events that may still contain CLOSED or
   non-accepting markets (e.g. resolved player props). A leg is only
   executable if the book is open AND orders are accepted. */
function isTradeable(m) {
  return m
    && m.closed === false
    && m.active === true
    && m.acceptingOrders === true
    && m.enableOrderBook === true;
}

/* Extract [yesToken, noToken] for a market (Gamma: clobTokenIds is
   ordered to match outcomes; outcomes[0]="Yes"). Returns null if not
   a clean Yes/No 2-outcome market. */
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

/* ---------------- number / threshold parsing ---------------- */
// Pull the FIRST dollar/number threshold out of a question. Handles
// "$64,000", "$2.5", "150", "1+ goals", etc. Returns a Number or null.
function parseThreshold(q) {
  const s = String(q || '');
  // $-amounts first (with commas / decimals / optional k/m/b suffix). The suffix
  // must be IMMEDIATELY attached (e.g. "$2.5k"), never a following word — so
  // "$90 by end" does NOT read the "b" of "by". We anchor the suffix with no
  // intervening space and a trailing boundary.
  let m = s.match(/\$\s*([\d][\d,]*(?:\.\d+)?)([kKmMbB])(?![a-z])/);
  if (m) return scaleNum(m[1], m[2]);
  m = s.match(/\$\s*([\d][\d,]*(?:\.\d+)?)/);
  if (m) return scaleNum(m[1], null);
  // "N+ goals/shots/..." player-prop style
  m = s.match(/\b(\d+)\s*\+/);
  if (m) return Number(m[1]);
  // degrees / bare units e.g. "27°C", "27 C"
  m = s.match(/\b(-?\d+(?:\.\d+)?)\s*°?\s*[cf]\b/i);
  if (m) return Number(m[1]);
  // bare number fallback (avoid years like 2026/2027/2028 when possible)
  const nums = [...s.matchAll(/\b(\d[\d,]*(?:\.\d+)?)\b/g)].map((x) => Number(x[1].replace(/,/g, '')));
  const nonYear = nums.filter((n) => !(n >= 1990 && n <= 2099 && Number.isInteger(n)));
  if (nonYear.length) return nonYear[0];
  return nums.length ? nums[0] : null;
}
function scaleNum(numStr, suf) {
  let n = Number(String(numStr).replace(/,/g, ''));
  if (!isFinite(n)) return null;
  if (suf) {
    const c = suf.toLowerCase();
    if (c === 'k') n *= 1e3;
    else if (c === 'm') n *= 1e6;
    else if (c === 'b') n *= 1e9;
  }
  return n;
}

/* CLASSIFY a threshold question for NESTED-THRESHOLD eligibility.

   This is the crucial correctness gate. Nested-threshold arb is ONLY valid
   when the YES outcome is a CUMULATIVE half-line over a single boundary:
       dir=+1 : YES iff value >  X  (or >= X)   "above/over/reach/hit (HIGH)/
                                                  or higher/at least/N+"
       dir=-1 : YES iff value <  X  (or <= X)   "below/under/dip to/hit (LOW)/
                                                  or below/or less"
   It is INVALID — and dangerous (false locks) — for:
     * EXACT-value buckets:  "be 27°C", "be exactly $X"   (disjoint points)
     * RANGE buckets:        "between $X and $Y"           (disjoint intervals)
   Those belong to mutually-exclusive negRisk sets, where "=27" is NOT a subset
   of "=33". Returns { dir, thr } only for genuinely cumulative questions; else
   null.

   NOTE on "X or below": phrasings like "26°C or below" ARE cumulative half-lines
   in isolation, but on Polymarket they appear as the bottom bucket of an
   EXACT-VALUE negRisk ladder (the other rungs are exact points like "27°C").
   Mixing a half-line bucket with exact-point buckets does NOT nest, so we only
   trust a group when EVERY member is cumulative of the SAME open-ended style;
   the exact-point members are rejected here, which dissolves those groups. */
function classifyThreshold(q) {
  const s = String(q || '').toLowerCase();

  // Hard reject ranges — never nest.
  if (/\bbetween\b.*\band\b/.test(s)) return null;

  const thr = parseThreshold(q);
  if (thr == null) return null;

  // Explicit (HIGH)/(LOW) tag used by commodity "hit" ladders.
  if (/\(high\)/.test(s)) return { dir: 1, thr };
  if (/\(low\)/.test(s)) return { dir: -1, thr };

  // Open-ended UPWARD half-line.
  if (/\b(above|over|greater than|higher than|more than|at least|or higher|or more|or above|\d+\s*\+)\b/.test(s)) {
    return { dir: 1, thr };
  }
  // Open-ended DOWNWARD half-line.
  if (/\b(below|under|less than|lower than|dip to|drop to|fall to|down to|or lower|or less|or below)\b/.test(s)) {
    return { dir: -1, thr };
  }
  // "reach/hit/touch X" (no HIGH/LOW tag) = cumulative "gets at least as high as X".
  if (/\b(reach|reaches|hit|hits|touch|touches|surpass|exceed|exceeds)\b/.test(s)) {
    return { dir: 1, thr };
  }

  // Anything else — e.g. "Will the highest temperature be 27°C?" / "be $X" —
  // is an EXACT-VALUE bucket. NOT cumulative. Reject.
  return null;
}

/* A normalized "subject key" for grouping threshold markets that share the
   SAME underlying scale (same asset + same resolution date/window). We key on
   the event id PLUS the direction PLUS the question text with the numeric
   threshold stripped out, so e.g. all "Will Bitcoin be above $X on June 23?"
   collapse to one group keyed by everything-except-X. */
function thresholdSubjectKey(eventId, q, dir) {
  const stripped = String(q || '')
    .toLowerCase()
    .replace(/\$\s*[\d][\d,]*(?:\.\d+)?\s*[kmb]?/g, '#')   // dollar amounts
    .replace(/\b\d+\s*\+/g, '#')                            // "N+"
    .replace(/\b\d[\d,]*(?:\.\d+)?\b/g, (m) => {
      const n = Number(m.replace(/,/g, ''));
      // keep years (date context) so different dates don't merge
      return (n >= 1990 && n <= 2099 && Number.isInteger(n)) ? m : '#';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return `${eventId}|d${dir}|${stripped}`;
}

/* ---------------- temporal (deadline) parsing ---------------- */
const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
// Parse the (latest) calendar deadline a "by/before <date>" question refers to.
// Returns a comparable epoch-day Number, or null. We take the LAST date matched
// (covers "between X and Y" -> use Y as the cumulative upper bound is wrong, so
// such phrasing is excluded by the cumulative test in the scanner).
function parseDeadline(q) {
  const s = String(q || '');
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/gi;
  let last = null, m;
  while ((m = re.exec(s))) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo == null) continue;
    const day = Number(m[2]);
    const yr = m[3] ? Number(m[3]) : null;
    last = { mo, day, yr };
  }
  if (!last) return null;
  const yr = last.yr || 2026; // events here are near-dated; year often implied
  return Date.UTC(yr, last.mo, last.day) / 86400000;
}
// Is this question CUMULATIVE ("by/before <date>") vs a disjoint window
// ("between X and Y", "on <date>")? Only cumulative deadlines nest temporally.
function isCumulativeDeadline(q) {
  const s = String(q || '').toLowerCase();
  if (/\bbetween\b/.test(s)) return false;
  return /\b(by|before|prior to|on or before|no later than)\b/.test(s);
}
function temporalSubjectKey(eventId, q) {
  const stripped = String(q || '')
    .toLowerCase()
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?/gi, '#')
    .replace(/\s+/g, ' ')
    .trim();
  return `${eventId}|${stripped}`;
}

/* ======================================================================
   GROUPING — turn the live universe into candidate LEG PAIRs.
   Each pair: { type, why, left:{token,...}, right:{token,...} } where
   holding 1 share of left.token AND 1 share of right.token pays >= $1
   in every state. left/right .token is the exact CLOB token to BUY.
   ====================================================================== */

/* 1) NESTED THRESHOLD pairs within a single event.
   CORRECTNESS GATE: only CUMULATIVE half-line questions nest. A negRisk event
   is an exhaustive set of DISJOINT buckets (exact values / ranges) by
   construction — never a cumulative threshold ladder — so we exclude negRisk
   events from nested detection entirely and let them flow to mutexPairs. We
   also require classifyThreshold() to confirm each member is a genuine
   open-ended half-line (rejecting "be 27°C", "between $X and $Y", ...). */
function nestedThresholdPairs(event) {
  if (event && event.negRisk === true) return []; // disjoint buckets, not a ladder
  const pairs = [];
  const groups = new Map(); // subjectKey -> [{m, tokens, thr, dir}]
  for (const m of event.markets || []) {
    if (!isTradeable(m)) continue;
    const tokens = yesNoTokens(m);
    if (!tokens) continue;
    const cls = classifyThreshold(m.question);
    if (!cls) continue;                 // not a cumulative half-line — skip
    const { thr, dir } = cls;
    const key = thresholdSubjectKey(event.id, m.question, dir);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ m, tokens, thr, dir });
  }
  for (const [, arr] of groups) {
    if (arr.length < 2) continue;
    // sort ascending by threshold
    arr.sort((a, b) => a.thr - b.thr);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const lo = arr[i], hi = arr[j];
        if (lo.thr === hi.thr) continue;
        // dir +1 ("above"): {>HIGH} ⊆ {>LOW}. Lock = YES(>LOW)+NO(>HIGH).
        // dir -1 ("below"): {<LOW}  ⊆ {<HIGH}. Lock = YES(<HIGH)+NO(<LOW).
        let legA, legB, why;
        if (lo.dir === 1) {
          legA = { token: lo.tokens.yes, side: 'YES', m: lo.m, thr: lo.thr };
          legB = { token: hi.tokens.no, side: 'NO', m: hi.m, thr: hi.thr };
          why = `nested>: YES(>${lo.thr}) + NO(>${hi.thr}); {>${hi.thr}}⊆{>${lo.thr}}`;
        } else {
          // below: hi.thr is the wider (more inclusive) set
          legA = { token: hi.tokens.yes, side: 'YES', m: hi.m, thr: hi.thr };
          legB = { token: lo.tokens.no, side: 'NO', m: lo.m, thr: lo.thr };
          why = `nested<: YES(<${hi.thr}) + NO(<${lo.thr}); {<${lo.thr}}⊆{<${hi.thr}}`;
        }
        pairs.push({
          type: 'nested-threshold',
          event: event.title,
          eventId: event.id,
          why,
          left: legA,
          right: legB,
        });
      }
    }
  }
  return pairs;
}

/* 2) TEMPORAL (cumulative deadline) pairs within a single event. */
function temporalPairs(event) {
  const pairs = [];
  const groups = new Map();
  for (const m of event.markets || []) {
    if (!isTradeable(m)) continue;
    if (!isCumulativeDeadline(m.question)) continue;
    const tokens = yesNoTokens(m);
    if (!tokens) continue;
    const dl = parseDeadline(m.question);
    if (dl == null) continue;
    const key = temporalSubjectKey(event.id, m.question);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ m, tokens, dl });
  }
  for (const [, arr] of groups) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.dl - b.dl);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const early = arr[i], late = arr[j];
        if (early.dl === late.dl) continue;
        // {by EARLY} ⊆ {by LATE}. Lock = YES(byLATE) + NO(byEARLY).
        pairs.push({
          type: 'temporal',
          event: event.title,
          eventId: event.id,
          why: `temporal: YES(by later) + NO(by earlier); {by earlier}⊆{by later}`,
          left: { token: late.tokens.yes, side: 'YES', m: late.m },
          right: { token: early.tokens.no, side: 'NO', m: early.m },
        });
      }
    }
  }
  return pairs;
}

/* 3) MUTUALLY-EXCLUSIVE pairs.
   negRisk exhaustive sets => any two distinct outcomes are mutually
   exclusive. Lock = NO(A) + NO(B). We enumerate distinct unordered
   tradeable pairs within a negRisk event. To keep the candidate count
   sane on huge (100+ outcome) events, we sort outcomes by how close
   each NO-ask is to cheap (i.e. YES expensive / favorite) — actually
   we just cap the pair fan-out and let the scanner's real-book test
   reject the rest. */
function mutexPairs(event, { maxOutcomes = 60 } = {}) {
  if (!event || event.negRisk !== true) return [];
  const legs = [];
  for (const m of event.markets || []) {
    if (!isTradeable(m)) continue;
    const tokens = yesNoTokens(m);
    if (!tokens) continue;
    legs.push({ m, tokens });
  }
  if (legs.length < 2) return [];
  // Cap fan-out: if too many outcomes, prefer those whose YES is non-trivial
  // (best chance NO(A)+NO(B) < 1 is when both YES are meaningfully > 0). We use
  // the cached bestAsk on the market metadata only as a CHEAP PREFILTER for
  // which pairs to fetch books for — never as the execution price.
  let pool = legs;
  if (legs.length > maxOutcomes) {
    pool = legs
      .map((l) => ({ l, ya: Number(l.m.bestAsk) }))
      .filter((x) => isFinite(x.ya))
      .sort((a, b) => b.ya - a.ya) // highest YES-ask first (favorites)
      .slice(0, maxOutcomes)
      .map((x) => x.l);
  }
  const pairs = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const A = pool[i], B = pool[j];
      // CHEAP PREFILTER: NO(A)+NO(B) ~ (1-YESa)+(1-YESb). For this to dip below 1
      // we need YESa+YESb > 1, which for an exclusive set means A,B together
      // carry > half the probability mass. Skip obviously-hopeless pairs using
      // metadata bestAsk (approx), but only to limit book fetches.
      const ya = Number(A.m.bestAsk), yb = Number(B.m.bestAsk);
      if (isFinite(ya) && isFinite(yb) && (ya + yb) < 0.9) continue; // can't cross
      pairs.push({
        type: 'mutually-exclusive',
        event: event.title,
        eventId: event.id,
        why: `mutex(negRisk): NO(${A.m.groupItemTitle || A.m.question}) + NO(${B.m.groupItemTitle || B.m.question}); both can't be YES`,
        left: { token: A.tokens.no, side: 'NO', m: A.m },
        right: { token: B.tokens.no, side: 'NO', m: B.m },
      });
    }
  }
  return pairs;
}

/* ---------------- top-level: all candidate leg-pairs ---------------- */
function buildCandidatePairs(events, opts = {}) {
  const all = [];
  const stats = { events: 0, tradeableMarkets: 0, nested: 0, temporal: 0, mutex: 0 };
  for (const e of events) {
    stats.events++;
    for (const m of e.markets || []) if (isTradeable(m)) stats.tradeableMarkets++;
    const n = nestedThresholdPairs(e);
    const t = temporalPairs(e);
    const x = mutexPairs(e, opts);
    stats.nested += n.length;
    stats.temporal += t.length;
    stats.mutex += x.length;
    all.push(...n, ...t, ...x);
  }
  return { pairs: all, stats };
}

module.exports = {
  isTradeable,
  yesNoTokens,
  parseThreshold,
  classifyThreshold,
  thresholdSubjectKey,
  parseDeadline,
  isCumulativeDeadline,
  nestedThresholdPairs,
  temporalPairs,
  mutexPairs,
  buildCandidatePairs,
};
