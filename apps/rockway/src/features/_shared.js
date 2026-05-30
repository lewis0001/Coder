/* Rockway — shared cross-feature data & read APIs (RW.api).
 * Loaded first (after core) so other features can publish into / read from it.
 * Holds genuinely cross-cutting Gibraltar data: weather, promos, the frontier
 * model, and a catalog registry the cart uses to resolve item keys. */
(function (RW) {
  'use strict';
  RW.api = RW.api || {};

  // ---- Weather + the famous Levante (Levanter) cloud over the Rock ----
  const weather = {
    tempC: 21, condition: 'Levanter cloud over the Rock', emoji: '🌥️',
    windKt: 14, windDir: 'E (Levante)', seaState: 'Slight', high: 23, low: 17,
  };
  RW.api.weather = () => weather;

  // ---- Home promo cards ----
  const promos = [
    { id: 'pr1', title: '£5 off your first food order', sub: 'Code ROCK5 · auto-applied', emoji: '🍔', accent: '#D4112A' },
    { id: 'pr2', title: 'Free delivery on groceries', sub: 'Orders over £25 this week', emoji: '🛒', accent: '#0a9d4a' },
    { id: 'pr3', title: 'Skip the frontier guesswork', sub: 'Live border times, every minute', emoji: '🛂', accent: '#1455c0' },
  ];
  RW.api.promos = () => promos;

  // ---- Frontier model (shared by home banner + frontier feature) ----
  const lanes = [
    { id: 'in-car', label: 'Entering Gibraltar · Car', base: 22, emoji: '🚗' },
    { id: 'out-car', label: 'Leaving to Spain · Car', base: 14, emoji: '🚗' },
    { id: 'in-foot', label: 'Entering Gibraltar · On foot', base: 8, emoji: '🚶' },
    { id: 'out-foot', label: 'Leaving to Spain · On foot', base: 5, emoji: '🚶' },
  ];
  function wait(lane) {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const peak = Math.exp(-Math.pow(h - 8, 2) / 3) + Math.exp(-Math.pow(h - 18, 2) / 4);
    const carFactor = lane.id.indexOf('car') > -1 ? 1 : 0.4;
    const dir = lane.id.indexOf('in') === 0 ? 1.15 : 0.85;
    const noise = (Math.sin(now.getMinutes() / 7 + lane.base) + 1) * 4;
    return Math.max(1, Math.round(lane.base * (0.5 + peak * 1.4) * carFactor * dir + noise));
  }
  const level = (m) => (m <= 12 ? 'green' : m <= 30 ? 'amber' : 'red');
  const word = (m) => (m <= 12 ? 'Flowing' : m <= 30 ? 'Busy' : 'Heavy');
  RW.api.frontier = {
    lanes, wait, level, word,
    tips: [
      'Mornings (07:00–09:00) and evenings (17:00–19:00) are heaviest for cars.',
      'On foot is almost always faster than by car at peak times.',
      'Spanish public holidays often mean lighter queues leaving Gibraltar.',
      'Cruise ship days add foot traffic around midday.',
    ],
  };

  // ---- Catalog registry: lets the cart resolve item keys "type:vid:iid" ----
  RW.api._catalog = {};
  RW.api.registerCatalog = (type, fn) => { RW.api._catalog[type] = fn; };
  RW.api.catalogItem = (type, vid, iid, key) => {
    const f = RW.api._catalog[type];
    return f ? f(vid, iid, key) : null;
  };
})(window.RW);
