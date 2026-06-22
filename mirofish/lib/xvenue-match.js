'use strict';
/* ============================================================
   lib/xvenue-match.js — cross-venue matcher (Polymarket <-> Kalshi)
   ------------------------------------------------------------
   The hard, dangerous part: pair markets that resolve on the
   EXACT SAME real-world outcome. A wrong match = a fake arb that
   can lose real money, so the bias is HARD toward false negatives:
   we only emit HIGH-CONFIDENCE matches with identical resolution
   criteria + date, and we always record orientation so the caller
   knows which Polymarket token == which Kalshi side.

   We match within two categories where resolution is unambiguous:

     1) SOCCER / sports GAME WINNER ("Team A beats Team B on date")
        - PM: an event "Team A vs. Team B" whose per-team market
          asks "Will <Team> win on YYYY-MM-DD?" (Yes/No).
        - Kalshi: KX*GAME event "Team A vs Team B" with per-outcome
          markets (yes_sub_title = team or "Tie"), date in ticker.
        - We pair PM "<Team> wins" YES  <->  Kalshi "<Team>" YES,
          matched on { normalized team set, game date }.

     2) CRYPTO THRESHOLD ("BTC above $X on date")
        - PM: "Will the price of Bitcoin be above $X on <Month D>?"
        - Kalshi KXBTCD: "$X or above" on the same calendar date.
        - We pair PM YES (above X) <-> Kalshi YES (>= X) on
          { asset, threshold, calendar date }. NOTE the intraday
          settlement TIME/SOURCE can differ between venues; we keep
          these but tag confidence 'medium' and surface the caveat.

   Output match record:
     {
       kind, confidence, key,
       pm:     { tokenIdYes, tokenIdNo, question, ... },
       kalshi: { tickerYes, ... },     // YES on both sides means the
                                       // SAME outcome resolving 1.
       label
     }
   ============================================================ */

/* ---------------- generic text utils ---------------- */
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* Country / team alias normalization so PM full names == Kalshi subtitles.
   Both venues mostly use full English names in their human-readable fields;
   this just collapses the few known spelling variants. */
const TEAM_ALIAS = {
  'usa': 'united states', 'us': 'united states', 'united states of america': 'united states',
  'congo dr': 'dr congo', 'democratic republic of the congo': 'dr congo', 'dr congo': 'dr congo',
  'south korea': 'korea republic', 'korea republic': 'korea republic', 'republic of korea': 'korea republic',
  'ivory coast': 'cote divoire', "cote d ivoire": 'cote divoire', 'cote divoire': 'cote divoire',
  'czech republic': 'czechia', 'czechia': 'czechia',
  'cape verde': 'cabo verde', 'cabo verde': 'cabo verde',
  'bosnia and herzegovina': 'bosnia', 'bosnia herzegovina': 'bosnia',
};
function teamKey(name) {
  const n = norm(name);
  return TEAM_ALIAS[n] || n;
}

/* ---------------- date helpers ---------------- */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function isoDay(d) { // -> "YYYY-MM-DD" in UTC
  if (!d) return null;
  const t = new Date(d);
  if (isNaN(t)) return null;
  return t.toISOString().slice(0, 10);
}
/* Kalshi tickers encode the date as e.g. 26JUN27 -> 2026-06-27. */
function kalshiTickerDate(ticker) {
  const m = /-(\d{2})([A-Z]{3})(\d{2})/.exec(ticker || '');
  if (!m) return null;
  const yy = +m[1], mon = MONTHS[m[2].toLowerCase()], dd = +m[3];
  if (mon == null) return null;
  return `20${String(yy).padStart(2, '0')}-${String(mon + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/* =====================================================================
   POLYMARKET extraction
   ===================================================================== */
function pmParseArr(v) { try { return typeof v === 'string' ? JSON.parse(v) : (v || []); } catch { return []; } }

/* From a PM market, return { yesToken, noToken } aligned to outcomes Yes/No. */
function pmYesNoTokens(m) {
  const outs = pmParseArr(m.outcomes).map((x) => String(x).toLowerCase());
  const toks = pmParseArr(m.clobTokenIds);
  if (toks.length !== outs.length) return null;
  const yi = outs.indexOf('yes'), ni = outs.indexOf('no');
  if (yi < 0 || ni < 0) return null;
  return { yesToken: toks[yi], noToken: toks[ni], yesPrice: +pmParseArr(m.outcomePrices)[yi] };
}

/* Pull the two teams of a fixture from a "A vs. B" / "A vs B" title. */
function parseFixtureTitle(title) {
  const mm = /^(.+?)\s+vs\.?\s+(.+?)$/i.exec(String(title || '').trim());
  if (!mm) return null;
  // strip trailing qualifiers PM sometimes appends (" - More Markets", etc.)
  const a = mm[1].replace(/\s*-\s*.*$/, '').trim();
  const b = mm[2].replace(/\s*-\s*.*$/, '').trim();
  if (!a || !b) return null;
  return { a, b, keys: [teamKey(a), teamKey(b)].sort() };
}

/* Identify PM SINGLE-GAME winner markets — STRICT.
   ONLY the exact form "Will <Team> win on <YYYY-MM-DD>?" counts. This is the
   one PM phrasing that means "this team wins THIS dated match". We DELIBERATELY
   reject everything else (e.g. "Will X win the World Cup?", "Will X win Group I?")
   because those are tournament/group futures, NOT a single game — matching them
   to a Kalshi single-game market is a wrong match (fake arb). We also capture
   the opponent (the fixture) from the PM event title so the caller can require
   BOTH teams to agree, not just one team + date. */
function pmExtractGameWinner(m) {
  const q = (m.question || '').trim();
  const mm = /^Will (.+?) win on (\d{4}-\d{2}-\d{2})\??$/i.exec(q);
  if (!mm) return null;                       // strict: no fallback
  const team = mm[1].trim();
  const date = mm[2];
  if (/draw|tie|group|the \d{4}|world cup|tournament/i.test(team)) return null;
  // opponent / fixture from the PM event title
  let fixture = null;
  const ev = (m.events && m.events[0]) || null;
  if (ev && ev.title) fixture = parseFixtureTitle(ev.title);
  return { team, date, teamKey: teamKey(team), fixture };
}

/* Identify PM "Will the price of Bitcoin be above $X on <date>?" markets. */
function pmExtractCryptoThreshold(m) {
  const q = m.question || '';
  // asset
  let asset = null;
  if (/\bbitcoin\b|\bbtc\b/i.test(q)) asset = 'BTC';
  else if (/\bethereum\b|\beth\b/i.test(q)) asset = 'ETH';
  if (!asset) return null;
  // "above $X on <date>" (the daily settlement form, unambiguous)
  const mm = /be above \$?([\d,]+(?:\.\d+)?)\b.*?on\s+([A-Za-z]+ \d{1,2})/i.exec(q);
  if (!mm) return null;
  const threshold = parseFloat(mm[1].replace(/,/g, ''));
  const date = isoDay(m.gameStartTime || m.endDate);
  if (!threshold || !date) return null;
  return { asset, threshold, date, dir: 'above' };
}

/* =====================================================================
   KALSHI extraction (operates on normalized kalshi market records)
   ===================================================================== */
function kIsGameWinner(km) {
  // game-winner series have per-team markets with a yes_sub_title team name
  // and the event is mutually exclusive (A / B / Tie). We accept any *GAME*
  // series; exclude Tie outcomes (no PM counterpart market for "win").
  if (!/GAME/.test(km.seriesTicker || km.ticker)) return false;
  if (!km.yesSubTitle) return false;
  if (/^tie$|^draw$/i.test(km.yesSubTitle.trim())) return false;
  return true;
}
function kGameWinnerInfo(km) {
  const date = kalshiTickerDate(km.ticker) || isoDay(km.closeTime);
  // Kalshi event title is "Team A vs Team B" (full names) — gives us the fixture.
  const fixture = parseFixtureTitle(km.eventTitle);
  return { team: km.yesSubTitle.trim(), teamKey: teamKey(km.yesSubTitle), date, fixture };
}

function kIsCryptoAbove(km) {
  // KXBTCD daily "$X or above"
  const s = km.seriesTicker || '';
  if (!/^KXBTCD$|^KXETHD$/.test(s)) return false;
  return /or above/i.test(km.yesSubTitle || '');
}
function kCryptoInfo(km) {
  const asset = /BTC/.test(km.seriesTicker) ? 'BTC' : (/ETH/.test(km.seriesTicker) ? 'ETH' : null);
  const mm = /\$?([\d,]+(?:\.\d+)?)\s*or above/i.exec(km.yesSubTitle || '');
  if (!mm) return null;
  const threshold = parseFloat(mm[1].replace(/,/g, ''));
  const date = kalshiTickerDate(km.ticker) || isoDay(km.closeTime);
  return { asset, threshold, date, dir: 'above' };
}

/* =====================================================================
   MATCHER — build indices on Kalshi, then probe with PM markets.
   ===================================================================== */
function buildMatches(pmMarkets, kalshiMarkets) {
  // ---- index Kalshi game-winners by (date | teamKey) ----
  const kGameByKey = new Map(); // `${date}|${teamKey}` -> km
  const kGameDates = new Set();
  for (const km of kalshiMarkets) {
    if (!kIsGameWinner(km)) continue;
    const info = kGameWinnerInfo(km);
    if (!info.date || !info.teamKey) continue;
    km._g = info;
    kGameByKey.set(`${info.date}|${info.teamKey}`, km);
    kGameDates.add(info.date);
  }
  // ---- index Kalshi crypto-above by (asset|date|threshold) ----
  const kCryptoByKey = new Map();
  for (const km of kalshiMarkets) {
    if (!kIsCryptoAbove(km)) continue;
    const info = kCryptoInfo(km);
    if (!info || !info.date || !info.threshold) continue;
    km._c = info;
    kCryptoByKey.set(`${info.asset}|${info.date}|${info.threshold}`, km);
  }

  const matches = [];
  const seen = new Set();

  for (const m of pmMarkets) {
    const yn = pmYesNoTokens(m);
    if (!yn) continue;

    // ---- sports game winner ----
    const g = pmExtractGameWinner(m);
    if (g) {
      // try exact date, and +/-1 day (timezone slop on PM endDate)
      const cand = [g.date];
      const d = new Date(g.date);
      cand.push(new Date(d.getTime() + 86400000).toISOString().slice(0, 10));
      cand.push(new Date(d.getTime() - 86400000).toISOString().slice(0, 10));
      let km = null, usedDate = null;
      for (const dd of cand) {
        const hit = kGameByKey.get(`${dd}|${g.teamKey}`);
        if (!hit) continue;
        // REQUIRE the full fixture (both teams) to agree, not just one team + date.
        // This blocks pairing a team's group/other game with the wrong opponent.
        const kf = hit._g.fixture, pf = g.fixture;
        if (!kf || !pf) continue;                       // need both fixtures known
        if (kf.keys[0] !== pf.keys[0] || kf.keys[1] !== pf.keys[1]) continue;
        km = hit; usedDate = dd; break;
      }
      if (km) {
        const key = `game|${km.ticker}|${m.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          const dateExact = usedDate === g.date;
          matches.push({
            kind: 'sports_game_winner',
            confidence: dateExact ? 'high' : 'medium',
            key,
            label: `${g.team} to win (${km._g.date})  [PM "${m.question}"  ==  Kalshi ${km.ticker}]`,
            // YES on both venues == the same outcome (team wins) resolves to 1.
            pm: { marketId: m.id, question: m.question, yesToken: yn.yesToken, noToken: yn.noToken, yesPrice: yn.yesPrice, negRisk: !!m.negRisk, volume: +m.volume || 0 },
            kalshi: { ticker: km.ticker, eventTicker: km.eventTicker, yesSub: km.yesSubTitle, yesAsk: km.yesAsk, yesBid: km.yesBid, volume: km.volume },
            meta: { team: g.team, date: km._g.date, dateExact },
          });
        }
      }
    }

    // ---- crypto threshold ----
    const c = pmExtractCryptoThreshold(m);
    if (c) {
      const km = kCryptoByKey.get(`${c.asset}|${c.date}|${c.threshold}`);
      if (km) {
        const key = `crypto|${km.ticker}|${m.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            kind: 'crypto_threshold',
            // settlement TIME / source can differ across venues -> medium at best
            confidence: 'medium',
            key,
            label: `${c.asset} >= $${c.threshold.toLocaleString()} on ${c.date}  [PM "${m.question}"  ==  Kalshi ${km.ticker}]`,
            pm: { marketId: m.id, question: m.question, yesToken: yn.yesToken, noToken: yn.noToken, yesPrice: yn.yesPrice, negRisk: !!m.negRisk, volume: +m.volume || 0 },
            kalshi: { ticker: km.ticker, eventTicker: km.eventTicker, yesSub: km.yesSubTitle, yesAsk: km.yesAsk, yesBid: km.yesBid, volume: km.volume },
            meta: { asset: c.asset, threshold: c.threshold, date: c.date, caveat: 'intraday settlement time/source may differ between venues' },
          });
        }
      }
    }
  }
  return matches;
}

module.exports = {
  norm, teamKey, isoDay, kalshiTickerDate, parseFixtureTitle,
  pmYesNoTokens, pmExtractGameWinner, pmExtractCryptoThreshold,
  kIsGameWinner, kGameWinnerInfo, kIsCryptoAbove, kCryptoInfo,
  buildMatches,
};
