'use strict';
/* ============================================================
   scripts/forecast.js — drive the AI-forecaster harness.
     node scripts/forecast.js list                         list live candidates
     node scripts/forecast.js record <id> <p> <conf> "why" log a forecast + gate
     node scripts/forecast.js score                        calibration + PnL of resolved
   The forecast (p = AI's P(yes), conf = AI's confidence) comes from an AI
   agent that did real research. The harness only decides whether the gap
   beats cost; it never trusts an unproven probability.
   ============================================================ */
const { selectCandidates, tradeSignal, logForecast, score } = require('../lib/forecaster');
const { liveMarkets, parseJSON } = require('../lib/orderbook');

async function main() {
  const cmd = process.argv[2] || 'list';

  if (cmd === 'list') {
    const cands = await selectCandidates();
    console.log(`\n${cands.length} research-amenable live candidates (fee-free first):\n`);
    for (const c of cands) {
      console.log(`  [${c.feeFree ? 'FREE' : `fee ${(c.feeRate * 100).toFixed(0)}%`}] id=${c.id} mid=${(c.mid * 100).toFixed(0)}¢ ${c.days}d vol=$${Math.round(c.volume24hr).toLocaleString()} | needGap=${(c.requiredGap * 100).toFixed(1)}¢`);
      console.log(`         ${c.question}`);
    }
    console.log('\nTo forecast one: research it, then');
    console.log('  node scripts/forecast.js record <id> <P(yes) 0..1> <confidence 0..1> "rationale"');
    return;
  }

  if (cmd === 'record') {
    const [, , , id, pStr, cStr, ...rest] = process.argv;
    const aiProb = Number(pStr), aiConfidence = Number(cStr), rationale = rest.join(' ');
    if (!id || !(aiProb >= 0 && aiProb <= 1) || !(aiConfidence >= 0 && aiConfidence <= 1)) {
      console.error('usage: record <id> <P(yes) 0..1> <confidence 0..1> "rationale"'); process.exit(1);
    }
    const cands = await selectCandidates({ max: 200 });
    let market = cands.find((c) => c.id === id);
    if (!market) {
      // fall back: build a minimal market record from the live list
      const ms = await liveMarkets({ limit: 600 });
      const m = ms.find((x) => String(x.id) === id);
      if (!m) { console.error('market not found / not live: ' + id); process.exit(1); }
      const bid = Number(m.bestBid), ask = Number(m.bestAsk), mid = (bid + ask) / 2;
      market = { id, question: m.question, category: m.category, mid, bid, ask,
        feeRate: m.feesEnabled === false ? 0 : 0.05, feeFree: m.feesEnabled === false,
        endDate: m.endDate, requiredGap: (ask - bid) / 2 + 0.02 };
    }
    const signal = tradeSignal({ aiProb, aiConfidence, market });
    const row = logForecast({ marketId: id, question: market.question, aiProb, aiConfidence, rationale, market, signal });
    console.log(`\nlogged forecast for: ${market.question}`);
    console.log(`  AI P(yes)=${(aiProb * 100).toFixed(0)}%  conf=${(aiConfidence * 100).toFixed(0)}%  | market mid=${(market.mid * 100).toFixed(0)}¢ (${market.feeFree ? 'fee-free' : 'fee ' + (market.feeRate * 100).toFixed(0) + '%'})`);
    console.log(`  SIGNAL: ${signal.action}  — ${signal.reason}`);
    console.log(`  (forward-logged to data/research/forecasts.jsonl; score at resolution with: forecast.js score)`);
    return;
  }

  if (cmd === 'score') {
    console.log(JSON.stringify(score(), null, 2));
    return;
  }

  console.error('unknown command: ' + cmd);
  process.exit(1);
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
