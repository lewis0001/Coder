/* Rockway feature — Activity (unified history of orders, parcels & bookings).
 * Extensible: any feature can surface items via RW.registerActivity(fn) where
 * fn() returns [{ t:<ms>, html:<cardHtml> }]. */
(function (RW) {
  'use strict';
  const { esc, money, fmtTime } = RW.util;

  const providers = [];
  RW.registerActivity = (fn) => providers.push(fn);

  // Built-in providers for core state arrays.
  RW.registerActivity(() => RW.S.orders.map((o) => ({ t: o.t, html:
    '<div class="card row" data-act="nav" data-route="#/order/' + o.id + '" style="cursor:pointer">' +
    '<div class="lead">' + (o.type === 'food' ? '🍔' : '🛒') + '</div><div class="body"><div class="name">' + esc(o.vendorName) + '</div>' +
    '<div class="sub">' + o.ref + ' · ' + money(o.total) + ' · ' + fmtTime(o.t) + '</div></div><div class="trail"><span class="pill-status ok">Track</span></div></div>' })));
  RW.registerActivity(() => RW.S.parcels.map((p) => ({ t: p.t, html:
    '<div class="card row"><div class="lead">📦</div><div class="body"><div class="name">Parcel → ' + esc(p.to) + '</div>' +
    '<div class="sub">' + p.ref + ' · ' + esc(p.status) + ' · ' + fmtTime(p.t) + '</div></div><div class="trail">' + money(p.price) + '</div></div>' })));

  function render() {
    let items = [];
    providers.forEach((fn) => { try { items = items.concat(fn() || []); } catch (e) {} });
    items.sort((a, b) => b.t - a.t);
    const body = items.length ? items.map((i) => i.html).join('')
      : RW.ui.empty('🧾', 'No activity yet.<br>Your orders, parcels & bookings appear here.');
    return RW.ui.screen({ title: 'Activity', plain: true, tab: 'activity', body, fab: false });
  }

  RW.register({ id: 'activity', title: 'Activity', emoji: '🧾', showTile: false, render });
})(window.RW);
