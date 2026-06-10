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
  'src/core/util.js', 'src/core/icons.js', 'src/core/store.js', 'src/core/registry.js', 'src/core/ui.js', 'src/core/rock.js', 'src/core/live.js', 'src/core/router.js',
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
// a Discover business-detail (the booking screen) + a chat thread
if (RW.api && RW.api.businesses && RW.api.businesses()[0]) routes.push('#/discover/' + RW.api.businesses()[0].id);
routes.push('#/chat/c1', '#/today', '#/account/help', '#/account/about');

routes.forEach((r) => {
  location.hash = r;
  try {
    RW.render();
    const html = elements.app ? elements.app.innerHTML : '';
    if (!html || html.length < 200) fail(r + ' rendered too little (' + html.length + ' chars)');
    else if (/undefined|\[object Object\]|NaN|native code|&amp;amp;|went wrong loading/.test(html)) fail(r + ' contains undefined/NaN/object/function/double-escape leakage');
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

// discover booking flow end-to-end → must surface on the Bookings tab.
// (These exact paths shipped broken once: discConfirm landed on an Activity
// screen whose array/object bug hid every booking.)
const pawBiz = RW.api.getBusiness && RW.api.getBusiness('biz-pc');
if (!pawBiz) fail('RW.api.getBusiness(biz-pc) missing');
else {
  const svc = pawBiz.services[0];
  act('discConfirm', { id: 'biz-pc', svc: svc.id, day: 'Tomorrow', dayiso: '2026-12-01', slot: '10:00' });
  if (!(RW.S.bookings || []).length) fail('discConfirm did not create a booking');
  else if (RW.S.bookings[0].whenIso !== '2026-12-01' || RW.S.bookings[0].slot !== '10:00') fail('booking missing whenIso/slot');
  else ok('booking created with slot data (' + RW.S.bookings[0].ref + ')');
  location.hash = '#/activity';
  RW.render();
  let aHtml = elements.app.innerHTML;
  if (aHtml.indexOf('Paws') === -1) fail('Activity does not show the new booking');
  else ok('Activity shows the booking');
  act('activityFilter', { v: 'bookings' });
  aHtml = elements.app.innerHTML;
  if (aHtml.indexOf('Paws') === -1) fail('Bookings filter hides the booking');
  else ok('Bookings filter keeps the booking visible');
  if (/native code/.test(aHtml)) fail('Activity leaks a stringified function');

  // Phase-3: double-booking prevention — same biz/day/slot must be rejected
  const beforeN = RW.S.bookings.length;
  act('discConfirm', { id: 'biz-pc', svc: svc.id, day: 'Tomorrow', dayiso: '2026-12-01', slot: '10:00' });
  if (RW.S.bookings.length !== beforeN) fail('double-booking not prevented');
  else ok('double-booking prevented (still ' + beforeN + ')');

  // Phase-3: cancel from Activity
  const bk = RW.S.bookings[0];
  act('activityOpen', { id: bk.id });
  act('activityCancel', { id: bk.id });
  if (bk.status !== 'Cancelled') fail('activityCancel did not cancel'); else ok('booking cancelled');

  // Phase-3: review write-back after a confirmed booking
  RW.S.bookings.push({ id: 'rvtest', ref: 'BK0000', t: Date.now(), bizId: 'biz-pc', bizName: 'Paws & Claws Grooming', service: 'Bath', price: '£22', when: 'x', whenIso: '2026-12-01', slot: '11:00', status: 'Confirmed' });
  location.hash = '#/discover/biz-pc'; RW.render();
  act('discRate', { id: 'biz-pc', r: '5' });
  act('discReview', { id: 'biz-pc' });
  if (!(RW.S.reviews || []).some((r) => r.bizId === 'biz-pc' && r.rating === 5)) fail('review write-back failed');
  else ok('review written (' + RW.S.reviews.length + ')');
  RW.render();
  if (elements.app.innerHTML.indexOf('Your review') === -1) fail('own review not shown on detail');
  else ok('own review shown on detail');

  // Phase-3: business accept syncs the customer booking status
  RW.S.myBusiness = { id: 'mybiz', name: 'Test Co', category: 'Pets', emoji: '🐾', area: 'Town', rating: 'New', reviews: 0, services: [{ id: 'ms1', name: 'Trim', price: 10, durationMin: 30 }], blocked: [], t: Date.now() };
  RW.S.bizBookings = [{ id: 'sync1', ref: 'BK9', t: Date.now(), customer: 'Lucia', service: 'Trim', when: 'x', whenIso: '2026-12-02', slot: '09:00', status: 'Requested' }];
  RW.S.bookings.push({ id: 'sync1', ref: 'BK9', t: Date.now(), bizId: 'mybiz', bizName: 'Test Co', service: 'Trim', price: '£10', when: 'x', whenIso: '2026-12-02', slot: '09:00', status: 'Requested' });
  act('bizAccept', { id: 'sync1' });
  const synced = RW.S.bookings.filter((b) => b.id === 'sync1')[0];
  if (RW.S.bizBookings[0].status !== 'Confirmed' || !synced || synced.status !== 'Confirmed') fail('accept did not sync both sides');
  else ok('accept synced owner + customer');
  RW.S.myBusiness = null; RW.S.bizBookings = [];
}

// property detail must be reachable via its action (RW.navigate bug shipped once)
act('propertyView', { id: 'p-ov-r1' });
RW.render();
const pHtml = elements.app.innerHTML;
if (!pHtml || pHtml.length < 500) fail('property detail did not render after propertyView');
else ok('property detail reachable (' + pHtml.length + ' chars)');

// the user's published business must appear in Discover
RW.S.myBusiness = { id: 'mybiz', name: 'Test Grooming Co', category: 'Pets', emoji: '🐾', area: 'Town', rating: 'New', reviews: 0, services: [{ id: 'ms1', name: 'Trim', price: 10, durationMin: 30 }], t: Date.now() };
location.hash = '#/discover';
RW.render();
const dHtml = elements.app.innerHTML;
if (dHtml.indexOf('Test Grooming Co') === -1) fail('published business missing from Discover');
else ok('published business appears in Discover');
if (!RW.api.getBusiness('mybiz')) fail('getBusiness cannot resolve the published business');
else ok('getBusiness resolves the published business');
RW.S.myBusiness = null;

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
