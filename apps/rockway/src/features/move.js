/* Rockway feature — Move (bus, cable car, ferry, taxi). */
(function (RW) {
  'use strict';
  const { esc, money, uid } = RW.util;

  const busRoutes = [
    { id: 'b2', n: '2', dest: 'Frontier ↔ Reclamation Rd', color: '#0a7d34', every: 15, next: [4, 19, 34] },
    { id: 'b3', n: '3', dest: 'Both Worlds ↔ Frontier', color: '#1455c0', every: 20, next: [7, 27, 47] },
    { id: 'b4', n: '4', dest: 'Catalan Bay ↔ Reclamation', color: '#c0392b', every: 30, next: [12, 42] },
    { id: 'b5', n: '5', dest: 'Frontier ↔ Market Place', color: '#8e44ad', every: 15, next: [2, 17, 32] },
    { id: 'b7', n: '7', dest: 'Town ↔ Europa Point', color: '#d68910', every: 30, next: [9, 39] },
  ];
  const ferries = [
    { id: 'f1', route: 'Gibraltar → Algeciras (FRS)', time: '11:00', dur: '1h 00m', price: 28, emoji: '⛴️' },
    { id: 'f2', route: 'Gibraltar → Tangier Med', time: '13:30', dur: '1h 30m', price: 45, emoji: '⛴️' },
  ];
  const cableCar = { status: 'Running', detail: 'Last car up 17:15 · Apes at the Top Station', emoji: '🚠' };
  const taxis = { eta: 6 };

  function render() {
    const buses = busRoutes.map((b) =>
      '<div class="row"><div class="lead" style="background:' + b.color + '22;color:' + b.color + ';font-weight:900;font-size:15px">' + b.n + '</div>' +
      '<div class="body"><div class="name">' + esc(b.dest) + '</div><div class="sub">Every ' + b.every + ' min</div></div>' +
      '<div class="trail"><div style="color:var(--green);font-weight:900;font-size:18px">' + b.next[0] + '′</div><div class="muted tiny">then ' + b.next.slice(1).map((n) => n + '′').join(', ') + '</div></div></div>').join('');
    const fer = ferries.map((f) =>
      '<div class="row"><div class="lead">' + f.emoji + '</div><div class="body"><div class="name">' + esc(f.route) + '</div>' +
      '<div class="sub">Departs ' + f.time + ' · ' + f.dur + '</div></div>' +
      '<div class="trail"><div>' + money(f.price) + '</div><button class="btn sm" style="margin-top:6px" data-act="toast" data-msg="Ferry ticket reserved">Book</button></div></div>').join('');
    const body =
      '<div class="grid2" style="margin-top:8px">' +
      '<button class="stat" data-act="taxi" style="text-align:left;border:0;cursor:pointer"><div class="n">🚕 ' + taxis.eta + '′</div><div class="l">Taxi · tap to book</div></button>' +
      '<div class="stat"><div class="n">' + cableCar.emoji + '</div><div class="l">Cable Car · ' + cableCar.status + '</div></div></div>' +
      '<div class="card" style="margin-top:12px;display:flex;gap:10px;align-items:center"><div style="font-size:22px">' + cableCar.emoji + '</div><div class="muted tiny">' + esc(cableCar.detail) + '</div></div>' +
      RW.ui.sectionTitle('Bus — next departures') + '<div class="card">' + buses + '</div>' +
      RW.ui.sectionTitle('Ferries') + '<div class="card">' + fer + '</div>';
    return RW.ui.screen({ title: 'Move around Gib', body });
  }

  RW.register({
    id: 'move', title: 'Move', emoji: '🚌', tileBg: '#fff4d6', section: 'daily', order: 50, render,
    actions: { taxi: () => RW.toast('🚕 Taxi booked — arriving in ' + taxis.eta + ' min') },
  });
})(window.RW);
