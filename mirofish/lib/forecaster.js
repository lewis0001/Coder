'use strict';
/* ============================================================
   lib/forecaster.js — AI-forecaster edge harness.
   ------------------------------------------------------------
   The idea (user's): when a market is live, have an AI agent do
   extensive research, estimate the TRUE probability, and trade
   when it is confident AND the market disagrees enough to beat
   costs. The catch this harness enforces:

     1) CALIBRATION must be proven, not assumed. LLMs are
        overconfident; an AI "85%" is only tradeable once we've
        shown its 85%-bucket actually resolves ~85% (forward-scored).
     2) NO BACKTEST on resolved markets — training-data leakage
        makes past events fake-easy. Predictions are FORWARD-logged
        and scored only at real resolution.
     3) Edge must beat COST. Crossing the spread + Polymarket's
        category taker fee (~feeRate*min(p,1-p)). So the AI-vs-price
        gap must exceed that, which is why fee-free markets and big
        gaps are required.
     4) Only trade where research can plausibly help and the crowd
        is thin — not liquid headline markets (already efficient,
        as the Hormuz example showed: AI ≈ market → no trade).

   This module: select candidates, gate trade signals, and manage
   the forward-prediction log + calibration scoring. The actual
   forecasting is done by an AI agent (see scripts/forecast.js).
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { liveMarkets, getBook, buyCost, parseJSON } = require('./orderbook');

const LOG_PATH = path.join(__dirname, '..', 'data', 'research', 'forecasts.jsonl');

const FEE_BY_CAT = { sports: 0.03, politics: 0.04, 'us-current-affairs': 0.04, finance: 0.04, tech: 0.04, mentions: 0.04, economy: 0.05, culture: 0.05, weather: 0.05, crypto: 0.07 };

function feeRateFor(market) {
  if (market.feesEnabled === false) return 0;
  // Gamma exposes feeSchedule.rate on fee-paying markets; else fall back by category
  const r = market.feeSchedule && Number(market.feeSchedule.rate);
  if (r > 0) return r;
  return FEE_BY_CAT[(market.category || '').toLowerCase()] || 0.05;
}

// Markets where independent RESEARCH can plausibly beat the crowd.
// Exclude pure-chance / hyper-efficient (intraday up-down, in-play sports),
// keep scheduled/news/structural events with a knowable horizon.
function isResearchable(q) {
  const s = (q || '').toLowerCase();
  if (/up or down|hit \$|above \$|below \$|reach \$/.test(s)) return false; // crypto price noise
  if (/\b\d+:\d+\s?(am|pm)\b/.test(s)) return false;                         // intraday windows
  return true;
}

/* Select live candidates an AI forecaster should look at.
   Returns each with the executable price + the GAP it must clear to trade. */
async function selectCandidates({ minVol = 10000, minDays = 2, maxDays = 60, clipUsd = 200, max = 40 } = {}) {
  const now = Date.now();
  const ms = await liveMarkets({ limit: 600 });
  const out = [];
  for (const m of ms) {
    if (!isResearchable(m.question)) continue;
    const end = m.endDate ? new Date(m.endDate).getTime() : null;
    if (!end) continue;
    const days = (end - now) / 86400000;
    if (days < minDays || days > maxDays) continue;
    if (Number(m.volume24hr || 0) < minVol) continue;
    const toks = parseJSON(m.clobTokenIds, []);
    if (!Array.isArray(toks) || toks.length < 2) continue;
    const bid = Number(m.bestBid), ask = Number(m.bestAsk);
    const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : null;
    if (mid == null || mid < 0.08 || mid > 0.92) continue;  // genuinely uncertain
    const fee = feeRateFor(m);
    const spread = ask > 0 && bid > 0 ? ask - bid : 0.02;
    // gap the AI must clear: half-spread (cross) + taker fee on the side + margin
    const costToTrade = spread / 2 + fee * Math.min(mid, 1 - mid) + 0.02;
    out.push({
      id: String(m.id), question: m.question, category: m.category,
      yesToken: toks[0], noToken: toks[1],
      mid, bid, ask, feeRate: fee, feeFree: fee === 0,
      endDate: m.endDate, days: Math.round(days),
      volume24hr: Number(m.volume24hr || 0),
      requiredGap: round3(costToTrade),
      description: m.description || '',
    });
  }
  out.sort((a, b) => (b.feeFree - a.feeFree) || (a.requiredGap - b.requiredGap));
  return out.slice(0, max);
}

/* Trade gate. A signal fires ONLY when the AI is confident, well past the
   coin-flip, AND the gap to the executable price beats the cost. Direction:
   buy YES if aiProb >> price; buy NO if aiProb << price. */
function tradeSignal({ aiProb, aiConfidence, market }) {
  const execYesAsk = market.ask;          // buy YES near ask
  const execNoAsk = 1 - market.bid;       // buy NO ≈ 1 - bestBid
  const need = market.requiredGap;
  const res = { action: 'no-trade', reason: '', gap: 0 };
  if (aiConfidence < 0.85) { res.reason = `AI not confident enough (${(aiConfidence * 100).toFixed(0)}% < 85%)`; return res; }
  if (aiProb >= 0.85 && aiProb - execYesAsk > need) {
    return { action: 'BUY_YES', reason: `AI ${(aiProb * 100).toFixed(0)}% vs YES ask ${(execYesAsk * 100).toFixed(0)}¢`, gap: round3(aiProb - execYesAsk), need };
  }
  if (aiProb <= 0.15 && (1 - aiProb) - execNoAsk > need) {
    return { action: 'BUY_NO', reason: `AI ${(aiProb * 100).toFixed(0)}% vs NO ask ${(execNoAsk * 100).toFixed(0)}¢`, gap: round3((1 - aiProb) - execNoAsk), need };
  }
  res.reason = `gap below cost (AI ${(aiProb * 100).toFixed(0)}% vs mid ${(market.mid * 100).toFixed(0)}¢, need ${(need * 100).toFixed(1)}¢)`;
  return res;
}

/* Append a forward prediction (one JSON object per line) for later scoring. */
function logForecast(rec) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  const row = { ts: new Date().toISOString(), resolved: null, outcomeYes: null, ...rec };
  fs.appendFileSync(LOG_PATH, JSON.stringify(row) + '\n');
  return row;
}

function loadForecasts() {
  try { return fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
  catch { return []; }
}

/* Calibration + PnL scoring over RESOLVED forecasts. Honest verdict on
   whether the AI is calibrated and whether its trades made money net of fee. */
function score() {
  const fc = loadForecasts().filter((f) => f.resolved && f.outcomeYes != null);
  if (!fc.length) return { n: 0, note: 'no resolved forecasts yet — forward test in progress' };
  // calibration by decile
  const buckets = Array.from({ length: 10 }, () => ({ n: 0, sum: 0, hits: 0 }));
  let brier = 0;
  for (const f of fc) {
    const b = Math.min(9, Math.floor(f.aiProb * 10));
    buckets[b].n++; buckets[b].sum += f.aiProb; buckets[b].hits += f.outcomeYes ? 1 : 0;
    brier += (f.aiProb - (f.outcomeYes ? 1 : 0)) ** 2;
  }
  // realized PnL on the trades the gate would have taken
  let pnl = 0, trades = 0, wins = 0;
  for (const f of fc) {
    if (!f.signal || f.signal.action === 'no-trade') continue;
    trades++;
    const buyYes = f.signal.action === 'BUY_YES';
    const entry = buyYes ? f.market.ask : 1 - f.market.bid;
    const fee = f.market.feeRate * Math.min(entry, 1 - entry);
    const win = buyYes ? f.outcomeYes : !f.outcomeYes;
    const ret = (win ? 1 : 0) - entry - fee;   // per $1 stake
    pnl += ret; if (win) wins++;
  }
  return {
    n: fc.length, brier: round3(brier / fc.length),
    calibration: buckets.map((b, i) => ({ bucket: `${i * 10}-${i * 10 + 10}%`, n: b.n, predicted: b.n ? round3(b.sum / b.n) : null, actual: b.n ? round3(b.hits / b.n) : null })).filter((x) => x.n),
    trades, winRate: trades ? round3(wins / trades) : null, netPnlPerStake: round3(pnl), expPerTrade: trades ? round3(pnl / trades) : null,
  };
}

function round3(x) { return Math.round(x * 1000) / 1000; }

module.exports = { selectCandidates, tradeSignal, logForecast, loadForecasts, score, feeRateFor, isResearchable, LOG_PATH };
