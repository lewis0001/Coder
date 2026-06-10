/* Rockway feature — Map (interactive map of the Rock: business pins + landmarks).
 * Lazy-loads Leaflet 1.9.4 from the unpkg CDN on first visit (no API key) and
 * draws OpenStreetMap raster tiles with proper attribution. Pins are honest
 * approximate AREA anchors (Rockway holds no street addresses), labelled as
 * such. Offline / file:// / sandbox: renders a quiet fallback, never crashes. */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  var LEAFLET_CSS = 'vendor/leaflet/leaflet.css'; // self-hosted (SW-cacheable, no CDN dependency)
  var LEAFLET_JS = 'vendor/leaflet/leaflet.js';
  var OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  var GMAPS_URL = 'https://www.google.com/maps/place/Gibraltar/@36.135,-5.35,14z';
  var OSM_URL = 'https://www.openstreetmap.org/#map=15/36.1350/-5.3500';

  // ---- module state (none of this persists — by design) ----
  var leafletState = 'idle'; // idle | loading | ready | fail
  var mapObj = null;         // live Leaflet map instance
  var mapEl = null;          // the container element it was initialised on
  var show = { biz: true, marks: true };

  // Approximate centre points for the areas used by Discover businesses.
  var ANCHORS = {
    'Main Street': [36.1408, -5.3536],
    'Casemates': [36.1447, -5.3526],
    'Irish Town': [36.1430, -5.3539],
    'Ocean Village': [36.1486, -5.3552],
    'Marina Bay': [36.1472, -5.3565],
    'Westside': [36.1520, -5.3576],
    'Catalan Bay': [36.1325, -5.3404],
    'Sandy Bay': [36.1247, -5.3415],
    'Europa Point': [36.1093, -5.3461],
    'Upper Rock': [36.1300, -5.3450],
    'Industrial Estate': [36.1500, -5.3580],
    'Town Centre': [36.1408, -5.3536],
    'Frontier': [36.1547, -5.3505],
    'Airport crossing': [36.1512, -5.3498],
  };

  // Curated landmarks (see explore.js / docs/gibraltar-research.md).
  var LANDMARKS = [
    { name: 'Frontier crossing', at: [36.1547, -5.3505], note: 'Walk-through land border with Spain — bring your passport.' },
    { name: 'Airport runway crossing', at: [36.1512, -5.3498], note: 'The road into town crosses a live runway — barriers close for flights.' },
    { name: 'Casemates Square', at: [36.1447, -5.3526], note: 'Gibraltar’s main square — cafés, events and the start of Main Street.' },
    { name: 'St Michael’s Cave', at: [36.1262, -5.3486], note: 'Cathedral-scale limestone grotto and concert venue inside the Rock.' },
    { name: 'Great Siege Tunnels', at: [36.1480, -5.3450], note: 'Defence galleries carved by hand, 1779–83.' },
    { name: 'Moorish Castle', at: [36.1457, -5.3486], note: 'Tower of Homage, standing since c. 1333.' },
    { name: 'Europa Point lighthouse', at: [36.1093, -5.3461], note: 'Southernmost tip — Morocco is 14 km across the Strait.' },
    { name: 'Catalan Bay', at: [36.1325, -5.3404], note: 'Fishing-village beach below the east face of the Rock.' },
    { name: 'Skywalk', at: [36.1278, -5.3438], note: 'Glass viewing platform at 340 m, higher than the Shard.' },
  ];

  // ---- lazy Leaflet injection (once per session) ----
  function injectLeaflet() {
    if (leafletState !== 'idle') return;
    leafletState = 'loading';
    try {
      var head = document.head || document.body;
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      var js = document.createElement('script');
      js.src = LEAFLET_JS;
      js.onload = function () {
        leafletState = window.L ? 'ready' : 'fail';
        RW.render();
      };
      js.onerror = function () { leafletState = 'fail'; RW.render(); };
      head.appendChild(css);
      head.appendChild(js);
      // Belt and braces: if neither callback fired (blocked CDN), settle it.
      setTimeout(function () {
        if (leafletState === 'loading') {
          leafletState = window.L ? 'ready' : 'fail';
          RW.render();
        }
      }, 12000);
    } catch (e) {
      leafletState = 'fail';
    }
  }

  // ---- pin layers (all Leaflet work stays inside try/catch via initMap) ----
  // Deterministic tiny jitter (±0.0006°) so same-area pins do not stack.
  function jitter(i, k) { return ((((i + 1) * k) % 13) - 6) * 0.0001; }

  function bizLayer(L) {
    var g = L.layerGroup();
    var list = (RW.api && RW.api.businesses) ? (RW.api.businesses() || []) : [];
    list.forEach(function (b, i) {
      var at = ANCHORS[b.area];
      if (!at) return;
      // Brand red — existing palette var(--brand); Leaflet SVG needs the hex.
      var mk = L.circleMarker([at[0] + jitter(i, 37), at[1] + jitter(i, 53)],
        { radius: 6, color: '#d4112a', weight: 2, fillColor: '#d4112a', fillOpacity: 0.75 });
      mk.bindPopup('<strong>' + esc(b.name) + '</strong><br>' +
        esc(b.category || 'Business') + ' · ' + esc(b.area || 'Gibraltar') + ' (approx.)<br>' +
        '<a href="#/discover/' + esc(b.id) + '">Open</a>');
      mk.addTo(g);
    });
    return g;
  }

  function landmarkLayer(L) {
    var g = L.layerGroup();
    LANDMARKS.forEach(function (m) {
      // Ink — existing palette var(--ink); hex needed for the SVG marker.
      var mk = L.circleMarker(m.at, { radius: 6, color: '#14181f', weight: 2, fillColor: '#14181f', fillOpacity: 0.75 });
      mk.bindPopup('<strong>' + esc(m.name) + '</strong><br>' + esc(m.note) + '<br>' +
        '<a href="#/explore">Explore</a>');
      mk.addTo(g);
    });
    return g;
  }

  // Initialise (or re-initialise) the map on the current #rock-map element.
  // The router rebuilds the DOM on every render, so when the user navigates
  // away and back the element changes — we detect that and re-init, carrying
  // the previous view across. No-ops if already live on this element.
  function initMap() {
    var el = document.getElementById('rock-map');
    if (!el || !window.L) return;
    if (mapObj && mapEl === el) return;
    var view = null;
    if (mapObj) {
      try { view = { c: mapObj.getCenter(), z: mapObj.getZoom() }; } catch (e) {}
      try { mapObj.remove(); } catch (e) {}
      mapObj = null;
      mapEl = null;
    }
    try {
      var L = window.L;
      var m = L.map(el, { scrollWheelZoom: false });
      if (view && view.c) m.setView([view.c.lat, view.c.lng], view.z);
      else m.setView([36.135, -5.350], 14);
      L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 18 }).addTo(m);
      if (show.biz) bizLayer(L).addTo(m);
      if (show.marks) landmarkLayer(L).addTo(m);
      mapObj = m;
      mapEl = el;
    } catch (e) {
      mapObj = null;
      mapEl = null;
    }
  }

  // ---- view pieces ----
  // Two independent on/off toggles, so RW.ui.chips (single-select) does not
  // fit — same .chip.tap/.on classes, ink when active (§5).
  function layerChips() {
    var nBiz = (RW.api && RW.api.businesses) ? (RW.api.businesses() || []).length : 0;
    function chip(label, n, key, on) {
      return '<span class="chip tap' + (on ? ' on' : '') + '" data-act="mapLayer" data-v="' + key + '">' +
        label + (n ? ' · <span class="num">' + n + '</span>' : '') + '</span>';
    }
    return '<div class="chips" style="margin-bottom:12px">' +
      chip('Businesses', nBiz, 'biz', show.biz) +
      chip('Landmarks', LANDMARKS.length, 'marks', show.marks) + '</div>';
  }

  function honestyLine() {
    return '<div class="muted tiny" style="margin-top:8px">Pins are approximate area markers · Map data © OpenStreetMap contributors</div>';
  }

  function linkoutRow() {
    return '<div class="chips" style="margin-top:8px">' +
      '<a class="chip" href="' + GMAPS_URL + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">Google Maps ↗</a>' +
      '<a class="chip" href="' + OSM_URL + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">OpenStreetMap ↗</a>' +
      '</div>';
  }

  function fallbackCard() {
    return '<div class="card">' +
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">' +
      '<div style="font-size:24px">🗺️</div><div style="flex:1">' +
      '<div style="font-weight:700;font-size:14px">The map needs a connection</div>' +
      '<div class="muted tiny">Map tiles come from OpenStreetMap and could not load right now. These open the same view externally:</div>' +
      '</div></div>' + linkoutRow() + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">Gibraltar is 6.8 km² — the whole Rock fits on one screen at zoom 14.</div>';
  }

  function render() {
    injectLeaflet();
    var body = '<div class="muted tiny" style="margin-bottom:10px">Businesses & landmarks across Gibraltar, on one map.</div>';
    if (leafletState === 'fail') {
      body += RW.ui.sectionTitle('Map of the Rock') + fallbackCard();
    } else if (leafletState === 'ready' && window.L) {
      body += layerChips() +
        '<div id="rock-map" style="height:420px;border-radius:16px;overflow:hidden;position:relative;z-index:0;background:var(--mist)"></div>' +
        honestyLine() + linkoutRow();
      // Leaflet needs the container in the document; the router writes our
      // HTML right after render() returns, so init on the next tick.
      try { setTimeout(initMap, 0); } catch (e) {}
    } else {
      // loading (or sandboxed environment where the script never arrives)
      body += RW.ui.sectionTitle('Map of the Rock') +
        '<div class="skel" style="height:420px;border-radius:16px">Loading the Rock…</div>' +
        honestyLine();
    }
    return RW.ui.screen({ title: 'Map', body: body });
  }

  RW.register({
    id: 'map', title: 'Map', emoji: '🗺️', tileBg: '#e6effc', section: 'explore', order: 15, render: render,
    actions: {
      mapLayer: function (el) {
        var k = el.dataset.v;
        if (k === 'biz') show.biz = !show.biz;
        else if (k === 'marks') show.marks = !show.marks;
        RW.render(); // rebuilds the container → initMap re-inits with the new layers
      },
    },
  });

  // Ask Rockway: map intent
  RW.registerSearch(function (q) {
    if (q.indexOf('map') > -1 || q.indexOf('where is') > -1) {
      return [{ group: 'Explore', label: 'Map of the Rock', sub: 'Business & landmark pins · OpenStreetMap', route: '#/map', lead: '🗺️' }];
    }
    return [];
  });
})(window.RW);
