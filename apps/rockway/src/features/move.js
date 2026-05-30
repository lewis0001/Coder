/* Rockway feature — Move (transport). Grounded in real Gibraltar:
 * - Buses: Gibraltar Bus Company (1–4, 7–9) + Calypso Route 5 frontier shuttle;
 *   residents/commuters travel FREE; live tracker track.bus.gi.
 * - Taxi: Gibraltar Taxi Association only (no Uber) — ranks + phone + rock tours.
 * - Cable car: CLOSED for refurbishment, reopening ~2027.
 * - Ferry: FRS Tangier Med, sporadic.
 * - Runway crossing: pedestrian/cyclist status (cars use the Kingsway tunnel). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  const buses = [
    { n: '5', op: 'Calypso', dest: 'Frontier ↔ Market Place (airport shuttle)', color: '#c0392b', every: 15, next: [3, 18, 33] },
    { n: '4', op: 'GBC', dest: 'Catalan Bay ↔ Reclamation Rd', color: '#0a7d34', every: 20, next: [6, 26, 46] },
    { n: '2', op: 'GBC', dest: 'City Centre ↔ Both Worlds', color: '#1455c0', every: 20, next: [9, 29] },
    { n: '7', op: 'GBC', dest: 'Frontier ↔ Reclamation Rd', color: '#8e44ad', every: 15, next: [4, 19, 34] },
    { n: '8', op: 'GBC', dest: 'Frontier ↔ Europa Point', color: '#d68910', every: 30, next: [21, 51] },
  ];
  const taxiRanks = ['Casemates Square', 'Cathedral Square', 'Airport', 'Frontier (la focona)'];

  function render() {
    const busRows = buses.map((b) =>
      '<div class="row"><div class="lead" style="background:' + b.color + '1f;color:' + b.color + ';font-weight:900;font-size:15px">' + b.n + '</div>' +
      '<div class="body"><div class="name">' + esc(b.dest) + '</div><div class="sub">' + b.op + ' · every ' + b.every + ' min</div></div>' +
      '<div class="trail"><div style="color:var(--green);font-weight:900;font-size:18px">' + b.next[0] + '′</div><div class="muted tiny">then ' + b.next.slice(1).map((n) => n + '′').join(', ') + '</div></div></div>').join('');

    const body =
      // live signals
      '<div class="grid2" style="margin-top:8px">' +
      '<div class="stat"><div class="n" style="color:var(--green)">FREE</div><div class="l">Buses for residents & commuters</div></div>' +
      '<div class="stat"><div class="n">🚶 Open</div><div class="l">Airport pedestrian crossing</div></div></div>' +

      RW.ui.sectionTitle('Bus — next departures', 'track.bus.gi', '#/move') +
      '<div class="card">' + busRows + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">Single £1.80 · day pass £2.50 · residents, commuters & military travel free.</div>' +

      RW.ui.sectionTitle('Taxi — Gibraltar Taxi Association') +
      '<div class="card"><div class="muted tiny" style="margin-bottom:6px">Gibraltar has one licensed taxi service (no ride-hailing apps). Hail at a rank or call the GTA.</div>' +
      '<div class="chips" style="margin-bottom:12px">' + taxiRanks.map((r) => '<span class="chip">📍 ' + esc(r) + '</span>').join('') + '</div>' +
      '<div class="grid2"><button class="btn sea" data-act="taxiCall">📞 Call GTA</button><button class="btn ghost" data-act="taxiTour">🪨 Rock tour · £25pp</button></div></div>' +

      RW.ui.sectionTitle('Cable Car') +
      '<div class="card" style="display:flex;gap:12px;align-items:center"><div style="font-size:26px">🚠</div>' +
      '<div style="flex:1"><div style="font-weight:700;font-size:14px">Closed for refurbishment</div><div class="muted tiny">Expected to reopen 2027 · macaques & Top Station terraces</div></div>' +
      '<span class="pill-status warn">Closed</span></div>' +

      RW.ui.sectionTitle('Ferry') +
      '<div class="card"><div class="row" style="border:0;padding:6px 0"><div class="lead">⛴️</div>' +
      '<div class="body"><div class="name">Gibraltar → Tangier Med (FRS)</div><div class="sub">Sporadic · often Fridays · confirm live</div></div>' +
      '<div class="trail"><button class="btn sm ghost" data-act="ferryCheck">Check</button></div></div></div>';

    return RW.ui.screen({ title: 'Move around Gib', body });
  }

  RW.register({
    id: 'move', title: 'Move', emoji: '🚌', tileBg: '#fff4d6', section: 'daily', order: 50, render,
    actions: {
      taxiCall: () => RW.toast('📞 Connecting to Gibraltar Taxi Association…'),
      taxiTour: () => RW.toast('🪨 Rock tour enquiry sent to the GTA'),
      ferryCheck: () => RW.toast('⛴️ FRS sailings are limited — checking live availability'),
    },
  });
})(window.RW);
