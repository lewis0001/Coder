/* Rockway — shared cross-feature data & read APIs (RW.api).
 * Loaded first (after core). Holds genuinely cross-cutting Gibraltar data:
 * weather, local offers, and the community-driven frontier model.
 *
 * Frontier note: Gibraltar has NO official wait-time data feed — only live
 * cameras. So Rockway models the border honestly: official camera link-outs
 * plus user-submitted crowd reports (RW.S.frontierReports). Any colour/word is
 * derived from recent community reports, or a clearly-labelled "typical for this
 * time" heuristic when no fresh report exists. We never invent a precise figure. */
(function (RW) {
  'use strict';
  RW.api = RW.api || {};

  // ---- Weather + the famous Levante (Levanter) cloud over the Rock ----
  const weather = {
    tempC: 21, condition: 'Levanter cloud over the Rock', emoji: '🌥️',
    windKt: 14, windDir: 'E (Levante)', seaState: 'Slight', high: 23, low: 17,
  };
  RW.api.weather = () => weather;

  // ---- Home offer/feature cards (local-business themed) ----
  const offers = [
    { id: 'o1', title: 'List your business free', sub: 'Reach the whole Rock in minutes', emoji: '🏪', accent: '#D4112A', route: '#/business' },
    { id: 'o2', title: 'Book local, in seconds', sub: 'Groomers, salons, trades & more', emoji: '📅', accent: '#0a9d4a', route: '#/discover' },
    { id: 'o3', title: 'How’s the Focona?', sub: 'Live cameras + community reports', emoji: '🛂', accent: '#1455c0', route: '#/frontier' },
  ];
  RW.api.offers = () => offers;

  // ---- Frontier model (community-driven; honest about data) ----
  const lanes = [
    { id: 'in-car', label: 'Into Gibraltar · Car', emoji: '🚗' },
    { id: 'out-car', label: 'To Spain · Car', emoji: '🚗' },
    { id: 'in-foot', label: 'Into Gibraltar · On foot', emoji: '🚶' },
    { id: 'out-foot', label: 'To Spain · On foot', emoji: '🚶' },
  ];
  const cameras = [
    { id: 'cam-veh', label: 'Vehicle lanes (6 + motorcycle)', url: 'https://frontierqueue.gi/' },
    { id: 'cam-ped', label: 'Pedestrian crossing', url: 'https://frontierqueue.gi/' },
    { id: 'cam-agg', label: 'GoGoGibraltar overview', url: 'https://www.gogogibraltar.com/' },
  ];
  const LEVELS = ['green', 'amber', 'red'];
  const word = (lvl) => (lvl === 'green' ? 'Flowing' : lvl === 'amber' ? 'Busy' : 'Heavy');
  // backward-compatible: accepts a level string, or a number of minutes
  function level(v) {
    if (typeof v === 'string') return LEVELS.indexOf(v) > -1 ? v : 'amber';
    return v <= 12 ? 'green' : v <= 30 ? 'amber' : 'red';
  }
  // "typical for this time" heuristic (labelled as such; NOT a live figure)
  function typical(hour) {
    const h = typeof hour === 'number' ? hour : new Date().getHours();
    const peak = Math.exp(-Math.pow(h - 8, 2) / 3) + Math.exp(-Math.pow(h - 18, 2) / 4);
    return peak > 0.6 ? 'red' : peak > 0.25 ? 'amber' : 'green';
  }
  // Aggregate recent community reports (last 90 min). Falls back to typical().
  function community(laneId) {
    const cutoff = Date.now() - 90 * 60000;
    const reports = (RW.S.frontierReports || [])
      .filter((r) => r.t >= cutoff && (!laneId || r.lane === laneId))
      .sort((a, b) => b.t - a.t);
    if (reports.length) {
      // weight most recent report most heavily
      const lvl = reports[0].level;
      return { level: lvl, word: word(lvl), count: reports.length, fresh: true,
        lastNote: reports[0].note || '', t: reports[0].t };
    }
    const lvl = typical();
    return { level: lvl, word: word(lvl), count: 0, fresh: false, lastNote: '', t: null };
  }
  RW.api.frontier = {
    lanes, cameras, level, word, typical, community,
    tips: [
      'Mornings (07:00–09:00) and evenings (17:00–19:00) are heaviest for cars.',
      'On foot is almost always faster than by car at peak times.',
      'Since the Kingsway tunnel opened, cars no longer stop for aircraft — only pedestrians/cyclists do.',
      'Spanish public holidays and cruise-ship days change the queues — check a recent report.',
    ],
  };
})(window.RW);
