/* Rockway core — feature registry + action bus.
 *
 * This is the heart of the plugin architecture. Each feature module calls
 * RW.register({...}) once at load. The home grid, router and action bus are
 * all driven from what is registered — so new features appear automatically
 * with zero edits to core files. This is what lets multiple agents build
 * features in parallel without collisions.
 *
 * ───────────────────────── FEATURE MODULE CONTRACT ─────────────────────────
 * RW.register({
 *   id:       'discover',         // unique; also the first route segment (#/discover)
 *   title:    'Discover',         // shown on tile + top bar
 *   emoji:    '🔎',
 *   tileBg:   '#fde7ea',          // home tile icon background
 *   section:  'daily',            // 'daily' | 'money' | 'services' | 'explore'
 *   order:    10,                 // sort order within section
 *   showTile: true,               // appears on home grid (default true)
 *   render:   function(parts){ return htmlString; },  // parts = segments after id
 *   homeCard: function(){ return htmlString|''; },    // optional home widget
 *   homeOrder:10,                 // optional, sort for homeCard
 *   actions:  { actName: function(el, ev){...} },     // optional action handlers
 * });
 *
 * render() should return a full screen via RW.ui.screen(...) helpers.
 * Persist state through RW.S + RW.store.save() (new fields must exist in
 * store.js defaults(); guard reads with || []). There are NO payments/wallet —
 * bookings are free requests. After mutating state call RW.render() to refresh.
 * ───────────────────────────────────────────────────────────────────────── */
(function (RW) {
  'use strict';
  const features = [];
  const byId = {};
  const actions = {};

  RW.register = function (def) {
    if (!def || !def.id) return;
    if (byId[def.id]) { console.warn('Rockway: duplicate feature', def.id); return; }
    if (def.showTile == null) def.showTile = true;
    if (def.section == null) def.section = 'daily';
    if (def.order == null) def.order = 100;
    byId[def.id] = def;
    features.push(def);
    if (def.actions) Object.keys(def.actions).forEach((k) => { actions[k] = def.actions[k]; });
  };

  // Register a standalone action handler (alternative to def.actions).
  RW.action = function (name, fn) { actions[name] = fn; };

  RW.getFeature = (id) => byId[id];
  RW.allFeatures = () => features.slice();
  RW.tiles = () => features.filter((f) => f.showTile).sort((a, b) => a.order - b.order);
  RW.homeCards = () => features.filter((f) => typeof f.homeCard === 'function')
    .sort((a, b) => (a.homeOrder || a.order) - (b.homeOrder || b.order));
  RW.getAction = (name) => actions[name];

  RW.SECTIONS = [
    { id: 'daily', label: 'Daily life' },
    { id: 'money', label: 'Money' },
    { id: 'services', label: 'Services' },
    { id: 'explore', label: 'Explore & connect' },
  ];

  /* ---------------- global search ----------------
   * Features register a provider: fn(q) -> [{ group, label, sub, route, lead }]
   * where q is the lower-cased query. Providers must be cheap and never throw
   * (searchAll guards anyway). The #/search surface renders grouped results. */
  const searchProviders = [];
  RW.registerSearch = (fn) => searchProviders.push(fn);
  RW.searchAll = (q) => {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 2) return [];
    let out = [];
    searchProviders.forEach((fn) => {
      try { out = out.concat(fn(q) || []); } catch (e) {}
    });
    return out.slice(0, 60);
  };
})(window.RW);
