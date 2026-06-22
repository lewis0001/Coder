'use strict';
/* ============================================================
   scripts/scan-anchor.js
   ------------------------------------------------------------
   THE EDGE: Polymarket crypto markets ("Will Bitcoin be above $X
   on <date>?", "Ethereum above $Y?", "<coin> Up or Down <window>")
   have a FAIR probability computable from the live underlying:
   spot/forward + Deribit implied vol => risk-neutral P(S_T > K)
   under a lognormal model. Polymarket's crypto books are often
   slower than the 24/7 crypto market — when their EXECUTABLE price
   diverges from this anchor AND the book is fillable, that's a
   tradeable, forward-testable divergence.

   WHAT THIS DOES:
     1) DISCOVER live Polymarket crypto markets (lib/orderbook.js
        liveMarkets) by matching the question text.
     2) PARSE asset / strike(K) / expiry(tau) from the question +
        description for each supported market type:
          - THRESHOLD : "<coin> above $X on <date>"           (K=X)
          - REACH     : "<coin> reach $X in <month>"          (K=X, touch>=)
          - DIP       : "<coin> dip to $X in <month>"         (K=X, touch<=)
          - UPDOWN    : "<coin> Up or Down <window>"          (K=open level)
     3) ANCHOR : compute fair P(YES) from lib/anchor-crypto.js.
     4) BOOK   : pull the REAL YES (and NO) book (lib/orderbook.js),
        compute executable_ask = buyCost(book, clip).avgPrice for a
        $clip notional; only fillable (exhausted=false) clips count.
     5) EDGE   : edgeYES = fairP - execAskYES ; edgeNO = (1-fairP) -
        execAskNO. Flag where |edge| beats a cost threshold (half-
        spread + buffer) AND is fillable. Report cents + capacity.
     6) CALIBRATION : across ALL anchorable markets, the distribution
        of (Polymarket executable mid - fairP) — does Polymarket
        systematically differ, in which direction / conditions /
        market-type / horizon?

   HONESTY: the anchor ASSUMES Deribit ATM IV + lognormal/zero-drift
   is "fair". Reported divergences are vs THAT model. Model risk is
   flagged explicitly in the report (vol smile, jump risk, Deribit-
   vs-Binance basis, drift). Only BTC/ETH have a Deribit IV surface;
   other coins fall back to realized vol (flagged).

   New file only. Does NOT edit lib/*.js, server.js, package.json.
   Plain Node, zero deps. cwd-independent. Polite API use.

   Usage:
     node scripts/scan-anchor.js [--limit=600] [--clip=200]
       [--edge=0.03] [--max-markets=N] [--json]
   ============================================================ */

const path = require('path');
const {
  liveMarkets, getBook, buyCost, depthWithin, parseJSON,
} = require(path.join(__dirname, '..', 'lib', 'orderbook'));
const {
  fairProbAbove, buildChains, DERIBIT_CCY,
} = require(path.join(__dirname, '..', 'lib', 'anchor-crypto'));

/* ------------------------- args ------------------------- */
function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=')[1];
  if (process.argv.includes(`--${name}`)) return true;
  return def;
}
const LIMIT = +arg('limit', 700);
const CLIP_USD = +arg('clip', 200);          // notional clip ($) for executable price
const EDGE_THR = +arg('edge', 0.03);         // base edge threshold (3c) beyond cost buffer
const MAX_MARKETS = +arg('max-markets', 0);  // 0 = no cap
const JSON_OUT = !!arg('json', false);
// Min horizon (days) for a market to emit a SIGNAL. Near resolution the
// lognormal-at-forward anchor degenerates to ~K-side coin flips while the
// live market already knows the realized move (esp. intraday Up/Down) —
// that's a stale-anchor artifact, not edge. We still ANCHOR these (they
// show in calibration) but never trade them.
const MIN_TAU_DAYS = +arg('min-tau-days', 0.25);
// A fairP that has saturated to ~0/1 carries NO usable signal: it is exactly
// where ATM-lognormal is least trustworthy (fat tails / vol smile make far
// strikes far more likely than the model says) and where any spot/sigma error
// blows up. Never trade off a saturated anchor. Also gate strikes that are
// many daily-sigmas from forward (the unreliable tail).
const SAT_LO = 0.02, SAT_HI = 0.98;     // fairP must be inside (2%, 98%) to trade
const MAX_SIGMA_DIST = +arg('max-sigma-dist', 3.0); // |ln(K/F)|/(sigma*sqrt(tau)) cap

/* --------------------- asset detection --------------------- */
const ASSET_PATTERNS = [
  { asset: 'BTC', re: /\b(bitcoin|btc)\b/i },
  { asset: 'ETH', re: /\b(ethereum|ether|eth)\b/i },
  { asset: 'SOL', re: /\b(solana|sol)\b/i },
  { asset: 'XRP', re: /\b(xrp|ripple)\b/i },
  { asset: 'DOGE', re: /\b(dogecoin|doge)\b/i },
];
function detectAsset(q) {
  for (const p of ASSET_PATTERNS) if (p.re.test(q)) return p.asset;
  return null;
}

/* --------------------- number parsing --------------------- */
// "$72,500" -> 72500 ; "$150k" -> 150000 ; "3.00" -> 3
function parseMoney(s) {
  if (s == null) return null;
  let str = String(s).trim().replace(/[$,]/g, '');
  let mult = 1;
  const m = str.match(/^([\d.]+)\s*([kKmM]?)$/);
  if (!m) {
    const m2 = str.match(/([\d.]+)/);
    if (!m2) return null;
    return +m2[1];
  }
  if (m[2].toLowerCase() === 'k') mult = 1e3;
  if (m[2].toLowerCase() === 'm') mult = 1e6;
  const v = +m[1] * mult;
  return isFinite(v) ? v : null;
}

/* --------------------- type classification --------------------- */
/* Returns { type, strike, side } from the question, where side is
   'above' (YES if S_T > K), 'reach' (YES if max S touches >= K),
   'dip' (YES if min S touches <= K), or 'updown' (YES = "Up"). */
function classify(q) {
  const above = q.match(/\babove\s*\$?\s*([\d.,]+\s*[kKmM]?)/i);
  if (above) return { type: 'threshold', strike: parseMoney(above[1]), side: 'above' };

  const between = q.match(/between\s*\$?\s*([\d.,]+\s*[kKmM]?)\s*and\s*\$?\s*([\d.,]+\s*[kKmM]?)/i);
  if (between) return { type: 'range', lo: parseMoney(between[1]), hi: parseMoney(between[2]) };

  const reach = q.match(/\b(reach|hit|reaches|hits)\s*\$?\s*([\d.,]+\s*[kKmM]?)/i);
  if (reach) return { type: 'reach', strike: parseMoney(reach[2]), side: 'reach' };

  const dip = q.match(/\bdip(?:s)?\s*(?:to)?\s*\$?\s*([\d.,]+\s*[kKmM]?)/i);
  if (dip) return { type: 'dip', strike: parseMoney(dip[1]), side: 'dip' };

  if (/up or down/i.test(q)) return { type: 'updown', side: 'updown' };

  return { type: 'unknown' };
}

/* --------------------- expiry resolution --------------------- */
/* Prefer the market's endDate (resolution timestamp). Falls back to
   parsing nothing — endDate is reliably present on gamma markets. */
function expiryMsOf(m) {
  const iso = m.endDate || m.endDateIso;
  if (!iso) return null;
  const t = Date.parse(iso);
  return isFinite(t) ? t : null;
}

/* For UPDOWN markets, K (the "open"/reference level) is the prior
   reference close. The description states the comparison candle.
   We approximate K = current forward at scan time IF the window has
   not started, else the start-of-window level is unknown live — we
   use the live spot as the running reference and treat the question
   as P(S_end > S_now), which for an in-progress window with the open
   already fixed is only an approximation (flagged). For a not-yet-
   started daily Up/Down, K≈current forward is the honest anchor. */

/* --------------------- helpers --------------------- */
function cents(x) { return (x * 100).toFixed(1) + 'c'; }
function pct(x) { return (x * 100).toFixed(1) + '%'; }

/* executable ask for a $clip notional on a YES/NO token book:
   convert $clip into shares using best ask, walk depth for VWAP.
   Returns { avgPrice, filledShares, notional, exhausted, capUSD } where
   capUSD is the $ you could deploy buying within +3c of best ask. */
function executableAsk(book, clipUSD) {
  if (!book || !book.asks || !book.asks.length) return null;
  const bestAsk = book.asks[0].price;
  if (!(bestAsk > 0)) return null;
  const shares = clipUSD / bestAsk;
  const bc = buyCost(book, shares);
  if (!bc.avgPrice) return null;
  // capacity within 3c slippage of best ask, in $ terms (approx via best ask)
  const depthSh = depthWithin(book, 'buy', 0.03);
  const capUSD = depthSh * bestAsk;
  return {
    avgPrice: bc.avgPrice,
    bestAsk,
    filledShares: bc.filled,
    notional: bc.cost,
    exhausted: bc.exhausted,
    capUSD,
  };
}

/* ============================================================ */
async function main() {
  const t0 = Date.now();
  process.stderr.write('[scan-anchor] fetching live Polymarket markets...\n');
  let markets;
  try { markets = await liveMarkets({ limit: LIMIT }); }
  catch (e) { console.error('liveMarkets failed:', e.message); process.exit(1); }
  process.stderr.write(`[scan-anchor] ${markets.length} live markets pulled\n`);

  // 1) discover + classify crypto markets
  const candidates = [];
  for (const m of markets) {
    const q = m.question || '';
    const asset = detectAsset(q);
    if (!asset) continue;
    const cls = classify(q);
    if (cls.type === 'unknown' || cls.type === 'range') {
      // record but mark unsupported for fair-P (range needs two strikes; skip anchoring)
    }
    const tokenIds = parseJSON(m.clobTokenIds, null);
    if (!Array.isArray(tokenIds) || tokenIds.length < 2) continue;
    const outcomes = parseJSON(m.outcomes, null);
    const expiryMs = expiryMsOf(m);
    candidates.push({ m, q, asset, cls, tokenIds, outcomes, expiryMs });
  }
  process.stderr.write(`[scan-anchor] ${candidates.length} crypto markets matched\n`);

  // 2) build Deribit IV chains once for assets present
  const assetsPresent = [...new Set(candidates.map((c) => c.asset))];
  process.stderr.write(`[scan-anchor] assets: ${assetsPresent.join(', ')} — building Deribit IV chains...\n`);
  const chains = await buildChains(assetsPresent);
  const spotCache = new Map(), rvCache = new Map();

  // 3) anchor + book each candidate
  const rows = [];
  let processed = 0;
  for (const c of candidates) {
    if (MAX_MARKETS && processed >= MAX_MARKETS) break;
    processed++;
    const { m, q, asset, cls, tokenIds, outcomes, expiryMs } = c;

    // determine strike K and YES semantics
    let strike = null, anchorable = true, note = '';
    if (cls.type === 'threshold') strike = cls.strike;
    else if (cls.type === 'reach') { strike = cls.strike; note = 'touch>= (anchored as terminal P(S_T>=K); upper bound err: ignores intra-path touch)'; }
    else if (cls.type === 'dip') { strike = cls.strike; note = 'touch<= (anchored as terminal P(S_T<=K); upper bound err: ignores intra-path touch)'; }
    else if (cls.type === 'updown') { strike = null; note = 'K=live forward (P(S_end>S_now))'; }
    else if (cls.type === 'range') { strike = cls.lo; note = 'range P(lo<S_T<hi)=P(>lo)-P(>hi)'; }
    else { anchorable = false; note = cls.type === 'unknown' ? 'unrecognized question form' : 'unsupported'; }

    if (!expiryMs) { anchorable = false; note = 'no endDate'; }
    if (anchorable && cls.type !== 'updown' && !(strike > 0)) { anchorable = false; note = 'unparsed strike'; }
    if (cls.type === 'range' && !(cls.hi > cls.lo)) { anchorable = false; note = 'bad range bounds'; }

    // fair P
    let fair = null;
    if (anchorable) {
      try {
        let K = strike;
        if (cls.type === 'updown') {
          // need spot as K; fetch via anchor (strike=spot => P(S_T>spot))
          // fairProbAbove uses forward internally; pass strike=null sentinel by
          // first getting spot through a strike=1 call is wasteful — instead
          // compute with K = forward by asking anchor for K=spot:
          const probe = await fairProbAbove({ asset, strike: 1, expiryMs, chains, spotCache, rvCache });
          if (!probe) { anchorable = false; }
          else { K = probe.forward; }
        }
        if (anchorable) {
          fair = await fairProbAbove({ asset, strike: K, expiryMs, chains, spotCache, rvCache });
          if (fair) {
            if (cls.type === 'reach') {
              // "reach >= K": YES if terminal above K (terminal proxy)
              fair = { ...fair, fairP: fair.fairP };
            } else if (cls.type === 'dip') {
              // "dip <= K": YES if terminal below K => 1 - P(S_T>K)
              fair = { ...fair, fairP: 1 - fair.fairP };
            } else if (cls.type === 'range') {
              // P(lo<S_T<hi) = P(S_T>lo) - P(S_T>hi); reuse same sigma/forward
              const hiFair = await fairProbAbove({ asset, strike: cls.hi, expiryMs, chains, spotCache, rvCache });
              const pLo = fair.fairP, pHi = hiFair ? hiFair.fairP : null;
              if (pHi == null) { fair = null; }
              else fair = { ...fair, fairP: Math.max(0, pLo - pHi), rangeHi: cls.hi };
            }
            if (fair) fair = { ...fair, strikeUsed: K };
          }
        }
      } catch (e) { fair = null; }
    }
    if (!fair) {
      rows.push({ q, asset, type: cls.type, anchorable: false, note: note || 'anchor failed', expiryMs });
      continue;
    }

    // pull YES + NO books (token[0]=YES/Up, token[1]=NO/Down)
    let yesBook = null, noBook = null;
    try { yesBook = await getBook(tokenIds[0]); } catch (e) { /* */ }
    try { noBook = await getBook(tokenIds[1]); } catch (e) { /* */ }

    const yesExec = executableAsk(yesBook, CLIP_USD);
    const noExec = executableAsk(noBook, CLIP_USD);

    // executable mid for calibration = (yes ask + (1 - no ask))/2 when both
    // available, else yes ask, else 1 - no ask
    let execMid = null;
    if (yesExec && noExec) execMid = (yesExec.avgPrice + (1 - noExec.avgPrice)) / 2;
    else if (yesExec) execMid = yesExec.avgPrice;
    else if (noExec) execMid = 1 - noExec.avgPrice;

    // edges
    const fairP = fair.fairP;
    const halfSpreadYes = yesBook && yesBook.spread != null ? yesBook.spread / 2 : null;
    const halfSpreadNo = noBook && noBook.spread != null ? noBook.spread / 2 : null;
    const edgeYES = yesExec && !yesExec.exhausted ? (fairP - yesExec.avgPrice) : null;
    const edgeNO = noExec && !noExec.exhausted ? ((1 - fairP) - noExec.avgPrice) : null;

    rows.push({
      q, asset, type: cls.type, side: cls.side, anchorable: true, note,
      strike: fair.strikeUsed, expiryMs, tauDays: fair.tau * 365,
      sigmaDist: (fair.sigma > 0 && fair.tau > 0 && fair.strikeUsed > 0 && fair.forward > 0)
        ? Math.abs(Math.log(fair.strikeUsed / fair.forward)) / (fair.sigma * Math.sqrt(fair.tau)) : null,
      spot: fair.spot, forward: fair.forward, sigma: fair.sigma, source: fair.source, detail: fair.detail,
      fairP, execMid,
      yesAsk: yesExec ? yesExec.avgPrice : null, yesExhausted: yesExec ? yesExec.exhausted : null,
      noAsk: noExec ? noExec.avgPrice : null, noExhausted: noExec ? noExec.exhausted : null,
      yesCapUSD: yesExec ? yesExec.capUSD : null, noCapUSD: noExec ? noExec.capUSD : null,
      halfSpreadYes, halfSpreadNo,
      edgeYES, edgeNO,
      volume24hr: +m.volume24hr || 0, liquidity: +m.liquidity || 0,
    });

    // polite pacing between markets (each does 2 book GETs + maybe Deribit tickers)
    await new Promise((r) => setTimeout(r, 60));
  }

  report(rows, t0);
}

/* ============================================================
   Reporting + calibration
   ============================================================ */
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN; }
function median(a) { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
function stdev(a) { if (a.length < 2) return NaN; const mu = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - mu) * (x - mu), 0) / (a.length - 1)); }

function report(rows, t0) {
  const anchored = rows.filter((r) => r.anchorable);
  const tradeable = anchored.filter((r) => r.fairP != null);

  if (JSON_OUT) { console.log(JSON.stringify({ rows }, null, 2)); return; }

  console.log('\n=================== ANCHOR SCAN (crypto vs Deribit/lognormal) ===================');
  console.log(`scanned: ${rows.length} crypto markets | anchorable: ${anchored.length} | not-anchorable: ${rows.length - anchored.length}`);
  console.log(`clip=$${CLIP_USD}  base edge threshold=${cents(EDGE_THR)}  (edge must also beat half-spread)`);
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ---------- not-anchorable breakdown ----------
  const naByReason = {};
  for (const r of rows.filter((x) => !x.anchorable)) naByReason[r.note || '?'] = (naByReason[r.note || '?'] || 0) + 1;
  if (Object.keys(naByReason).length) {
    console.log('\n-- not-anchorable reasons --');
    for (const [k, v] of Object.entries(naByReason).sort((a, b) => b[1] - a[1])) console.log(`   ${v.toString().padStart(3)}  ${k}`);
  }

  // ---------- executable mispricings beyond cost ----------
  // require: edge beats max(EDGE_THR, half-spread + 1c buffer) and fillable
  function qualifies(edge, halfSpread) {
    if (edge == null) return false;
    const cost = Math.max(EDGE_THR, (halfSpread != null ? halfSpread : 0) + 0.01);
    return edge > cost;
  }
  // Direction suppression for path-vs-terminal model bias:
  //   reach (touch>=K): terminal UNDERSTATES YES -> only trust BUY YES
  //     (fairP is a lower bound; if exec is even below that lower bound the
  //      YES edge is robust to the bias). Never BUY NO off a low-balled fairP.
  //   dip (touch<=K): terminal UNDERSTATES YES(=below) -> only trust BUY YES.
  //     Never BUY NO off a low-balled fairP.
  function sideAllowed(r, dir) {
    if (r.type === 'reach' || r.type === 'dip') return dir === 'BUY YES';
    return true;
  }
  const signals = [], suppressed = [];
  for (const r of tradeable) {
    const tauOK = r.tauDays != null && r.tauDays >= MIN_TAU_DAYS;
    const satOK = r.fairP > SAT_LO && r.fairP < SAT_HI;
    const distOK = r.sigmaDist == null || r.sigmaDist <= MAX_SIGMA_DIST;
    for (const [dir, edge, halfSpread, exec, cap] of [
      ['BUY YES', r.edgeYES, r.halfSpreadYes, r.yesAsk, r.yesCapUSD],
      ['BUY NO', r.edgeNO, r.halfSpreadNo, r.noAsk, r.noCapUSD],
    ]) {
      if (!qualifies(edge, halfSpread)) continue;
      const rec = { ...r, dir, edge, exec, capUSD: cap };
      if (!tauOK) { suppressed.push({ ...rec, reason: `tau ${r.tauDays.toFixed(3)}d < ${MIN_TAU_DAYS}d (near-resolution; anchor degenerate)` }); continue; }
      if (!satOK) { suppressed.push({ ...rec, reason: `fairP=${pct(r.fairP)} saturated (anchor at 0/1 boundary; smile/tail unreliable)` }); continue; }
      if (!distOK) { suppressed.push({ ...rec, reason: `K is ${r.sigmaDist.toFixed(1)}σ from forward > ${MAX_SIGMA_DIST}σ (unreliable lognormal tail)` }); continue; }
      if (!sideAllowed(r, dir)) { suppressed.push({ ...rec, reason: `${r.type} ${dir} suppressed (terminal-vs-touch bias)` }); continue; }
      signals.push(rec);
    }
  }
  signals.sort((a, b) => b.edge - a.edge);
  suppressed.sort((a, b) => b.edge - a.edge);

  console.log('\n=================== EXECUTABLE MISPRICINGS (edge beats cost, fillable) ===================');
  if (!signals.length) {
    console.log('  none — no fillable clip beats fair-P by more than the cost buffer right now.');
  } else {
    console.log(`  ${signals.length} signal(s):\n`);
    for (const s of signals.slice(0, 40)) {
      console.log(`  [${s.dir}]  edge=${cents(s.edge)}  | exec=${pct(s.exec)}  fairP=${pct(s.fairP)}  cap≈$${Math.round(s.capUSD)}`);
      console.log(`      ${s.q}`);
      console.log(`      ${s.asset} ${s.type}  K=${s.strike != null ? '$' + Math.round(s.strike) : '-'}  tau=${s.tauDays.toFixed(3)}d  sigma=${pct(s.sigma)}  src=${s.source}`);
      console.log(`      vol24h=$${Math.round(s.volume24hr)}  ${s.note ? '['+s.note+']' : ''}`);
    }
    if (signals.length > 40) console.log(`  ... +${signals.length - 40} more`);
  }

  // suppressed: big raw divergences we deliberately DON'T trade (honesty)
  if (suppressed.length) {
    console.log(`\n  -- ${suppressed.length} raw divergence(s) SUPPRESSED (anchor unreliable here; not edge) --`);
    for (const s of suppressed.slice(0, 15)) {
      console.log(`  [${s.dir}] raw edge=${cents(s.edge)} exec=${pct(s.exec)} fairP=${pct(s.fairP)}  | ${s.reason}`);
      console.log(`      ${s.q}`);
    }
    if (suppressed.length > 15) console.log(`  ... +${suppressed.length - 15} more`);
  }

  // ---------- calibration: distribution of (execMid - fairP) ----------
  const calib = tradeable.filter((r) => r.execMid != null && isFinite(r.execMid) && r.fairP != null);
  const diffs = calib.map((r) => r.execMid - r.fairP);
  console.log('\n=================== CALIBRATION: (Polymarket executable mid − fair P) ===================');
  console.log(`  N=${calib.length} anchored markets with a two-sided executable price`);
  if (calib.length) {
    console.log(`  mean diff   = ${cents(mean(diffs))}   (Polymarket ${mean(diffs) > 0 ? 'ABOVE' : 'BELOW'} anchor on avg)`);
    console.log(`  median diff = ${cents(median(diffs))}`);
    console.log(`  stdev       = ${cents(stdev(diffs))}`);
    console.log(`  range       = [${cents(Math.min(...diffs))}, ${cents(Math.max(...diffs))}]`);
    // histogram in 2c buckets from -10c to +10c
    const buckets = {};
    for (const d of diffs) { const b = Math.max(-10, Math.min(10, Math.round(d * 100 / 2) * 2)); buckets[b] = (buckets[b] || 0) + 1; }
    console.log('  histogram (2c buckets):');
    for (let b = -10; b <= 10; b += 2) { const n = buckets[b] || 0; if (n) console.log(`    ${(b >= 0 ? '+' : '') + b}c: ${'#'.repeat(n)} (${n})`); }
  }

  // ---------- INFORMATIVE slice (where the anchor is actually valid) ----------
  // Saturated (fairP~0/1) and near-resolution markets dominate the raw
  // distribution but are exactly where the anchor is uninformative. The
  // honest calibration is on the informative zone: meaningful horizon AND
  // a non-pinned fair probability.
  const informative = calib.filter((r) => r.tauDays >= MIN_TAU_DAYS && r.fairP > SAT_LO && r.fairP < SAT_HI);
  const idiffs = informative.map((r) => r.execMid - r.fairP);
  const nSat = calib.filter((r) => r.fairP <= SAT_LO || r.fairP >= SAT_HI).length;
  const nNear = calib.filter((r) => r.tauDays < MIN_TAU_DAYS).length;
  console.log('\n-- INFORMATIVE slice only (tau>=' + MIN_TAU_DAYS + 'd AND fairP in (' + SAT_LO + ',' + SAT_HI + ')) --');
  console.log(`   excluded: ${nSat} saturated-anchor + ${nNear} near-resolution (anchor uninformative there)`);
  if (informative.length) {
    console.log(`   N=${informative.length}  mean=${cents(mean(idiffs))}  median=${cents(median(idiffs))}  stdev=${cents(stdev(idiffs))}  range=[${cents(Math.min(...idiffs))}, ${cents(Math.max(...idiffs))}]`);
    const byTi = {};
    for (const r of informative) (byTi[r.type] = byTi[r.type] || []).push(r.execMid - r.fairP);
    for (const [t, a] of Object.entries(byTi)) console.log(`     ${t.padEnd(10)} N=${String(a.length).padStart(2)}  signed=${cents(mean(a))}  stdev=${cents(stdev(a))}`);
  } else {
    console.log('   (none — every anchorable market right now is either near-resolution or pinned to 0/1)');
  }

  // ---------- slice by type & horizon ----------
  console.log('\n-- mean |edge| & mean signed (execMid−fairP) by market TYPE (all anchored) --');
  const byType = {};
  for (const r of calib) { (byType[r.type] = byType[r.type] || []).push(r); }
  for (const [t, arr] of Object.entries(byType)) {
    const d = arr.map((r) => r.execMid - r.fairP);
    const absMax = arr.map((r) => Math.max(Math.abs(r.edgeYES || 0), Math.abs(r.edgeNO || 0)));
    console.log(`   ${t.padEnd(10)} N=${String(arr.length).padStart(3)}  signed=${cents(mean(d))}  |bestEdge|≈${cents(mean(absMax))}`);
  }

  console.log('\n-- by HORIZON (tau) --');
  const horizons = [
    { name: '<1d   ', f: (r) => r.tauDays < 1 },
    { name: '1-3d  ', f: (r) => r.tauDays >= 1 && r.tauDays < 3 },
    { name: '3-10d ', f: (r) => r.tauDays >= 3 && r.tauDays < 10 },
    { name: '>=10d ', f: (r) => r.tauDays >= 10 },
  ];
  for (const h of horizons) {
    const arr = calib.filter(h.f);
    if (!arr.length) continue;
    const d = arr.map((r) => r.execMid - r.fairP);
    console.log(`   ${h.name} N=${String(arr.length).padStart(3)}  signed=${cents(mean(d))}  stdev=${cents(stdev(d))}`);
  }

  // ---------- model risk ----------
  console.log('\n=================== MODEL RISK (read before trusting any signal) ===================');
  console.log('  - Anchor = Deribit ATM IV + lognormal, ZERO drift. Real risk-neutral drift = r-funding,');
  console.log('    small for short horizons but nonzero; OTM strikes feel the vol SMILE we ignore (ATM-only).');
  console.log('  - Deribit settles on its index; Polymarket settles on a Binance 1-min candle close. Basis ~ small.');
  console.log('  - REACH/DIP are anchored as TERMINAL probabilities; true markets are TOUCH (path) — terminal');
  console.log('    UNDER-states YES prob (a barrier is easier to touch than to finish beyond). Treat as a lower');
  console.log('    bound on YES; do not buy NO on these off the terminal anchor.');
  console.log('  - UPDOWN uses K=live forward and P(S_end>S_now): if the window already opened, the true open is');
  console.log('    fixed in the past and unknown live — the anchor is approximate for in-progress windows.');
  console.log('  - Non-BTC/ETH assets use REALIZED vol (10d hourly), not forward IV — noisier, regime-laggy.');
  console.log('  - Executable prices are a SNAPSHOT; books move. Edge must clear the cost buffer AND be fillable');
  console.log('    (exhausted=false) to count; capacity shown is $ within 3c of best ask.');
  console.log('===============================================================================================\n');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
