'use strict';
/* ============================================================
   scripts/scan-xvenue-feefree.js
   ------------------------------------------------------------
   CROSS-VENUE ARB scanner, FEE-AWARE on BOTH legs.

   Motivation: the earlier scan (scripts/scan-xvenue.js) priced
   every Kalshi leg with the Kalshi per-contract fee but charged
   the Polymarket leg a flat (implicit, worst-case) taker fee on
   every category. It found ~58 confident matches, 0 net-positive.

   This scan corrects the Polymarket side: PM charges a TAKER fee
        pmFee = shares * rate * p * (1 - p)
   where `rate` is the market's OWN category rate (from the live
   market object's feeSchedule.rate), and is EXACTLY ZERO when the
   market is fee-free (feesEnabled === false -> geopolitics / world
   events). (Rates verified live + against Polymarket fee docs:
   sports .03 / politics .04 / finance .04 / mentions .04 / tech .04
   / economics .05 / culture .05 / weather .05 / crypto .07 ;
   geopolitics 0. Maker side is never charged; an arb must cross the
   spread = take, so the taker fee always applies.)

   So a matched pair whose PM leg is fee-free only pays:
        PM book slippage  +  Kalshi book slippage  +  Kalshi fee
   which is the cheapest possible cross-venue execution.

   We ALSO broaden matching beyond the library's sports + crypto
   into geopolitics, where Kalshi has clean binary "by-date" events
   whose resolution criteria are IDENTICAL to PM's (added locally
   below, NOT in lib/, and gated HARD on identical criteria + date
   so a wrong match can't manufacture a fake arb):
     - Strait of Hormuz "returns to normal" (IMF PortWatch 7d MA
       of transit calls >= 60) -- byte-identical resolution source.
     - Leader-out by date (Netanyahu / Zelenskyy ceases to hold
       office before the deadline).
   Both PM families above are fee-free.

   Pricing discipline is unchanged from the original: judged on
   EXECUTABLE prices only (real CLOB book walk + real Kalshi book
   walk), capacity = largest clip that stays < $1 per pair after
   ALL fees. Pure Node, zero deps. Polite, paced, capped API use.
   ============================================================ */
const ob = require('../lib/orderbook.js');
const K = require('../lib/kalshi.js');
const M = require('../lib/xvenue-match.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c2 = (x) => (x * 100).toFixed(2);
const usd = (x) => '$' + x.toFixed(2);

/* ===========================================================
   POLYMARKET per-market fee classification.
   The live Gamma market object carries everything we need:
     feesEnabled : false  -> fee-free (geopolitics / world)
     feeSchedule : { rate, exponent, takerOnly, rebateRate }
   The taker fee on a clip of `shares` filled at avg price p is
        rate * p * (1 - p) * shares        (exponent is 1 live)
   We DELIBERATELY ignore rebateRate (that is a maker rebate; an
   arb taker never earns it) -> conservative.
   =========================================================== */
function pmFeeRate(market) {
  if (!market) return { rate: 0.05, source: 'unknown_default' }; // safe fallback
  if (market.feesEnabled === false) return { rate: 0, source: 'fee_free' };
  const fs = market.feeSchedule;
  if (fs && typeof fs.rate === 'number') return { rate: fs.rate, source: market.feeType || 'schedule' };
  // feesEnabled true but no schedule surfaced: fall back to a known-rate-by-type map
  const RATE_BY_TYPE = {
    sports_fees_v2: 0.03, politics_fees: 0.04, finance_prices_fees: 0.04, tech_fees: 0.04,
    economics_fees: 0.05, culture_fees: 0.05, weather_fees: 0.05, crypto_fees_v2: 0.07,
  };
  const r = RATE_BY_TYPE[market.feeType];
  if (r != null) return { rate: r, source: market.feeType };
  return { rate: 0.05, source: 'enabled_unknown_default' };
}
/* PM taker fee in dollars for filling `shares` at average price p. */
function pmFee(rate, avgPrice, shares) {
  if (!rate || shares <= 0 || avgPrice == null) return 0;
  const p = Math.max(0, Math.min(1, avgPrice));
  return rate * p * (1 - p) * shares;
}

/* ===========================================================
   FEE-AWARE basket evaluator.
   Basket pays exactly $1 at resolution; cost/pair must be < $1.
     pmLeg cost = book VWAP  +  PM taker fee (rate, avg, n)
     kLeg cost  = book VWAP  +  Kalshi per-contract fee (already
                  baked into K.buyCostKalshi)
   profit is monotonically non-increasing in clip size (VWAP only
   worsens, and p*(1-p) fee is ~flat), so we search the max clip.
   =========================================================== */
function evalBasketFee(pmBook, pmRate, kAsks, { minNet = 0.005, maxClip = 5000 } = {}) {
  const pmDepth = pmBook.asks.reduce((s, l) => s + l.size, 0);
  const kDepth = kAsks.reduce((s, l) => s + l.size, 0);
  const ceil = Math.floor(Math.min(pmDepth, kDepth, maxClip));
  if (ceil < 1) return null;

  function perPair(n) {
    const pm = ob.buyCost(pmBook, n);
    const k = K.buyCostKalshi(kAsks, n);
    if (pm.exhausted || k.exhausted) return null;
    const pmf = pmFee(pmRate, pm.avgPrice, n);
    const total = pm.cost + pmf + k.cost; // pm.cost is fee-free VWAP; add PM fee explicitly
    return {
      cost: total / n,
      pmAvg: pm.avgPrice, kAvg: k.avgPrice,
      pmCost: pm.cost + pmf, kCost: k.cost,
      pmFee: pmf, kFee: k.fee,
    };
  }
  const one = perPair(1);
  if (!one || one.cost > 1 - minNet) return null;

  let lo = 1, hi = ceil;
  let hiEval = perPair(hi);
  while (!hiEval && hi > 1) { hi = Math.floor(hi / 2); hiEval = perPair(hi); }
  if (hiEval && hiEval.cost <= 1 - minNet) return { size: hi, ...hiEval, netPerPair: 1 - hiEval.cost };
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const e = perPair(mid);
    if (e && e.cost <= 1 - minNet) lo = mid; else hi = mid - 1;
  }
  const fin = perPair(lo);
  if (!fin || fin.cost > 1 - minNet) return null;
  return { size: lo, ...fin, netPerPair: 1 - fin.cost };
}

/* ===========================================================
   LOCAL geopolitics matchers (NOT in lib/) — HARD-gated on
   identical resolution criteria + identical deadline date.

   Date convention: PM "...by <D>?" markets resolve YES if the
   condition is met on/before calendar day D (endDate = D). The
   equivalent Kalshi "Before <D+1>" bin resolves YES on the same
   condition window. So we require:
        kalshiBeforeDate  ==  pmByDate + 1 day
   anything else is rejected (an off-by-one = different deadline =
   fake arb).
   =========================================================== */
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
function pmParseArr(v) { try { return typeof v === 'string' ? JSON.parse(v) : (v || []); } catch { return []; } }
function pmYesNo(m) { return M.pmYesNoTokens(m); }

/* parse the PM "by <date>" deadline -> iso day (uses endDate, the
   authoritative resolution boundary; the question text is just a label). */
function pmByDate(m) {
  const d = m.endDate || m.endDateIso || null;
  return M.isoDay(d);
}
/* Kalshi "Before <Mon D, YYYY>" -> iso day, taken from yes_sub_title
   (most reliable) with the ticker date as a fallback. */
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function kBeforeDate(km) {
  const mm = /before\s+([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(km.yesSubTitle || '');
  if (mm) {
    const mon = MON[mm[1].toLowerCase()];
    if (mon != null) return `${mm[3]}-${String(mon + 1).padStart(2, '0')}-${String(+mm[2]).padStart(2, '0')}`;
  }
  // "Before <Month>" (month-boundary form, e.g. "Before July") => 1st of month, current/next year from close
  const mm2 = /before\s+([a-z]{3,9})$/i.exec((km.yesSubTitle || '').trim());
  if (mm2) {
    const mon = MON[mm2[1].slice(0, 3).toLowerCase()];
    if (mon != null) {
      const y = km.closeTime ? new Date(km.closeTime).getUTCFullYear() : new Date().getUTCFullYear();
      return `${y}-${String(mon + 1).padStart(2, '0')}-01`;
    }
  }
  return null;
}
function isoPlusOneDay(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return null;
  return new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
}

/* A geopolitics "by-date" family: a predicate that recognizes the PM
   market, a predicate for the Kalshi series, plus the human label and
   confidence. Resolution criteria are asserted IDENTICAL in comments. */
const GEO_FAMILIES = [
  {
    id: 'hormuz_normal',
    confidence: 'high',
    // PM: "Yes if IMF PortWatch 7-day MA of transit calls >= 60 for any date
    //      between creation and <D>." Kalshi KXHORMUZNORM: "Yes if 7-day MA of
    //      transit calls (IMF PortWatch) is above 60 before <D+1>." -> SAME source,
    //      SAME metric, SAME threshold (>=60 vs >60 differ by an infinitesimal on a
    //      continuous MA), SAME window. HIGH confidence.
    pmMatch: (m) => /strait of hormuz traffic returns to normal/i.test(m.question || ''),
    kSeries: 'KXHORMUZNORM',
    label: (m, km) => `Hormuz traffic normal (IMF PortWatch 7d MA>=60) by ${pmByDate(m)}`,
  },
  {
    id: 'netanyahu_out',
    confidence: 'high',
    // PM: "Yes if Netanyahu ceases to be PM of Israel for any period between
    //      creation and <D> (ET)." Kalshi KXNETANYAHUOUT: "Yes if Netanyahu leaves
    //      as PM of Israel before <D+1>." -> SAME event, SAME deadline. HIGH.
    pmMatch: (m) => /^\s*netanyahu out by/i.test(m.question || ''),
    kSeries: 'KXNETANYAHUOUT',
    label: (m, km) => `Netanyahu out as Israel PM by ${pmByDate(m)}`,
  },
  {
    id: 'zelenskyy_out',
    confidence: 'medium',
    // PM: "Yes if Zelenskyy ceases to be President of Ukraine for any period
    //      between creation and <D>; an announcement resolves immediately."
    //      Kalshi KXZELENSKYYOUT: "Yes if Zelenskyy has announced intention to
    //      leave OR actually left before <D+1>." Both count an announcement, but
    //      'ceases to be' (PM) vs 'announced/left' (Kalshi) wording differs a
    //      hair -> MEDIUM.
    pmMatch: (m) => /^\s*zelenskyy out as ukraine president by/i.test(m.question || ''),
    kSeries: 'KXZELENSKYYOUT',
    label: (m, km) => `Zelenskyy out as Ukraine president by ${pmByDate(m)}`,
  },
];

/* Build geopolitics matches: index the relevant Kalshi series by deadline
   date, then probe with the PM markets in each family. */
function buildGeoMatches(pmMarkets, kalshiMarkets) {
  // index kalshi by series -> beforeDate -> km
  const kBySeriesDate = new Map(); // `${series}|${date}` -> km
  for (const km of kalshiMarkets) {
    const fam = GEO_FAMILIES.find((f) => f.kSeries === km.seriesTicker);
    if (!fam) continue;
    const bd = kBeforeDate(km);
    if (!bd) continue;
    km._geoBefore = bd;
    kBySeriesDate.set(`${km.seriesTicker}|${bd}`, km);
  }

  const matches = [];
  const seen = new Set();
  for (const m of pmMarkets) {
    const fam = GEO_FAMILIES.find((f) => f.pmMatch(m));
    if (!fam) continue;
    const yn = pmYesNo(m);
    if (!yn) continue;
    const byD = pmByDate(m);
    if (!byD) continue;
    const wantKDate = isoPlusOneDay(byD); // Kalshi "before" date == PM by-date + 1
    const km = kBySeriesDate.get(`${fam.kSeries}|${wantKDate}`);
    if (!km) continue; // STRICT: no Kalshi bin with the exact equivalent deadline
    const key = `${fam.id}|${km.ticker}|${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      kind: 'geo_' + fam.id,
      confidence: fam.confidence,
      key,
      label: `${fam.label(m, km)}  [PM "${(m.question || '').trim()}"  ==  Kalshi ${km.ticker}]`,
      pm: { marketId: m.id, question: m.question, yesToken: yn.yesToken, noToken: yn.noToken, yesPrice: yn.yesPrice, volume: +m.volume || 0, market: m },
      kalshi: { ticker: km.ticker, eventTicker: km.eventTicker, yesSub: km.yesSubTitle, yesAsk: km.yesAsk, yesBid: km.yesBid, volume: km.volume },
      meta: { pmByDate: byD, kBefore: km._geoBefore },
    });
  }
  return matches;
}

/* Attach the live PM market object onto a library (sports/crypto) match so we
   can read its real fee rate. buildMatches keeps only marketId, so re-link. */
function relinkPmMarket(match, pmById) {
  const m = pmById.get(match.pm.marketId);
  if (m) match.pm.market = m;
  return match;
}

async function main() {
  const MIN_NET = 0.005;     // require >= 0.5c/$1 net edge after ALL fees
  const MIN_PM_VOL = 1000;   // skip dead PM markets
  const args = process.argv.slice(2);
  const VERBOSE = args.includes('-v');

  console.log('=== FEE-AWARE CROSS-VENUE ARB SCANNER  (Polymarket <-> Kalshi) ===');
  console.log('PM leg fee = rate * p * (1-p) * shares  (rate=0 when fee-free) ; Kalshi leg fee as per spec');
  console.log('date:', new Date().toISOString(), '\n');

  // 1) pull both venues
  process.stdout.write('Pulling Polymarket live markets... ');
  const pmMarkets = await ob.liveMarkets({ limit: 1500 });
  console.log(pmMarkets.length, 'markets');
  const pmById = new Map(pmMarkets.map((m) => [m.id, m]));

  process.stdout.write('Pulling Kalshi open events (nested, dropping parlays)... ');
  const kEvents = await K.fetchOpenEvents({ maxPages: 60, pageDelayMs: 120 });
  const kMarkets = K.normalizeMarkets(kEvents);
  console.log(kEvents.length, 'events ->', kMarkets.length, 'single-outcome markets');

  // 2) match: library (sports+crypto) + local geopolitics families
  const libMatches = M.buildMatches(pmMarkets, kMarkets).map((mt) => relinkPmMarket(mt, pmById));
  const geoMatches = buildGeoMatches(pmMarkets, kMarkets);
  const matches = [...libMatches, ...geoMatches];

  const byKind = {};
  for (const mt of matches) byKind[mt.kind] = (byKind[mt.kind] || 0) + 1;
  console.log('\nConfident cross-venue matches:', matches.length, JSON.stringify(byKind));
  const byConf = {};
  for (const mt of matches) byConf[mt.confidence] = (byConf[mt.confidence] || 0) + 1;
  console.log('  by confidence:', JSON.stringify(byConf));

  // 2b) fee-free classification across all matches (PM leg)
  let feeFreeCount = 0;
  const feeFreeByKind = {};
  for (const mt of matches) {
    const fr = pmFeeRate(mt.pm.market);
    mt._pmRate = fr.rate;
    mt._pmRateSrc = fr.source;
    if (fr.rate === 0) { feeFreeCount++; feeFreeByKind[mt.kind] = (feeFreeByKind[mt.kind] || 0) + 1; }
  }
  console.log('  PM-leg fee-free matches  :', feeFreeCount, '/', matches.length, JSON.stringify(feeFreeByKind));

  if (!matches.length) { console.log('\nNo confident matches found.'); return; }

  // 3) price every match on REAL books (both directions), fees on BOTH legs.
  const gaps = [];
  const priced = [];
  let idx = 0;
  for (const mt of matches) {
    idx++;
    const pmYes = mt.pm.yesPrice;
    const kYesAsk = mt.kalshi.yesAsk;
    if (pmYes != null && kYesAsk != null && kYesAsk > 0 && kYesAsk < 1) {
      gaps.push({ kind: mt.kind, label: mt.label, gap: Math.abs(pmYes - kYesAsk), pmYes, kYesAsk, feeFree: mt._pmRate === 0 });
    }

    if ((mt.pm.volume || 0) < MIN_PM_VOL) { mt._skip = 'pm_vol'; continue; }

    let pmYesBook, pmNoBook, kbook;
    try {
      pmYesBook = await ob.getBook(mt.pm.yesToken);
      pmNoBook = await ob.getBook(mt.pm.noToken);
    } catch (e) { mt._skip = 'pm_book_err'; continue; }
    try {
      kbook = await K.getOrderbook(mt.kalshi.ticker, { depth: 100 });
    } catch (e) { mt._skip = 'k_book_err'; continue; }
    await sleep(80);

    const rate = mt._pmRate;
    // Basket A: PM-YES + Kalshi-NO ; Basket B: PM-NO + Kalshi-YES
    const A = evalBasketFee(pmYesBook, rate, kbook.noAsks, { minNet: MIN_NET });
    const B = evalBasketFee(pmNoBook, rate, kbook.yesAsks, { minNet: MIN_NET });
    const best = [A && { dir: 'A', ...A }, B && { dir: 'B', ...B }]
      .filter(Boolean).sort((a, b) => b.netPerPair - a.netPerPair)[0] || null;

    // best 1-contract basket cost (incl all fees) for near-miss reporting
    const oneA = (() => { const p = ob.buyCost(pmYesBook, 1), k = K.buyCostKalshi(kbook.noAsks, 1); return (p.exhausted || k.exhausted) ? null : p.cost + pmFee(rate, p.avgPrice, 1) + k.cost; })();
    const oneB = (() => { const p = ob.buyCost(pmNoBook, 1), k = K.buyCostKalshi(kbook.yesAsks, 1); return (p.exhausted || k.exhausted) ? null : p.cost + pmFee(rate, p.avgPrice, 1) + k.cost; })();
    const bestOne = [oneA, oneB].filter((x) => x != null).sort((a, b) => a - b)[0];

    priced.push({ mt, A, B, best, bestOne });
    if (VERBOSE) process.stdout.write(`  [${idx}/${matches.length}] ${mt.kind} rate=${mt._pmRate} ${best ? 'EDGE ' + c2(best.netPerPair) + 'c/$1 x' + best.size : (bestOne != null ? 'miss ' + usd(bestOne) : '-')}\n`);
  }

  // 4) gap distribution
  gaps.sort((a, b) => b.gap - a.gap);
  const buckets = { '0-1c': 0, '1-3c': 0, '3-5c': 0, '5-10c': 0, '10c+': 0 };
  for (const g of gaps) {
    const c = g.gap * 100;
    if (c < 1) buckets['0-1c']++; else if (c < 3) buckets['1-3c']++;
    else if (c < 5) buckets['3-5c']++; else if (c < 10) buckets['5-10c']++; else buckets['10c+']++;
  }

  // 5) report
  console.log('\n=== TOP-OF-BOOK PRICE DISCREPANCY DISTRIBUTION (|PM yes - Kalshi yes ask|) ===');
  console.log('  n =', gaps.length, '| buckets:', JSON.stringify(buckets));
  console.log('  largest raw gaps (pre-cost):');
  for (const g of gaps.slice(0, 10)) {
    console.log(`    ${c2(g.gap)}c  pmYes=${c2(g.pmYes)} kYesAsk=${c2(g.kYesAsk)}  ${g.feeFree ? '[FEE-FREE PM] ' : ''}${g.label.slice(0, 72)}`);
  }

  const profitable = priced.filter((p) => p.best).sort((a, b) => b.best.netPerPair - a.best.netPerPair);
  console.log('\n=== EXECUTABLE CROSS-VENUE ARBS (real books + BOTH-leg fees, net > ' + c2(MIN_NET) + 'c/$1) ===');
  console.log('  priced pairs:', priced.length, '| net-positive executable:', profitable.length);

  if (!profitable.length) {
    console.log('\n  >>> NONE clears spread + both-leg fees at executable size right now.');
    const nm = priced.filter((p) => p.bestOne != null).sort((a, b) => a.bestOne - b.bestOne).slice(0, 12);
    if (nm.length) {
      console.log('\n  Closest near-misses (best-basket cost for 1 contract, incl ALL fees; need < $1.00):');
      for (const p of nm) {
        const sf = (p.bestOne - 1) * 100;
        const ff = p.mt._pmRate === 0 ? '[FEE-FREE PM] ' : `[PM rate ${p.mt._pmRate}] `;
        console.log(`    cost ${usd(p.bestOne)}  (${sf >= 0 ? '+' : ''}${sf.toFixed(2)}c vs breakeven)  ${ff}${p.mt.label.slice(0, 64)}`);
      }
    }
  } else {
    for (const p of profitable) {
      const b = p.best, mt = p.mt;
      const legs = b.dir === 'A'
        ? `BUY Polymarket-YES @~${c2(b.pmAvg)}c (+PM fee ${c2(b.pmFee / b.size)}c)  +  BUY Kalshi-NO @~${c2(b.kAvg)}c (+K fee ${c2(b.kFee / b.size)}c)`
        : `BUY Kalshi-YES @~${c2(b.kAvg)}c (+K fee ${c2(b.kFee / b.size)}c)  +  BUY Polymarket-NO @~${c2(b.pmAvg)}c (+PM fee ${c2(b.pmFee / b.size)}c)`;
      console.log('\n  ----------------------------------------------------------------');
      console.log(`  ${mt.kind}  [${mt.confidence}]  PM rate=${mt._pmRate}${mt._pmRate === 0 ? ' (FEE-FREE)' : ''}`);
      console.log(`  ${mt.label}`);
      console.log(`    ${legs}`);
      console.log(`    cost/pair = ${usd(b.cost)}  ->  NET = ${c2(b.netPerPair)}c per $1`);
      console.log(`    CAPACITY = ${b.size} pairs  ->  locked profit ~${usd(b.netPerPair * b.size)}`);
      if (mt.meta && mt.meta.caveat) console.log(`    CAVEAT: ${mt.meta.caveat}`);
    }
  }

  // 6) headline stats
  const skips = {};
  for (const mt of matches) if (mt._skip) skips[mt._skip] = (skips[mt._skip] || 0) + 1;
  const ffProfitable = profitable.filter((p) => p.mt._pmRate === 0).length;
  console.log('\n=== STATS ===');
  console.log('  #PM markets pulled        :', pmMarkets.length);
  console.log('  #PM fee-free markets      :', pmMarkets.filter((m) => m.feesEnabled === false).length);
  console.log('  #Kalshi single markets    :', kMarkets.length);
  console.log('  #confident matches        :', matches.length, JSON.stringify(byKind));
  console.log('  #matches w/ fee-free PM   :', feeFreeCount, JSON.stringify(feeFreeByKind));
  console.log('  #priced on real books     :', priced.length, '(skipped:', JSON.stringify(skips) + ')');
  console.log('  #net-positive after fees  :', profitable.length, '(of which fee-free PM:', ffProfitable + ')');
  console.log('  raw gap buckets           :', JSON.stringify(buckets));
}

main().catch((e) => { console.error('FATAL', e.message, e.stack); process.exit(1); });
