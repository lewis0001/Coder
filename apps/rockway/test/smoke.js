/* Rockway headless smoke test — no browser, no deps.
 * Loads core + every feature module under a minimal DOM shim, then renders
 * every registered route and exercises key actions, asserting no crashes.
 * Run: node test/smoke.js   (exit 0 = pass).  Keep this green after changes. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let failures = 0;
const fail = (m) => { console.error('  ✗ ' + m); failures++; };
const ok = (m) => console.log('  ✓ ' + m);

/* ---------------- minimal DOM shim ---------------- */
function makeEl() {
  const el = {
    _html: '', dataset: {}, style: {}, _cls: new Set(), children: [],
    set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; },
    set textContent(v) { this._html = String(v); }, get textContent() { return this._html; },
    classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    closest() { return makeEl(); },
    scrollTop: 0, focus() {}, value: '',
  };
  return el;
}
const elements = {};
const document = {
  readyState: 'complete',
  getElementById(id) { return (elements[id] = elements[id] || makeEl()); },
  createElement() { return makeEl(); },
  querySelector(sel) { if (sel === '.phone') return makeEl(); return makeEl(); },
  querySelectorAll() { return []; },
  addEventListener() {},
  head: makeEl(), body: makeEl(),
};
const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const location = { hash: '#/' };
const sandbox = {
  window: {}, document, localStorage, location, console,
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  requestAnimationFrame: (fn) => { try { fn(); } catch (e) {} return 0; },
  addEventListener() {}, removeEventListener() {},
  Math, Date, JSON, Object, Array, parseInt, parseFloat, Set, Map, isNaN, String, Number, Boolean,
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

/* ---------------- load core + features ---------------- */
const FILES = [
  'src/core/util.js', 'src/core/store.js', 'src/core/registry.js', 'src/core/ui.js', 'src/core/rock.js', 'src/core/router.js',
];
// derive feature list from boot manifest so test stays in sync
const boot = fs.readFileSync(path.join(ROOT, 'src/core/boot.js'), 'utf8');
const manifest = (boot.match(/'src\/features\/[^']+'/g) || []).map((s) => s.replace(/'/g, ''));

let loaded = 0;
FILES.concat(manifest).forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log('  · skip (not built yet) ' + rel); return; }
  try {
    vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: rel });
    loaded++;
  } catch (e) { fail('load ' + rel + ' → ' + e.message); }
});
console.log('Loaded ' + loaded + ' module(s).');

const RW = sandbox.window.RW;
if (!RW) { console.error('FATAL: RW namespace missing'); process.exit(1); }
RW.userEmail = 'hello@rockway.gi';

/* ---------------- render every route ---------------- */
console.log('\nRendering routes:');
const features = RW.allFeatures();
const routes = ['#/', '#/activity', '#/account', '#/discover', '#/business'];
features.forEach((f) => { if (f.showTile) routes.push('#/' + f.id); });
// a Discover business-detail (the booking screen)
if (RW.api && RW.api.businesses && RW.api.businesses()[0]) routes.push('#/discover/' + RW.api.businesses()[0].id);

routes.forEach((r) => {
  location.hash = r;
  try {
    RW.render();
    const html = elements.app ? elements.app.innerHTML : '';
    if (!html || html.length < 200) fail(r + ' rendered too little (' + html.length + ' chars)');
    else if (/undefined|\[object Object\]|NaN/.test(html)) fail(r + ' contains undefined/NaN/object leakage');
    else ok(r + ' (' + html.length + ' chars)');
  } catch (e) { fail(r + ' threw → ' + e.message); }
});

/* ---------------- exercise key actions ---------------- */
console.log('\nExercising actions:');
function act(name, dataset) {
  const h = RW.getAction(name) || (RW.getBuiltin && RW.getBuiltin(name)) || ({ nav() {}, back() {}, toast() {} }[name]);
  const el = makeEl(); el.dataset = dataset || {};
  if (!h) { fail('no handler for action ' + name); return; }
  try { h(el, {}); ok('action ' + name); } catch (e) { fail('action ' + name + ' → ' + e.message); }
}
// frontier community report flow
location.hash = '#/frontier';
const beforeReports = (RW.S.frontierReports || []).length;
act('frontierLevel', { v: 'red' });
act('frontierReport', {});
if ((RW.S.frontierReports || []).length <= beforeReports) fail('frontier report not recorded');
else ok('frontier report recorded (' + RW.S.frontierReports.length + ')');
act('setLang', { v: 'yan' });
if (RW.S.lang !== 'yan') fail('setLang did not persist'); else ok('setLang works');

// top-level content feeds must not render empty on fresh state (catches
// default-filter regressions like the news getFilter bug)
console.log('\nFeed sanity (fresh state):');
['news', 'jobs', 'marketplace', 'explore', 'events', 'frontier'].forEach((id) => {
  location.hash = '#/' + id;
  RW.render();
  const html = (elements.app && elements.app.innerHTML) || '';
  if (/No stories|No vacancies|No listings|match your filters/i.test(html)) fail(id + ' feed renders empty on fresh state');
  else ok(id + ' feed has content');
});

/* ---------------- summary ---------------- */
console.log('\n' + (failures ? '✗ ' + failures + ' failure(s)' : '✓ all checks passed') + '  ·  ' + features.length + ' features registered');
process.exit(failures ? 1 : 0);
