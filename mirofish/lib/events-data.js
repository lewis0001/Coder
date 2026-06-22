'use strict';
/* ============================================================
   EVENTS DATA — cached universe of RESOLVED, MUTUALLY-EXCLUSIVE
   (negRisk) Polymarket EVENTS with per-leg YES price histories.
   ------------------------------------------------------------
   Why this exists (separate from lib/research-data.js):
     research-data.js gathers single binary Yes/No markets to study
     per-market calibration. THAT study found a STRUCTURAL cause for
     the dominant mispricing: the mid-priced YES legs of crowded
     mutually-exclusive fields (negRisk events: "NBA Champion",
     "Election Winner", ...) collectively settle NO far more often
     than priced, because by construction EXACTLY ONE leg can win.

     To make that rigorous we need the EVENT as the unit: all legs of
     one negRisk event, time-aligned, so we can measure the OVERROUND
     = sum_i(YES_i) - 1 and backtest shorting the basket / mid-band.

   What it does:
     1) Pages RESOLVED events from Gamma (closed=true, by volume).
     2) Keeps events with negRisk=true, >=3 cleanly-settled binary
        legs, and EXACTLY ONE winning leg (final YES outcomePrice=1)
        — i.e. a genuine "exactly one of N" mutually-exclusive field.
     3) For every leg fetches+caches the YES-token price history from
        the CLOB (data/research/events/hist/<tokenId>.json), reusing
        research-data's history fetcher so caches are shared.
     4) Writes an events manifest (data/research/events/manifest.json).

   IMPORTANT empirical constraint (same as research-data.js):
     CLOB `interval=max` history is EMPTY for many resolved legs (it
     was purged / never persisted), especially OLD events. So per
     event we typically recover history for only a SUBSET of legs. We
     therefore:
       - keep an event only if a minimum number / fraction of its legs
         have usable history (so the overround is meaningful), and
       - compute the overround over the legs we DO have, recording the
         coverage so downstream analysis can weight/filter on it.
     This UNDER-states the true overround (missing legs add positive
     YES mass), so any overround we measure is a conservative floor.

   Zero dependencies — reuses lib/research-data's getJSON/cache style.
   ============================================================ */

const https = require('https');
const fs = require('fs');
const path = require('path');

const { classifyCategory } = require('./research-data');

const UA = 'mirofish/1.0';
const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';

const RESEARCH_DIR = path.join(__dirname, '..', 'data', 'research');
const EVENTS_DIR = path.join(RESEARCH_DIR, 'events');
const EVENTS_HIST_DIR = path.join(EVENTS_DIR, 'hist');
const EVENTS_CACHE = path.join(EVENTS_DIR, 'events-raw.json'); // cached candidate event metadata
const EVENTS_MANIFEST = path.join(EVENTS_DIR, 'manifest.json');

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

const isOne = (x) => Math.abs(x - 1) < 1e-6;
const isZero = (x) => Math.abs(x) < 1e-6;

/* --------------------- normalize one Gamma EVENT --------------------- */
/*
  Returns a normalized event { id, title, category, negRisk, legs:[...],
  winnerIdx, endDate, volume } or null if it is not a clean, resolved,
  mutually-exclusive (negRisk) event with >=minLegs cleanly-settled binary
  legs and EXACTLY ONE winning leg.

  Each kept leg: { id, title, yesTokenId, yesWon, volume }.
*/
function normalizeEvent(e, { minLegs = 3 } = {}) {
  if (!e || !e.negRisk) return null;
  const ms = Array.isArray(e.markets) ? e.markets : [];
  if (ms.length < minLegs) return null;

  const legs = [];
  let winners = 0;
  for (const m of ms) {
    const outcomes = parseMaybeJSON(m.outcomes, []).map((x) => String(x).trim().toLowerCase());
    const prices = parseMaybeJSON(m.outcomePrices, []).map(Number);
    const tokenIds = parseMaybeJSON(m.clobTokenIds, []);
    if (outcomes.length !== 2 || prices.length !== 2 || tokenIds.length !== 2) continue;
    const yesNo = (outcomes[0] === 'yes' && outcomes[1] === 'no') || (outcomes[0] === 'no' && outcomes[1] === 'yes');
    if (!yesNo) continue;
    // require a CLEAN 1/0 settlement so the winner is unambiguous
    const cleanSettle = (isOne(prices[0]) && isZero(prices[1])) || (isOne(prices[1]) && isZero(prices[0]));
    if (!cleanSettle) continue;
    const yesIdx = outcomes[0] === 'yes' ? 0 : 1;
    const yesWon = isOne(prices[yesIdx]);
    if (yesWon) winners++;
    legs.push({
      id: String(m.id),
      title: m.groupItemTitle || m.question || '',
      yesTokenId: String(tokenIds[yesIdx]),
      yesWon,
      volume: Number(m.volume) || Number(m.volumeNum) || Number(m.volumeClob) || 0,
    });
  }

  // Must be a genuine "exactly one of N>=minLegs" field.
  if (legs.length < minLegs) return null;
  if (winners !== 1) return null;

  const winnerIdx = legs.findIndex((l) => l.yesWon);
  const endMs = e.endDate ? new Date(e.endDate).getTime()
    : (e.closedTime ? new Date(e.closedTime).getTime() : NaN);

  return {
    id: String(e.id),
    title: e.title || e.ticker || '',
    category: classifyCategory(`${e.title || ''} ${e.ticker || ''}`),
    negRisk: true,
    nLegs: legs.length,
    winnerIdx,
    endDate: e.endDate || e.closedTime || null,
    endMs: isFinite(endMs) ? endMs : null,
    volume: Number(e.volume) || 0,
    legs,
  };
}

/* ----------------- page RESOLVED negRisk events from Gamma ----------------- */
/*
  Pages closed events ordered by volume (per the task), de-dupes by id, keeps
  only normalized mutually-exclusive resolved events. Gamma caps limit at 100
  and rejects offset beyond a few thousand; we sweep a couple of orderings to
  widen category/size coverage and de-dupe.
*/
async function fetchCandidateEvents({
  orderings = [
    { order: 'volume', ascending: false }, // task default: high-volume head
    { order: 'volume', ascending: true },  // low-volume tail (thin, more overround)
    { order: 'endDate', ascending: false }, // recent resolutions
    { order: 'endDate', ascending: true },  // old resolutions (diversity)
  ],
  maxOffset = 2000,
  minLegs = 3,
  pageDelayMs = 120,
  maxEvents = Infinity,
  onProgress = () => {},
} = {}) {
  const byId = new Map();
  for (const { order, ascending } of orderings) {
    for (let offset = 0; offset <= maxOffset; offset += 100) {
      if (byId.size >= maxEvents) break;
      const url = `${GAMMA}/events?closed=true&limit=100&offset=${offset}&order=${order}&ascending=${ascending}`;
      const batch = await getJSONRetry(url, { tries: 3 });
      if (!Array.isArray(batch)) break; // 4xx (offset cap) or persistent error -> next ordering
      if (batch.length === 0) break;
      let added = 0;
      for (const e of batch) {
        const id = String(e.id);
        if (byId.has(id)) continue;
        const norm = normalizeEvent(e, { minLegs });
        if (!norm) continue;
        byId.set(id, norm);
        added++;
      }
      onProgress({ order, ascending, offset, batch: batch.length, added, total: byId.size });
      await sleep(pageDelayMs);
    }
    if (byId.size >= maxEvents) break;
  }
  return [...byId.values()];
}

/* ------------- cached YES-token price history (per leg) ------------- */
/*
  Same endpoint/shape as research-data.fetchPriceHistory but cached under
  the events history dir so the two studies don't collide. Returns [{t,p}]
  sorted by time (possibly empty when the CLOB never persisted history).
*/
async function fetchLegHistory(tokenId, { refresh = false } = {}) {
  ensureDir(EVENTS_HIST_DIR);
  const file = path.join(EVENTS_HIST_DIR, `${tokenId}.json`);
  if (!refresh) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(cached)) return cached;
    } catch { /* not cached */ }
  }
  const d = await getJSONRetry(`${CLOB}/prices-history?market=${tokenId}&interval=max&fidelity=60`, { tries: 2, baseDelay: 300 });
  const h = (d && Array.isArray(d.history)) ? d.history : [];
  const out = h
    .map((x) => ({ t: Number(x.t), p: Number(x.p) }))
    .filter((x) => isFinite(x.t) && isFinite(x.p))
    .sort((a, b) => a.t - b.t);
  try { fs.writeFileSync(file, JSON.stringify(out)); } catch { /* best-effort */ }
  return out;
}

/* -------- fetch all leg histories for a list of events, concurrent -------- */
/*
  Walks every leg of every event with small concurrency + politeness, caching
  to disk. Returns per-event coverage stats. Mutates each leg with `.points`.
  Skip-on-fail: a leg that errors just gets 0 points.
*/
async function fetchEventHistories(events, {
  concurrency = 5,
  refresh = false,
  onProgress = () => {},
} = {}) {
  // Flatten to a work list of legs.
  const work = [];
  for (const ev of events) for (const leg of ev.legs) work.push({ ev, leg });
  let idx = 0, done = 0, withData = 0;

  async function worker() {
    while (idx < work.length) {
      const { leg } = work[idx++];
      let h = [];
      try { h = await fetchLegHistory(leg.yesTokenId, { refresh }); } catch { h = []; }
      leg.points = Array.isArray(h) ? h.length : 0;
      done++;
      if (leg.points > 0) withData++;
      if (done % 100 === 0 || done === work.length) onProgress({ done, total: work.length, withData });
      await sleep(30);
    }
  }
  const workers = [];
  for (let i = 0; i < Math.max(1, concurrency); i++) workers.push(worker());
  await Promise.all(workers);
  return { legs: work.length, withData };
}

/* -------------------------- the loader -------------------------- */
/*
  loadEventsDataset() — returns in-memory events ready for backtesting:
    [{ id, title, category, endDate, endMs, volume, nLegs, winnerTitle,
       legs:[{ id, title, yesWon, points, path:[{t,p}] }] }]
  Each leg's path is its cached YES-price history. Legs with no cached
  history get an empty path (caller decides coverage handling).

  opts.minLegsWithData : keep only events with >= this many legs that have
                         usable history (default 3).
  opts.minPoints       : a leg "has data" if its path length >= this.
*/
function loadEventsDataset({ manifestPath = EVENTS_MANIFEST, minLegsWithData = 3, minPoints = 5 } = {}) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (e) {
    throw new Error(`events dataset not built yet — run scripts/events-edge.js first (${e.message})`);
  }
  const entries = Array.isArray(manifest.events) ? manifest.events : [];
  const out = [];
  for (const ev of entries) {
    const legs = [];
    let legsWithData = 0;
    for (const lg of ev.legs) {
      let pathArr = [];
      try { pathArr = JSON.parse(fs.readFileSync(path.join(EVENTS_HIST_DIR, `${lg.yesTokenId}.json`), 'utf8')); }
      catch { pathArr = []; }
      if (!Array.isArray(pathArr)) pathArr = [];
      const path0 = pathArr.map((x) => ({ t: Number(x.t), p: Number(x.p) })).filter((x) => isFinite(x.t) && isFinite(x.p));
      if (path0.length >= minPoints) legsWithData++;
      legs.push({
        id: lg.id,
        title: lg.title,
        yesTokenId: lg.yesTokenId,
        yesWon: !!lg.yesWon,
        points: path0.length,
        path: path0,
      });
    }
    if (legsWithData < minLegsWithData) continue;
    out.push({
      id: ev.id,
      title: ev.title,
      category: ev.category,
      endDate: ev.endDate,
      endMs: ev.endMs,
      volume: ev.volume,
      nLegs: ev.nLegs,
      legsWithData,
      winnerTitle: (ev.legs[ev.winnerIdx] || {}).title || null,
      legs,
    });
  }
  return out;
}

module.exports = {
  // discovery + fetch
  fetchCandidateEvents,
  fetchLegHistory,
  fetchEventHistories,
  normalizeEvent,
  // loader
  loadEventsDataset,
  // paths
  RESEARCH_DIR,
  EVENTS_DIR,
  EVENTS_HIST_DIR,
  EVENTS_CACHE,
  EVENTS_MANIFEST,
};
