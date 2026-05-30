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
 *   id:       'eat',              // unique; also the first route segment (#/eat)
 *   title:    'Eat',              // shown on tile + top bar
 *   emoji:    '🍔',
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
 * Persist state through RW.S + RW.store.save(). Move money only via
 * RW.store.debit/credit. After mutating state call RW.render() to refresh.
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
})(window.RW);
