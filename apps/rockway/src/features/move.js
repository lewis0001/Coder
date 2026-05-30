/* Rockway feature — Move (transport). Grounded in real Gibraltar:
 * - Buses: Gibraltar Bus Company (1–4, 7–9) + Calypso Route 5 frontier shuttle;
 *   residents/commuters travel FREE; live tracker track.bus.gi.
 * - Taxi: Gibraltar Taxi Association only (no Uber) — ranks + phone + rock tours.
 * - Cable car: CLOSED for refurbishment, reopening ~2027.
 * - Ferry: FRS Tangier Med, sporadic (~1–2×/week, often Fridays).
 * - Runway crossing: pedestrian/cyclist at-grade status (cars use the Kingsway tunnel). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  // ---- Seed data ----
  // Route 5 (Calypso) is the ONLY route serving both the frontier and airport.
  // Route 3 and 9 both serve the Air Terminal. Destinations from gibraltarbuscompany.gi.
  const buses = [
    { n: '5',  op: 'Calypso', dest: 'Frontier ↔ Airport ↔ Market Place', color: '#c0392b', every: 15,  next: [3, 18, 33],  note: 'Only route: frontier + airport' },
    { n: '3',  op: 'GBC',     dest: 'Air Terminal ↔ Europa Point',        color: '#0a7d34', every: 20,  next: [7, 27, 47],  note: null },
    { n: '4',  op: 'GBC',     dest: 'Rosia ↔ Both Worlds',                color: '#1455c0', every: 20,  next: [6, 26, 46],  note: null },
    { n: '1',  op: 'GBC',     dest: 'Moorish Castle Estate / Upper Town',  color: '#7d3c98', every: 20,  next: [11, 31, 51], note: null },
    { n: '2',  op: 'GBC',     dest: 'Referendum House ↔ Willis\'s Road',  color: '#8e44ad', every: 20,  next: [9, 29, 49],  note: null },
    { n: '7',  op: 'GBC',     dest: 'Frontier ↔ Reclamation Rd',          color: '#d68910', every: 15,  next: [4, 19, 34],  note: null },
    { n: '8',  op: 'GBC',     dest: 'Frontier ↔ Europa Point',            color: '#1a7fbf', every: 30,  next: [21, 51],     note: null },
    { n: '9',  op: 'GBC',     dest: 'Air Terminal ↔ Market Place',        color: '#27ae60', every: 20,  next: [12, 32, 52], note: null },
  ];

  const taxiRanks = [
    { name: 'Grand Casemates Square', note: 'main city rank',              emoji: '🏛️' },
    { name: 'Cathedral Square',       note: 'Main Street',                  emoji: '⛪' },
    { name: 'Airport',                note: 'arrivals forecourt',           emoji: '✈️' },
    { name: 'Frontier',               note: 'la focona — Spain side',       emoji: '🛂' },
    { name: 'Cruise Terminal',        note: 'when ships in port',           emoji: '🚢' },
  ];

  // In-memory filter: 'all' | 'bus' | 'taxi' | 'other'
  var activeFilter = 'all';

  // Simulated runway crossing state.
  // In a live app this would be fetched from an airport API.
  // Pedestrians/cyclists only — cars use the Kingsway tunnel (opened 31 Mar 2023).
  var runwayCrossing = { open: true, note: 'No aircraft movement' };

  // ---- Helpers ----
  function numSpan(val) {
    return '<span class="num">' + esc(String(val)) + '</span>';
  }

  function crossingPill() {
    if (runwayCrossing.open) {
      return '<span class="pill-status ok">🚶 Open</span>';
    }
    return '<span class="pill-status warn">✈️ Closed — aircraft</span>';
  }

  // ---- Section builders ----
  function buildStats() {
    return '<div class="grid2" style="margin-top:8px;margin-bottom:4px">' +
      '<div class="stat">' +
        '<div class="n" style="color:var(--green)">FREE</div>' +
        '<div class="l">Buses for residents, commuters &amp; military</div>' +
      '</div>' +
      '<div class="stat">' +
        '<div class="n" style="font-size:13px;line-height:1.25;margin-top:2px">' + crossingPill() + '</div>' +
        '<div class="l" style="margin-top:6px">Runway crossing · 🚶🚲 only<br>' +
          '<span class="num" style="font-size:11px;color:var(--ash)">Cars → Kingsway tunnel</span></div>' +
      '</div>' +
    '</div>';
  }

  function buildBuses() {
    // Group: Calypso first (key tourist/commuter route), then GBC
    var calypso = buses.filter(function (b) { return b.op === 'Calypso'; });
    var gbc     = buses.filter(function (b) { return b.op === 'GBC'; });
    var ordered = calypso.concat(gbc);

    var rows = ordered.map(function (b) {
      var nextMins = b.next.map(function (n) { return numSpan(n) + '′'; });
      var isCalypso = b.op === 'Calypso';
      var opBadge = isCalypso
        ? '<span class="pill-status info" style="font-size:10.5px;padding:2px 7px;margin-right:4px">Calypso</span>'
        : '<span style="color:var(--ash);font-size:11.5px;font-weight:600">GBC</span>';
      var noteBit = b.note
        ? ' · <span style="color:var(--brand);font-size:10.5px;font-weight:700">' + esc(b.note) + '</span>'
        : '';

      return '<div class="row">' +
        '<div class="lead" style="background:' + b.color + '1f;color:' + b.color + ';font-weight:900;font-size:15px;border-radius:12px;flex:0 0 auto;width:40px;height:40px;display:grid;place-items:center">' +
          esc(b.n) +
        '</div>' +
        '<div class="body">' +
          '<div class="name" style="font-size:13.5px">' + esc(b.dest) + '</div>' +
          '<div class="sub" style="margin-top:3px;line-height:1.5">' +
            opBadge +
            ' · every ' + numSpan(b.every) + ' min' +
            noteBit +
          '</div>' +
        '</div>' +
        '<div class="trail" style="text-align:right;min-width:68px">' +
          '<div style="color:var(--green);font-weight:900;font-size:17px">' + nextMins[0] + '</div>' +
          '<div class="muted tiny" style="margin-top:2px">then ' + nextMins.slice(1).join(', ') + '</div>' +
        '</div>' +
      '</div>';
    });

    return RW.ui.sectionTitle('Buses', 'track.bus.gi ↗', '#/move') +
      '<div class="card">' + rows.join('') + '</div>' +
      '<div class="muted tiny" style="margin-top:8px;line-height:1.65;padding:0 2px">' +
        'Adult single <span class="num">£1.80</span> · ' +
        'Day pass <span class="num">£2.50</span> · ' +
        'Child <span class="num">£1.50</span> / <span class="num">£2.00</span> · ' +
        'Pensioner <span class="num">£1.00</span> / <span class="num">£1.50</span> · ' +
        'Residents, commuters &amp; military travel <strong>free</strong> · ' +
        'Hopper day pass available online.' +
      '</div>';
  }

  function buildTaxis() {
    var rankChips = taxiRanks.map(function (r) {
      return '<span class="chip">' + r.emoji + ' <strong>' + esc(r.name) + '</strong>' +
        '<span class="muted" style="font-weight:500;margin-left:4px">— ' + esc(r.note) + '</span></span>';
    }).join('');

    return RW.ui.sectionTitle('Taxis — Gibraltar Taxi Association') +
      '<div class="card">' +
        '<div class="muted tiny" style="margin-bottom:12px;line-height:1.65">' +
          'Gibraltar has one licensed taxi service — the <strong>GTA</strong>. ' +
          'No Uber, Bolt or ride-hailing. ' +
          'Metered fares set by government (Taxi Fares Regulations 2022 · updated 2025). ' +
          'Base ~<span class="num">£3–4</span> · ~<span class="num">£2–3</span>/km. ' +
          'Agree fare upfront for airport &amp; tour runs.' +
        '</div>' +
        '<div class="chips" style="margin-bottom:14px">' + rankChips + '</div>' +
        '<div class="grid2" style="margin-bottom:12px">' +
          '<button class="btn sea" data-act="taxiCall">📞 Call GTA</button>' +
          '<button class="btn ghost" data-act="taxiTour">🪨 Book Rock tour</button>' +
        '</div>' +
        '<div style="border-top:1px solid var(--mist);padding-top:10px">' +
          RW.ui.sectionTitle('Rock tour pricing') +
          '<div class="grid2" style="margin-top:0">' +
            '<div class="stat">' +
              '<div class="n" style="font-size:16px;color:var(--sea)"><span class="num">£22–25</span></div>' +
              '<div class="l">Shared · per person<br>up to ~8 people</div>' +
            '</div>' +
            '<div class="stat">' +
              '<div class="n" style="font-size:16px;color:var(--sea)"><span class="num">£360</span></div>' +
              '<div class="l">Private · up to 6<br>Nature Reserve incl.</div>' +
            '</div>' +
          '</div>' +
          '<div class="muted tiny" style="margin-top:8px;line-height:1.55">' +
            'VIP unlimited ~<span class="num">£200</span>/hr (2 hr min). ' +
            'Ape\'s Den · St Michael\'s Cave · Europa Point · Great Siege Tunnels. ' +
            'Fare agreed with driver — not metered.' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildCableCar() {
    return RW.ui.sectionTitle('Cable Car') +
      '<div class="card" style="display:flex;gap:14px;align-items:flex-start">' +
        '<div style="font-size:30px;flex:0 0 auto;line-height:1;margin-top:2px">🚠</div>' +
        '<div style="flex:1">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
            '<span style="font-weight:800;font-size:14px">Closed for refurbishment</span>' +
            '<span class="pill-status warn">Until ~2027</span>' +
          '</div>' +
          '<div class="muted tiny" style="line-height:1.65">' +
            'Cable car is <strong>not operational in 2026</strong>. ' +
            'Reach the Upper Rock by GTA taxi tour or on foot. ' +
            'Top Station: Mons Calpe Suite · Skywalk (glass platform ~<span class="num">340</span> m) · ' +
            'Barbary macaques · St Michael\'s Cave.' +
          '</div>' +
          '<div class="muted tiny" style="margin-top:6px;line-height:1.55">' +
            'Prices on reopening: adult round trip ~<span class="num">£49</span> · ' +
            'one-way ~<span class="num">£46.50</span> · child ~<span class="num">£31</span>.' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildFerry() {
    return RW.ui.sectionTitle('Ferry') +
      '<div class="card">' +
        '<div class="row" style="border:0;padding:6px 0">' +
          '<div class="lead" style="font-size:26px;background:var(--sea-soft);border-radius:12px">⛴️</div>' +
          '<div class="body">' +
            '<div class="name">Gibraltar → Tangier Med <span style="font-size:11.5px;font-weight:600;color:var(--ash)">(FRS)</span></div>' +
            '<div class="sub" style="line-height:1.55">' +
              'Sporadic · ~1–2×/week · often Fridays<br>' +
              'Crossing ~<span class="num">1.5</span> hr · fares from ~<span class="num">€37.50</span>' +
            '</div>' +
          '</div>' +
          '<div class="trail" style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' +
            '<span class="pill-status neutral">Low frequency</span>' +
            '<button class="btn sm ghost" data-act="ferryCheck">Check live</button>' +
          '</div>' +
        '</div>' +
        '<div class="muted tiny" style="margin-top:4px;border-top:1px solid var(--mist);padding-top:8px;line-height:1.65">' +
          'No regular Gibraltar–Algeciras service. ' +
          'Spain-bound? Cross the frontier on foot or by bus. ' +
          'FRS schedule is volatile — always confirm before travelling.' +
        '</div>' +
      '</div>';
  }

  function buildRunwayDetail() {
    var noteText = runwayCrossing.open
      ? 'No aircraft movement — crossing is open to pedestrians and cyclists.'
      : 'Aircraft operating — barriers are down. Use the subway underpass.';

    return RW.ui.sectionTitle('Airport runway crossing') +
      '<div class="card">' +
        '<div class="row" style="border:0;padding:6px 0;align-items:flex-start">' +
          '<div class="lead" style="font-size:24px;background:var(--cloud);border-radius:12px">✈️</div>' +
          '<div class="body">' +
            '<div class="name" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
              'Pedestrian crossing ' + crossingPill() +
            '</div>' +
            '<div class="sub" style="line-height:1.65">' +
              esc(noteText) +
            '</div>' +
            '<div class="sub" style="margin-top:6px;line-height:1.55">' +
              'The at-grade crossing on Winston Churchill Ave is for ' +
              '<strong>pedestrians &amp; cyclists only</strong>. ' +
              'Barriers still close when aircraft move. ' +
              'A subway underpass is always open as an alternative.' +
            '</div>' +
            '<div class="muted tiny" style="margin-top:8px;padding:7px 10px;background:var(--cloud);border-radius:10px;line-height:1.55">' +
              '🚗 Cars &amp; vehicles use the <strong>Kingsway tunnel</strong> ' +
              '(opened <span class="num">31 Mar 2023</span>) — no barrier delays.' +
            '</div>' +
          '</div>' +
          '<div class="trail">' +
            '<button class="btn sm ghost" data-act="moveToggleCrossing">' +
              (runwayCrossing.open ? 'Simulate close' : 'Simulate open') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ---- Filter chips ----
  var FILTERS = [
    { label: '🗺️ All',             value: 'all'   },
    { label: '🚌 Bus',             value: 'bus'   },
    { label: '🚕 Taxi',            value: 'taxi'  },
    { label: '⛴️ Ferries & More',  value: 'other' },
  ];

  function buildFilterChips() {
    return RW.ui.chips(FILTERS, activeFilter, 'moveFilter', true);
  }

  // ---- Main render ----
  function render() {
    var showBus   = activeFilter === 'all' || activeFilter === 'bus';
    var showTaxi  = activeFilter === 'all' || activeFilter === 'taxi';
    var showOther = activeFilter === 'all' || activeFilter === 'other';

    var body =
      buildStats() +
      buildFilterChips() +
      (showBus   ? buildBuses()        : '') +
      (showTaxi  ? buildTaxis()        : '') +
      (showOther ? buildCableCar()     : '') +
      (showOther ? buildFerry()        : '') +
      (showOther ? buildRunwayDetail() : '');

    return RW.ui.screen({
      title: 'Move around Gib',
      hero: RW.ui.hero({
        emoji: '🚌',
        title: 'Getting around Gibraltar',
        sub: 'Bus · Taxi · Ferry · Runway crossing',
        accent: '#1455c0',
        chips: ['GBC buses', 'Calypso Route 5', 'GTA taxis only', 'No ride-hailing', 'Kingsway tunnel'],
      }),
      body: body,
    });
  }

  RW.register({
    id: 'move', title: 'Move', emoji: '🚌', tileBg: '#fff4d6', section: 'daily', order: 50, render,
    actions: {
      taxiCall: function () {
        RW.toast('📞 Connecting to Gibraltar Taxi Association…');
      },
      taxiTour: function () {
        RW.toast('🪨 Rock tour enquiry sent — shared £22–25/pp · private from £360 · VIP £200/hr');
      },
      ferryCheck: function () {
        RW.toast('⛴️ FRS Tangier Med: ~1–2 sailings/week (often Fridays). Always confirm live before travelling.');
      },
      moveFilter: function (el) {
        activeFilter = el.dataset.v || 'all';
        RW.render();
      },
      moveToggleCrossing: function () {
        runwayCrossing.open = !runwayCrossing.open;
        runwayCrossing.note = runwayCrossing.open
          ? 'No aircraft movement'
          : 'Aircraft operating — barriers down';
        RW.render();
      },
    },
  });
})(window.RW);
