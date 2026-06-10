/* Rockway feature — Move (getting around Gibraltar).
 * Honest, Gibraltar-accurate: live Gibraltar Bus Company positions via the
 * /api/bus proxy (track.bus.gi), the free-for-everyone buses 1–4 fact, the
 * Calypso Route 5 frontier shuttle, the cable car closure, and the single
 * licensed taxi operator (Gibraltar Taxi Association — no ride-hailing).
 * Research: docs/research/ideas/transport.md + docs/research/transport.md. */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  var TAXI_RANKS = ['Casemates Square', 'Cathedral Square', 'Airport', 'Frontier (la Focona)'];

  function busSection() {
    var p = RW.live && RW.live.get('bus');
    var st = RW.live ? RW.live.status('bus') : 'fail';
    var rows = '';
    if (p && p.ok && p.routes) {
      rows = p.routes.map(function (r) {
        var live = r.running > 0;
        var status = live
          ? '<span class="pill-status ok">● <span class="num">' + r.running + '</span> running</span>'
          : '<span class="pill-status neutral">none tracked</span>';
        return '<a class="row" href="https://track.bus.gi/routeInfo.php?id=' + esc(r.id) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;cursor:pointer">' +
          '<div class="lead" style="background:var(--cloud);font-weight:900;font-size:16px" class="num">' + esc(r.id) + '</div>' +
          '<div class="body"><div class="name">Route ' + esc(r.id) + (parseInt(r.id, 10) <= 4 ? ' · free' : '') + '</div>' +
          '<div class="sub">Live map ↗</div></div>' +
          '<div class="trail">' + status + '</div></a>';
      }).join('');
      var upd = (p.routes.filter(function (r) { return r.updated; })[0] || {}).updated || '';
      rows += '<div class="muted tiny" style="padding:8px 0 2px">Live · track.bus.gi' + (upd ? ' · updated ' + esc(upd.split(' ')[1] || upd) : '') + '</div>';
    } else if (st === 'loading') {
      rows = '<div class="skel" style="height:54px;border-radius:12px;margin:6px 0">x</div><div class="skel" style="height:54px;border-radius:12px;margin:6px 0">x</div>';
    } else {
      // offline / night (tracker often sleeps overnight)
      rows = '<div class="muted tiny" style="padding:4px 0 10px">Live positions appear when buses are running. See the full map at <strong>track.bus.gi</strong>.</div>' +
        '<a class="btn sm ghost" href="https://track.bus.gi/" target="_blank" rel="noopener" style="text-decoration:none">Open live bus map ↗</a>';
    }
    return '<div class="card">' + rows + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">Gibraltar Bus Company routes 1–4 are <strong>free for everyone</strong>. Route 5 (frontier shuttle, Calypso) is a separate operator — £1.80, not on the live tracker.</div>';
  }

  function render() {
    var body =
      '<div class="muted tiny" style="margin-bottom:10px">Buses, cable car & taxis on the Rock.</div>' +
      RW.ui.sectionTitle('Bus — live') + busSection() +

      RW.ui.sectionTitle('Cable car') +
      '<div class="card" style="display:flex;gap:12px;align-items:center">' +
      '<div style="font-size:24px">🚠</div><div style="flex:1">' +
      '<div style="font-weight:700;font-size:14px">Closed for refurbishment</div>' +
      '<div class="muted tiny">Expected to reopen ~2027. To reach the summit: taxi rock-tour, e-bike, or the Mediterranean Steps.</div></div>' +
      '<span class="pill-status warn">Closed</span></div>' +

      RW.ui.sectionTitle('Taxi — Gibraltar Taxi Association') +
      '<div class="card"><div class="muted tiny" style="margin-bottom:8px">Gibraltar has one licensed taxi service (no ride-hailing apps). Hail at a rank or call the GTA.</div>' +
      '<div class="chips" style="margin-bottom:12px">' + TAXI_RANKS.map(function (r) { return '<span class="chip">📍 ' + esc(r) + '</span>'; }).join('') + '</div>' +
      '<div class="grid2"><a class="btn sea" href="tel:+35020070027" style="text-decoration:none">📞 Call GTA</a>' +
      '<button class="btn ghost" data-act="moveTour">🪨 Rock tour · ~£25pp</button></div></div>' +

      RW.ui.sectionTitle('On foot & wheels') +
      '<div class="card"><div class="muted tiny">The Rock is tiny — most of town is a 10–15 min walk. Cross-border workers: park La Línea-side and walk over, or share the drive on the <span class="link" data-act="nav" data-route="#/carpool">car-pool board</span>.</div></div>';

    return RW.ui.screen({ title: 'Move around Gib', body: body });
  }

  RW.register({
    id: 'move', title: 'Move', emoji: '🚌', tileBg: '#fff4d6', section: 'daily', order: 24, tick: 30000, render: render,
    actions: {
      moveTour: function () { RW.toast('Rock tours run from the taxi ranks — ~£25pp shared. Call the GTA to arrange.'); },
    },
  });

  // Ask Rockway: transport intent
  RW.registerSearch(function (q) {
    if (['bus', 'taxi', 'cable car', 'transport', 'get around', 'route'].some(function (w) { return q.indexOf(w) > -1; })) {
      var p = RW.live && RW.live.get('bus');
      var n = (p && p.ok) ? p.routes.reduce(function (a, r) { return a + r.running; }, 0) : 0;
      return [{ group: 'Getting around', label: 'Move around Gibraltar', sub: n ? n + ' buses running now · taxis · cable car' : 'Buses, taxis & cable car', route: '#/move', lead: '🚌' }];
    }
    return [];
  });
})(window.RW);
