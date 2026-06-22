'use strict';
/* ============================================================
   lib/anchor-crypto.js — EXTERNAL FAIR-VALUE ANCHOR for crypto.
   ------------------------------------------------------------
   Polymarket lists crypto markets ("BTC above $X on <date>?",
   "ETH above $Y?", "<coin> Up or Down <window>"). Their FAIR
   probability is computable from the live underlying:

       spot/forward + implied volatility  =>  risk-neutral P(S_T > K)

   under a lognormal (Black-Scholes) model with ~zero drift for
   short horizons:
       d2 = ( ln(F/K) - 0.5*sigma^2*tau ) / ( sigma*sqrt(tau) )
       P(S_T > K) = N(d2)

   This file ONLY computes the anchor. It does NOT touch Polymarket
   books — the scanner (scripts/scan-anchor.js) pulls real books from
   lib/orderbook.js and compares executable price vs this anchor.

   DATA (public, no auth):
     - Spot:   Coinbase  /v2/prices/<SYM>-USD/spot
     - Forward + IV: Deribit options. We take the live index, the
       option chain (get_instruments), and per-strike mark_iv from
       tickers, then interpolate ATM IV for the market's expiry.
     - Fallback: if Deribit IV is unavailable for an asset, a realized
       vol estimate from recent Coinbase spot candles. We PREFER
       Deribit IV (the market's forward vol); the fallback is flagged.

   MODEL ASSUMPTIONS (reported honestly by the scanner):
     - Lognormal terminal price, constant sigma, zero drift.
     - sigma from Deribit ATM IV (BTC/ETH listed; other coins fall
       back to realized vol or a mapped proxy).
     - Deribit settles on its own index; Polymarket crypto markets
       settle on a Binance 1-min candle close. Tiny basis ignored.

   Zero dependencies. Plain Node.
   ============================================================ */

const https = require('https');

const UA = 'mirofish-trader/1.0';
const COINBASE = 'https://api.coinbase.com';
const DERIBIT = 'https://www.deribit.com/api/v2';

const YEAR_MS = 365 * 24 * 3600 * 1000;

/* ---- tiny JSON GET (mirrors lib/orderbook.js getJSON) ---- */
function getJSON(url, { timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} ${url}`)); }
      let buf = ''; res.on('data', (c) => (buf += c));
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('timeout ' + url)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   Math: standard normal CDF via erf approximation (Abramowitz
   & Stegun 7.1.26, max abs error ~1.5e-7). Plain Node, no deps.
   ============================================================ */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}
function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }

/* Risk-neutral P(S_T > K) under lognormal with forward F, vol sigma
   (annualized), horizon tau (years). Drift ~0 => use forward as the
   no-drift center. Handles degenerate tau/sigma at the boundaries. */
function probAbove(F, K, sigma, tau) {
  if (!(F > 0) || !(K > 0)) return null;
  if (!(tau > 0) || !(sigma > 0)) {
    // No time / no vol left: deterministic outcome at current level.
    return F > K ? 1 : (F < K ? 0 : 0.5);
  }
  const vol = sigma * Math.sqrt(tau);
  const d2 = (Math.log(F / K) - 0.5 * sigma * sigma * tau) / vol;
  return normCdf(d2);
}

/* ============================================================
   Spot (Coinbase) — cached per asset for the run.
   ============================================================ */
const SYMBOLS = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', XRP: 'XRP-USD', DOGE: 'DOGE-USD' };

async function getSpot(asset) {
  const sym = SYMBOLS[asset];
  if (!sym) throw new Error('no coinbase symbol for ' + asset);
  const j = await getJSON(`${COINBASE}/v2/prices/${sym}/spot`);
  const amt = +(j && j.data && j.data.amount);
  if (!(amt > 0)) throw new Error('bad spot for ' + asset);
  return amt;
}

/* ============================================================
   Deribit implied-vol surface (BTC, ETH).
   We pull the option chain once, the index once, and lazily fetch
   per-instrument tickers (mark_iv) only for the strikes we need to
   bracket the target (ATM-ish), so we stay polite.
   ============================================================ */
const DERIBIT_CCY = { BTC: 'BTC', ETH: 'ETH' };

async function loadDeribitChain(asset) {
  const ccy = DERIBIT_CCY[asset];
  if (!ccy) return null;
  const idxName = `${ccy.toLowerCase()}_usd`;
  let index, instr;
  try {
    index = (await getJSON(`${DERIBIT}/public/get_index_price?index_name=${idxName}`)).result.index_price;
    instr = (await getJSON(`${DERIBIT}/public/get_instruments?currency=${ccy}&kind=option&expired=false`)).result;
  } catch (e) { return null; }
  if (!(index > 0) || !Array.isArray(instr) || !instr.length) return null;
  // group expiries; keep calls only (IV is per-strike, same for C/P at a strike)
  const expiries = [...new Set(instr.map((i) => i.expiration_timestamp))].sort((a, b) => a - b);
  return { asset, ccy, index, instr, expiries, ivCache: new Map() };
}

async function tickerIV(chain, instrumentName) {
  if (chain.ivCache.has(instrumentName)) return chain.ivCache.get(instrumentName);
  let iv = null, underlying = null;
  try {
    const t = (await getJSON(`${DERIBIT}/public/ticker?instrument_name=${instrumentName}`)).result;
    if (t && t.mark_iv > 0) iv = t.mark_iv / 100;     // percent -> fraction
    if (t && t.underlying_price > 0) underlying = t.underlying_price;
  } catch (e) { /* leave null */ }
  const v = { iv, underlying };
  chain.ivCache.set(instrumentName, v);
  await sleep(120); // polite pacing between Deribit ticker calls
  return v;
}

/* Pick the two listed expiries that bracket targetMs (or the single
   nearest if outside the listed range), then for each, the strike
   nearest the index, and read mark_iv. Linearly interpolate IV in
   sqrt-time (variance is ~linear in time) to the target. Returns
   { sigma, forward, expiryUsedMs, source, detail } or null. */
async function deribitATMIV(chain, targetMs) {
  if (!chain) return null;
  const exps = chain.expiries;
  if (!exps.length) return null;

  // bracketing expiries
  let lo = null, hi = null;
  for (const e of exps) {
    if (e <= targetMs) lo = e;
    if (e >= targetMs && hi == null) hi = e;
  }
  if (lo == null && hi == null) return null;
  const pickExps = [];
  if (lo != null) pickExps.push(lo);
  if (hi != null && hi !== lo) pickExps.push(hi);
  if (!pickExps.length) return null;

  const now = Date.now();
  const points = []; // { tauYears, iv, forward }
  for (const e of pickExps) {
    const atE = chain.instr.filter((i) => i.expiration_timestamp === e && i.option_type === 'call');
    if (!atE.length) continue;
    atE.sort((a, b) => Math.abs(a.strike - chain.index) - Math.abs(b.strike - chain.index));
    // try up to the 2 nearest strikes in case the closest has no quote
    let got = null;
    for (const cand of atE.slice(0, 2)) {
      const v = await tickerIV(chain, cand.instrument_name);
      if (v.iv > 0) { got = { iv: v.iv, forward: v.underlying || chain.index, strike: cand.strike }; break; }
    }
    if (!got) continue;
    const tauYears = Math.max((e - now) / YEAR_MS, 1e-9);
    points.push({ tauYears, iv: got.iv, forward: got.forward, expiryMs: e, strike: got.strike });
  }
  if (!points.length) return null;

  const targetTau = Math.max((targetMs - now) / YEAR_MS, 1e-9);
  let sigma, forward, expiryUsedMs, detail;
  if (points.length === 1) {
    sigma = points[0].iv; forward = points[0].forward; expiryUsedMs = points[0].expiryMs;
    detail = `single-expiry IV (${(points[0].iv * 100).toFixed(1)}% @ strike ${points[0].strike})`;
  } else {
    // interpolate total variance (sigma^2 * tau) linearly in tau, then back out sigma at targetTau
    const [a, b] = points.sort((x, y) => x.tauYears - y.tauYears);
    const vA = a.iv * a.iv * a.tauYears, vB = b.iv * b.iv * b.tauYears;
    let w = (targetTau - a.tauYears) / (b.tauYears - a.tauYears);
    if (!isFinite(w)) w = 0;
    w = Math.max(0, Math.min(1, w)); // clamp (don't extrapolate wildly)
    const vT = vA + w * (vB - vA);
    sigma = Math.sqrt(Math.max(vT, 1e-12) / targetTau);
    forward = a.forward; // near-leg forward is fine for short horizons
    expiryUsedMs = w < 0.5 ? a.expiryMs : b.expiryMs;
    detail = `interp ${(a.iv * 100).toFixed(1)}%→${(b.iv * 100).toFixed(1)}% in var-time`;
  }
  return { sigma, forward, expiryUsedMs, source: 'deribit-iv', detail };
}

/* ============================================================
   Realized-vol fallback (Coinbase candles). Used only when Deribit
   IV is unavailable for the asset (e.g. SOL/XRP/DOGE). Annualized
   close-to-close vol from recent hourly candles.
   ============================================================ */
async function realizedVol(asset) {
  const sym = SYMBOLS[asset];
  if (!sym) return null;
  // Coinbase Exchange candles (granularity 3600 = 1h), last ~14 days
  const end = new Date();
  const start = new Date(end.getTime() - 14 * 24 * 3600 * 1000);
  const url = `https://api.exchange.coinbase.com/products/${sym}/candles?granularity=3600&start=${start.toISOString()}&end=${end.toISOString()}`;
  let rows;
  try { rows = await getJSON(url); } catch (e) { return null; }
  if (!Array.isArray(rows) || rows.length < 10) return null;
  // candle = [time, low, high, open, close, volume]; sort ascending by time
  rows.sort((a, b) => a[0] - b[0]);
  const closes = rows.map((r) => r[4]).filter((x) => x > 0);
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  if (rets.length < 8) return null;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const varr = rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (rets.length - 1);
  const hourlyVol = Math.sqrt(varr);
  const sigma = hourlyVol * Math.sqrt(24 * 365); // annualize from hourly
  return { sigma, source: 'realized-vol-14d-hourly' };
}

/* ============================================================
   Public: fair P(S_T > K) for an asset/strike/expiry.
   Returns a rich object (or null if no anchor possible):
     { fairP, asset, spot, forward, sigma, tau, source, detail }
   `chains` is a per-run cache map { BTC: chain, ETH: chain } so the
   scanner builds it once. expiryMs = market resolution time (ms).
   ============================================================ */
async function fairProbAbove({ asset, strike, expiryMs, chains, spotCache, rvCache }) {
  const now = Date.now();
  const tau = Math.max((expiryMs - now) / YEAR_MS, 0);

  // spot (cached)
  let spot = spotCache && spotCache.get(asset);
  if (spot == null) {
    try { spot = await getSpot(asset); } catch (e) { spot = null; }
    if (spotCache) spotCache.set(asset, spot);
  }
  if (!(spot > 0)) return null;

  // vol + forward: prefer Deribit IV, else realized vol
  let sigma = null, forward = spot, source = null, detail = '';
  const chain = chains && chains[asset];
  if (chain) {
    const iv = await deribitATMIV(chain, expiryMs);
    if (iv && iv.sigma > 0) { sigma = iv.sigma; forward = iv.forward || spot; source = iv.source; detail = iv.detail; }
  }
  if (sigma == null) {
    let rv = rvCache && rvCache.get(asset);
    if (rv === undefined || rv == null) {
      rv = await realizedVol(asset);
      if (rvCache) rvCache.set(asset, rv);
    }
    if (rv && rv.sigma > 0) { sigma = rv.sigma; source = rv.source; detail = 'realized-vol fallback'; }
  }
  if (sigma == null) return null;

  const fairP = probAbove(forward, strike, sigma, tau);
  if (fairP == null) return null;
  return { fairP, asset, spot, forward, sigma, tau, source, detail, expiryMs };
}

/* Convenience: build the per-run Deribit chain cache for the assets
   we actually need (only BTC/ETH have a Deribit surface). */
async function buildChains(assets) {
  const chains = {};
  for (const a of assets) {
    if (!DERIBIT_CCY[a]) continue;
    chains[a] = await loadDeribitChain(a);
  }
  return chains;
}

module.exports = {
  getJSON, getSpot, erf, normCdf, probAbove,
  loadDeribitChain, deribitATMIV, realizedVol,
  fairProbAbove, buildChains,
  SYMBOLS, DERIBIT_CCY, YEAR_MS,
};
