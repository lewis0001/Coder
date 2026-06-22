'use strict';
/* ============================================================
   lib/chains-data.js — LOGICAL-CHAIN data gathering for Polymarket.
   ------------------------------------------------------------
   Goal: find sets of RESOLVED binary (Yes/No) markets whose YES
   outcomes are LOGICALLY NESTED, so their prices MUST obey a
   monotonicity constraint. Any breach is a deductive arbitrage.

   Two chain kinds:

   (A) THRESHOLD LADDERS (price ladders).
       Same asset + same resolution date, multiple price targets.
       For "reach/hit/above $X" (UP direction):
           {price >= HIGH} ⊆ {price >= LOW}  (HIGH > LOW)
         => YES(>=HIGH) <= YES(>=LOW).
       For "dip to/below $X" (DOWN direction):
           {price <= LOW} ⊆ {price <= HIGH}  (LOW < HIGH)
         => YES(<=LOW) <= YES(<=HIGH).
       We keep each direction as its own monotone ladder (never mix
       "reach" with "dip"), ordered so that the constraint is a
       simple "earlier leg's YES >= later leg's YES".

   (B) TEMPORAL CHAINS.
       Same normalized SUBJECT, different DEADLINES parsed FROM THE
       QUESTION TEXT (not endDate — endDate is a settlement date and
       is often shared across sibling legs):
           {happens by EARLY} ⊆ {happens by LATE}
         => YES(by EARLY) <= YES(by LATE).

   Data sources (Gamma):
     - events?closed=true ...   (ladders usually live inside ONE event)
     - markets?closed=true ...  (broad sweep; also used as a fallback,
                                  and reuses the already-cached pool)
   Per leg we need the YES-token CLOB price history
     https://clob.polymarket.com/prices-history?market=<tok>&interval=max&fidelity=60
   cached under data/research/history/<tok>.json (shared with the
   existing research dataset; gitignored). Chain groupings + leg
   resolutions are cached under data/research/chains/.

   Plain Node, zero deps. Same getJSON/UA('mirofish/1.0') style as
   lib/research-data.js. Polite concurrency, retries, skip-on-fail.
   ============================================================ */

const https = require('https');
const fs = require('fs');
const path = require('path');

const UA = 'mirofish/1.0';
const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';

const RESEARCH_DIR = path.join(__dirname, '..', 'data', 'research');
const HIST_DIR = path.join(RESEARCH_DIR, 'history');           // shared cache
const CHAINS_DIR = path.join(RESEARCH_DIR, 'chains');          // chain artifacts
const EVENTS_CACHE = path.join(CHAINS_DIR, 'events-raw.json');  // raw event pages
const MARKETS_CACHE = path.join(CHAINS_DIR, 'markets-raw.json');// raw market pages
const CHAINS_FILE = path.join(CHAINS_DIR, 'chains.json');       // grouped chains

/* ----------------------------- HTTP ----------------------------- */
function getJSON(url, { timeout = 25000 } = {}) {
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSONRetry(url, { tries = 3, baseDelay = 400, timeout = 25000 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await getJSON(url, { timeout }); }
    catch (e) {
      lastErr = e;
      if (/HTTP 4\d\d/.test(e.message)) break; // 4xx won't fix on retry
      await sleep(baseDelay * (i + 1));
    }
  }
  return { __err: lastErr ? lastErr.message : 'unknown' };
}

function parseMaybeJSON(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); } catch { /* exists */ } }

/* ===================================================================
   NORMALIZE a raw Gamma market into a clean resolved Yes/No leg.
   Returns { id, question, yesTokenId, yesWon, endMs, ... } or null.
   We keep ONLY clean 1/0 settled binary Yes/No markets so settlement
   is unambiguous (par = 1 if YES won, 0 otherwise).
   =================================================================== */
function normalizeLeg(m) {
  const q = m.question || '';
  const outcomes = parseMaybeJSON(m.outcomes, []);
  const prices = parseMaybeJSON(m.outcomePrices, []).map(Number);
  const tokenIds = parseMaybeJSON(m.clobTokenIds, []);
  if (outcomes.length !== 2 || prices.length !== 2 || tokenIds.length !== 2) return null;

  const o0 = String(outcomes[0]).trim().toLowerCase();
  const o1 = String(outcomes[1]).trim().toLowerCase();
  const yesNo = (o0 === 'yes' && o1 === 'no') || (o0 === 'no' && o1 === 'yes');
  if (!yesNo) return null;

  const isOne = (x) => Math.abs(x - 1) < 1e-6;
  const isZero = (x) => Math.abs(x) < 1e-6;
  const clean = (isOne(prices[0]) && isZero(prices[1])) || (isOne(prices[1]) && isZero(prices[0]));
  if (!clean) return null;

  const yesIdx = o0 === 'yes' ? 0 : 1;
  const yesTokenId = String(tokenIds[yesIdx]);
  const yesWon = isOne(prices[yesIdx]);

  const endMs = m.endDate ? new Date(m.endDate).getTime()
    : (m.endDateIso ? new Date(m.endDateIso).getTime() : NaN);
  const startMs = m.startDate ? new Date(m.startDate).getTime()
    : (m.startDateIso ? new Date(m.startDateIso).getTime()
      : (m.createdAt ? new Date(m.createdAt).getTime() : NaN));

  return {
    id: String(m.id),
    question: q,
    groupItemTitle: m.groupItemTitle || null,
    yesTokenId,
    yesWon,
    endDate: m.endDate || m.endDateIso || null,
    endMs: isFinite(endMs) ? endMs : null,
    startMs: isFinite(startMs) ? startMs : null,
    volume: Number(m.volume) || Number(m.volumeNum) || Number(m.volumeClob) || 0,
  };
}

/* ===================================================================
   PARSERS — turn a question into a chain key + ordering scalar.
   =================================================================== */

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
};

const ASSET_RE = [
  [/\b(bitcoin|btc)\b/i, 'BTC'],
  [/\b(ethereum|ether|eth)\b/i, 'ETH'],
  [/\b(solana|sol)\b/i, 'SOL'],
  [/\b(xrp|ripple)\b/i, 'XRP'],
  [/\b(dogecoin|doge)\b/i, 'DOGE'],
  [/\b(cardano|ada)\b/i, 'ADA'],
  [/\b(bnb|binance coin)\b/i, 'BNB'],
  [/\b(litecoin|ltc)\b/i, 'LTC'],
  [/\b(chainlink|link)\b/i, 'LINK'],
  [/\b(avalanche|avax)\b/i, 'AVAX'],
  [/\b(polkadot|dot)\b/i, 'DOT'],
  [/\b(crude oil|wti|\(cl\))\b/i, 'OIL'],
  [/\b(gold|xau)\b/i, 'GOLD'],
  [/\b(s&p ?500|spx|s and p)\b/i, 'SPX'],
  [/\b(nasdaq|ndx)\b/i, 'NASDAQ'],
];

function detectAsset(q) {
  for (const [re, name] of ASSET_RE) if (re.test(q)) return name;
  return null;
}

// Parse the first dollar threshold in a question, honoring k/m suffixes.
function parseDollar(q) {
  const m = q.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|b)?\b/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, ''));
  const suf = (m[2] || '').toLowerCase();
  if (suf === 'k') v *= 1e3;
  else if (suf === 'm') v *= 1e6;
  else if (suf === 'b') v *= 1e9;
  // also catch bare "$100k" where the 100 has no separators but a k suffix
  return isFinite(v) ? v : null;
}

// Direction of a threshold question: 'up' (>=), 'down' (<=), or null.
const UP_RE = /\b(reach|hit|above|exceed|over|cross|surpass|top|higher than|greater than|at least|≥|>=|>)\b/i;
const DOWN_RE = /\b(dip to|dip|below|under|fall to|drop to|drop below|less than|lower than|beneath|≤|<=|<)\b/i;
function thresholdDirection(q) {
  // EXPLICIT band markers override the verb. Polymarket "hit (HIGH) $X" is an
  // UP barrier (price rises to X) while "hit (LOW) $X" is a DOWN barrier (price
  // falls to X) — both use the verb "hit", so they MUST be split by the marker
  // or non-nested markets get merged into one false ladder.
  if (/\(high\)/i.test(q)) return 'up';
  if (/\(low\)/i.test(q)) return 'down';
  // Prefer DOWN when an explicit down word is present (e.g. "dip to $X").
  if (DOWN_RE.test(q)) return 'down';
  if (UP_RE.test(q)) return 'up';
  return null;
}

/* A stable resolution-day key for ladder grouping: the calendar day of
   endDate (UTC). Sibling legs of one ladder share the same endDate. */
function dayKeyFromEnd(endMs) {
  if (!isFinite(endMs)) return '?';
  return new Date(endMs).toISOString().slice(0, 10);
}

/* ---- Temporal deadline parsing (from QUESTION TEXT) ---------------
   Returns a deadline timestamp (ms, UTC) parsed out of the question's
   "by/before <date>" phrase. We try, in order:
     - "by/before <Month> <day>, <year>"
     - "by/before <Month> <day>"     (year inferred from endDate)
     - "by/before <Month> <year>"
     - "by/before <Month>"           (year inferred; day=1)
     - "before <Month>"  treated as deadline = first of that month
   Returns null if no deadline phrase is found. We also return a short
   human label for debugging. */
function parseDeadline(q, endMs) {
  const s = q.toLowerCase();
  const refYear = isFinite(endMs) ? new Date(endMs).getUTCFullYear() : new Date().getUTCFullYear();
  const monthAlt = Object.keys(MONTHS).join('|');

  // by/before <Month> <day>, <year>
  let m = s.match(new RegExp(`\\b(by|before)\\s+(${monthAlt})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, 'i'));
  if (m) {
    const mon = MONTHS[m[2]];
    const day = parseInt(m[3], 10);
    const year = m[4] ? parseInt(m[4], 10) : refYear;
    const t = Date.UTC(year, mon - 1, day, 12, 0, 0);
    return { ms: t, label: `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`, kind: 'by' };
  }
  // by/before <Month> <year>
  m = s.match(new RegExp(`\\b(by|before)\\s+(${monthAlt})\\.?\\s+(\\d{4})`, 'i'));
  if (m) {
    const mon = MONTHS[m[2]];
    const year = parseInt(m[3], 10);
    // "by <Month> <year>" = end of that month is ambiguous; treat as 1st.
    const t = Date.UTC(year, mon - 1, 1, 12, 0, 0);
    return { ms: t, label: `${year}-${String(mon).padStart(2, '0')}-01`, kind: 'by-month' };
  }
  // by/before <Month>   (no day, no year)
  m = s.match(new RegExp(`\\b(by|before)\\s+(${monthAlt})\\b`, 'i'));
  if (m) {
    const mon = MONTHS[m[2]];
    const word = m[1];
    // "before July" means deadline is start of July; "by July" -> within July.
    // We standardize to the 1st of the month so ordering is consistent across
    // siblings (the absolute day matters only for ORDER within a chain).
    const day = word === 'before' ? 1 : 1;
    const t = Date.UTC(refYear, mon - 1, day, 12, 0, 0);
    return { ms: t, label: `${refYear}-${String(mon).padStart(2, '0')}-01`, kind: 'by-month' };
  }
  // by/before end of <year>  /  by <year>
  m = s.match(/\b(by|before)\s+(?:the\s+)?end\s+of\s+(\d{4})\b/i) || s.match(/\b(by|before)\s+(\d{4})\b/i);
  if (m) {
    const year = parseInt(m[2], 10);
    const t = Date.UTC(year, 11, 31, 12, 0, 0);
    return { ms: t, label: `${year}-12-31`, kind: 'by-year' };
  }
  return null;
}

/* Normalize a temporal SUBJECT: remove the deadline phrase but KEEP
   magnitudes (e.g. "25+ bps", "50 bps") because those make legs distinct
   events, NOT siblings. We strip leading "will the/will", trailing
   punctuation, and the by/before-date tail. */
function temporalSubject(q) {
  let s = ' ' + q.toLowerCase() + ' ';
  const monthAlt = Object.keys(MONTHS).join('|');
  // remove the by/before ... date tail (greedy to end of the date token)
  s = s.replace(new RegExp(`\\b(by|before)\\s+(the\\s+)?(end\\s+of\\s+)?(${monthAlt})\\.?(\\s+\\d{1,2}(st|nd|rd|th)?)?(,?\\s*\\d{4})?`, 'gi'), ' ');
  s = s.replace(/\b(by|before)\s+(the\s+)?end\s+of\s+\d{4}\b/gi, ' ');
  s = s.replace(/\b(by|before)\s+\d{4}\b/gi, ' ');
  // drop leading "will the / will / does / is"
  s = s.replace(/\bwill the\b/g, ' ').replace(/\bwill\b/g, ' ').replace(/\bdoes\b/g, ' ').replace(/\bthe fed\b/g, ' fed ');
  // collapse punctuation / whitespace
  s = s.replace(/[?,.()]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/* ===================================================================
   GATHER raw markets/events from Gamma (cached on disk).
   =================================================================== */

// Page closed events (each event carries a markets[] array of legs).
async function fetchEventPages({
  orderings = [
    { order: 'volume', ascending: false },
  ],
  maxOffset = 3000,
  pageDelayMs = 120,
  onProgress = () => {},
} = {}) {
  const byId = new Map();
  for (const { order, ascending } of orderings) {
    for (let offset = 0; offset <= maxOffset; offset += 100) {
      const url = `${GAMMA}/events?closed=true&limit=100&offset=${offset}&order=${order}&ascending=${ascending}`;
      const batch = await getJSONRetry(url, { tries: 3 });
      if (!Array.isArray(batch)) break;        // 4xx (offset cap) or error
      if (batch.length === 0) break;
      let added = 0;
      for (const e of batch) {
        const id = String(e.id);
        if (byId.has(id)) continue;
        byId.set(id, e);
        added++;
      }
      onProgress({ order, ascending, offset, batch: batch.length, added, total: byId.size });
      await sleep(pageDelayMs);
    }
  }
  return [...byId.values()];
}

// Page closed markets directly (broad sweep across orderings; de-dupe).
async function fetchMarketPages({
  orderings = [
    { order: 'volumeNum', ascending: false },
    { order: 'endDate', ascending: false },
    { order: 'endDate', ascending: true },
  ],
  maxOffset = 2000,
  pageDelayMs = 120,
  onProgress = () => {},
} = {}) {
  const byId = new Map();
  for (const { order, ascending } of orderings) {
    for (let offset = 0; offset <= maxOffset; offset += 100) {
      const url = `${GAMMA}/markets?closed=true&limit=100&offset=${offset}&order=${order}&ascending=${ascending}`;
      const batch = await getJSONRetry(url, { tries: 3 });
      if (!Array.isArray(batch)) break;
      if (batch.length === 0) break;
      let added = 0;
      for (const m of batch) {
        const id = String(m.id);
        if (byId.has(id)) continue;
        byId.set(id, m);
        added++;
      }
      onProgress({ order, ascending, offset, batch: batch.length, added, total: byId.size });
      await sleep(pageDelayMs);
    }
  }
  return [...byId.values()];
}

/* Targeted keyword event search — fetch events likely to be price
   ladders or temporal chains, so we densify the relevant universe
   instead of relying on the volume head alone. */
async function fetchKeywordEvents(keywords, { limit = 60, pageDelayMs = 120, onProgress = () => {} } = {}) {
  const byId = new Map();
  for (const kw of keywords) {
    const url = `${GAMMA}/events?closed=true&limit=${limit}&order=volume&ascending=false&search=${encodeURIComponent(kw)}`;
    const batch = await getJSONRetry(url, { tries: 3 });
    if (Array.isArray(batch)) {
      let added = 0;
      for (const e of batch) { const id = String(e.id); if (!byId.has(id)) { byId.set(id, e); added++; } }
      onProgress({ kw, batch: batch.length, added, total: byId.size });
    }
    await sleep(pageDelayMs);
  }
  return [...byId.values()];
}

/* ----------------- cached YES-token price history ----------------- */
async function fetchPriceHistory(tokenId, { refresh = false } = {}) {
  ensureDir(HIST_DIR);
  const file = path.join(HIST_DIR, `${tokenId}.json`);
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(cached)) return cached;
    } catch { /* not cached */ }
  }
  const variants = ['interval=max&fidelity=60', 'interval=max&fidelity=10'];
  let best = [];
  for (let vi = 0; vi < variants.length; vi++) {
    const d = await getJSONRetry(`${CLOB}/prices-history?market=${tokenId}&${variants[vi]}`, { tries: 2, baseDelay: 300 });
    const h = (d && Array.isArray(d.history)) ? d.history : [];
    if (h.length > best.length) best = h;
    if (vi === 0 && best.length === 0) break; // empty primary => the rest are empty too
    if (best.length >= 50) break;
  }
  const out = best.map((x) => ({ t: Number(x.t), p: Number(x.p) }))
    .filter((x) => isFinite(x.t) && isFinite(x.p))
    .sort((a, b) => a.t - b.t);
  try { fs.writeFileSync(file, JSON.stringify(out)); } catch { /* best-effort */ }
  return out;
}

function loadHistory(tokenId) {
  try {
    const h = JSON.parse(fs.readFileSync(path.join(HIST_DIR, `${tokenId}.json`), 'utf8'));
    return Array.isArray(h) ? h : null;
  } catch { return null; }
}

/* Fetch histories for a list of leg tokens, small concurrency. */
async function fetchHistoriesFor(tokens, { concurrency = 4, refresh = false, onProgress = () => {} } = {}) {
  let idx = 0, done = 0, kept = 0, empty = 0;
  const uniq = [...new Set(tokens)];
  async function worker() {
    while (idx < uniq.length) {
      const tok = uniq[idx++];
      let h = null;
      try { h = await fetchPriceHistory(tok, { refresh }); } catch { /* skip */ }
      done++;
      if (Array.isArray(h) && h.length > 0) kept++; else empty++;
      if (done % 25 === 0 || done === uniq.length) onProgress({ done, total: uniq.length, kept, empty });
      await sleep(35);
    }
  }
  const ws = [];
  for (let i = 0; i < Math.max(1, concurrency); i++) ws.push(worker());
  await Promise.all(ws);
  return { total: uniq.length, kept, empty };
}

/* ===================================================================
   BUILD CHAINS from a flat list of normalized legs.
   Each chain = { kind, key, legs:[{...leg, scalar}] } where legs are
   ordered so the constraint is monotone-nonincreasing in YES across
   the ordering (i.e. legs[i].YES >= legs[j].YES for i<j must hold).

   Threshold-up:   order by ASC threshold => YES nonincreasing.
   Threshold-down: order by DESC threshold => YES nonincreasing.
   Temporal:       order by ASC deadline => YES nondecreasing,
                   so we store with the constraint "earlier <= later"
                   and flag direction.
   To keep the backtest uniform we normalize every chain so that
   legs are in "implication order": legs[i] IMPLIES legs[j] for i<j,
   meaning P(legs[i]) <= P(legs[j])  (subset => smaller-or-equal prob).
   Constraint: for i<j, YES(legs[i]) <= YES(legs[j]). Violation when
   YES(legs[i]) > YES(legs[j]).
   =================================================================== */
function buildChains(legs, { minLegs = 2 } = {}) {
  const chains = [];

  /* ---- (A) threshold ladders ---- */
  // group by asset + endDay + direction
  const thrGroups = new Map();
  for (const lg of legs) {
    const asset = detectAsset(lg.question);
    if (!asset) continue;
    const dollar = parseDollar(lg.question);
    if (dollar == null) continue;
    const dir = thresholdDirection(lg.question);
    if (!dir) continue;
    if (lg.endMs == null) continue;
    const key = `${asset}|${dayKeyFromEnd(lg.endMs)}|${dir}`;
    if (!thrGroups.has(key)) thrGroups.set(key, []);
    thrGroups.get(key).push({ ...lg, scalar: dollar, asset, dir });
  }
  for (const [key, arr] of thrGroups) {
    // de-dup identical (token) and identical-scalar legs (keep one per scalar)
    const byScalar = new Map();
    for (const lg of arr) {
      const prev = byScalar.get(lg.scalar);
      if (!prev || lg.volume > prev.volume) byScalar.set(lg.scalar, lg);
    }
    const dir = arr[0].dir;
    let legsArr = [...byScalar.values()];
    if (legsArr.length < minLegs) continue;
    /* Put into IMPLICATION order (legs[i] subset of legs[j], so
       P[i] <= P[j]).
       UP ("reach >= X"): higher X is the subset => sort DESC by scalar.
       DOWN ("dip <= X"): lower X is the subset  => sort ASC by scalar. */
    if (dir === 'up') legsArr.sort((a, b) => b.scalar - a.scalar);
    else legsArr.sort((a, b) => a.scalar - b.scalar);
    // Stamp the implication rank so ordering survives any later subsetting.
    legsArr.forEach((l, i) => { l.impliesRank = i; });
    chains.push({ kind: 'threshold', dir, key, asset: arr[0].asset, legs: legsArr });
  }

  /* ---- (B) temporal chains ---- */
  const tmpGroups = new Map();
  for (const lg of legs) {
    const dl = parseDeadline(lg.question, lg.endMs);
    if (!dl) continue;
    const subj = temporalSubject(lg.question);
    if (subj.length < 6) continue;
    // skip threshold-style questions (they belong to ladders, not temporal)
    if (detectAsset(lg.question) && parseDollar(lg.question) != null && thresholdDirection(lg.question)) {
      // a market like "BTC reach $X by <date>" — these CAN be temporal too,
      // but only if multiple deadlines exist for the SAME asset+threshold.
      // We include them under a subject that embeds the threshold.
    }
    if (!tmpGroups.has(subj)) tmpGroups.set(subj, []);
    tmpGroups.get(subj).push({ ...lg, scalar: dl.ms, deadlineLabel: dl.label });
  }
  for (const [subj, arr] of tmpGroups) {
    // keep one leg per distinct deadline (highest volume)
    const byDl = new Map();
    for (const lg of arr) {
      const prev = byDl.get(lg.scalar);
      if (!prev || lg.volume > prev.volume) byDl.set(lg.scalar, lg);
    }
    let legsArr = [...byDl.values()];
    if (legsArr.length < minLegs) continue;
    // IMPLICATION order: "by EARLY" subset of "by LATE" => sort ASC by deadline
    // so legs[i].deadline < legs[j].deadline and P[i] <= P[j].
    legsArr.sort((a, b) => a.scalar - b.scalar);
    // Stamp the implication rank so ordering survives any later subsetting.
    legsArr.forEach((l, i) => { l.impliesRank = i; });
    chains.push({ kind: 'temporal', key: subj, legs: legsArr });
  }

  return chains;
}

/* Attach cached histories to each chain leg; drop legs without usable
   history; drop chains left with < minLegs legs or no time overlap. */
function attachHistories(chains, { minPoints = 10, minLegs = 2 } = {}) {
  const out = [];
  for (const ch of chains) {
    const legs = [];
    for (const lg of ch.legs) {
      const h = loadHistory(lg.yesTokenId);
      if (!Array.isArray(h) || h.length < minPoints) continue;
      legs.push({ ...lg, path: h, points: h.length });
    }
    if (legs.length < minLegs) continue;
    // require a shared time window across at least 2 legs
    const lo = Math.max(...legs.map((l) => l.path[0].t));
    const hi = Math.min(...legs.map((l) => l.path[l.path.length - 1].t));
    let kept;
    if (!(hi > lo)) {
      // try the largest mutually-overlapping subset of legs
      const sub = largestOverlap(legs, minLegs);
      if (sub.length < minLegs) continue;
      kept = sub;
    } else {
      kept = legs;
    }
    // CRUCIAL: always restore IMPLICATION order (by impliesRank) — the overlap
    // sweep above reorders by path-start, which must NOT define leg ordering.
    // After dropping legs, re-densify ranks to 0..k-1 preserving relative order.
    kept = kept.slice().sort((a, b) => (a.impliesRank ?? 0) - (b.impliesRank ?? 0));
    kept.forEach((l, i) => { l.impliesRank = i; });
    out.push({ ...ch, legs: kept });
  }
  return out;
}

// Greedy: keep legs whose [first,last] windows mutually overlap. Returns a
// subset (in arbitrary order); the caller re-sorts by impliesRank.
function largestOverlap(legs, minLegs) {
  // sort by start; sweep, keeping a running intersection
  const sorted = legs.slice().sort((a, b) => a.path[0].t - b.path[0].t);
  let best = [];
  for (let i = 0; i < sorted.length; i++) {
    let lo = sorted[i].path[0].t, hi = sorted[i].path[sorted[i].path.length - 1].t;
    const set = [sorted[i]];
    for (let j = 0; j < sorted.length; j++) {
      if (j === i) continue;
      const a = sorted[j].path[0].t, b = sorted[j].path[sorted[j].path.length - 1].t;
      const nlo = Math.max(lo, a), nhi = Math.min(hi, b);
      if (nhi > nlo) { lo = nlo; hi = nhi; set.push(sorted[j]); }
    }
    if (set.length > best.length) best = set;
  }
  return best.length >= minLegs ? best : [];
}

module.exports = {
  // http / util
  getJSON, getJSONRetry, sleep, parseMaybeJSON, ensureDir,
  // gather
  fetchEventPages, fetchMarketPages, fetchKeywordEvents,
  fetchPriceHistory, fetchHistoriesFor, loadHistory,
  // normalize + parse
  normalizeLeg, detectAsset, parseDollar, thresholdDirection,
  parseDeadline, temporalSubject, dayKeyFromEnd,
  // build
  buildChains, attachHistories, largestOverlap,
  // paths
  RESEARCH_DIR, HIST_DIR, CHAINS_DIR, EVENTS_CACHE, MARKETS_CACHE, CHAINS_FILE,
};
