/* Rockway feature — Activity (unified history of orders, parcels & bookings).
 * Extensible: any feature can surface items via RW.registerActivity(fn) where
 * fn() returns [{ t:<ms>, html:<cardHtml>, kind?:<string> }].
 * The optional `kind` field enables filter chips; items without it appear under
 * All and are never hidden — fully backwards-compatible. */
(function (RW) {
  'use strict';
  const { esc, money, fmtTime } = RW.util;

  /* ---- provider registry ---- */
  const providers = [];
  RW.registerActivity = (fn) => providers.push(fn);

  /* ---- built-in providers (orders + parcels) ---- */
  RW.registerActivity(() => (RW.S.orders || []).map((o) => ({
    t: o.t,
    kind: 'orders',
    html: '<div class="card row" data-act="nav" data-route="' + esc('#/order/' + o.id) + '" style="cursor:pointer">' +
      '<div class="lead">' + (o.type === 'food' ? '🍔' : '🛒') + '</div>' +
      '<div class="body"><div class="name">' + esc(o.vendorName) + '</div>' +
      '<div class="sub">' + esc(o.ref) + ' · <span class="num">' + money(o.total) + '</span> · ' + esc(fmtTime(o.t)) + '</div></div>' +
      '<div class="trail"><span class="pill-status ok">Track</span></div></div>',
  })));

  RW.registerActivity(() => (RW.S.parcels || []).map((p) => ({
    t: p.t,
    kind: 'money',
    html: '<div class="card row">' +
      '<div class="lead">📦</div>' +
      '<div class="body"><div class="name">Parcel → ' + esc(p.to) + '</div>' +
      '<div class="sub">' + esc(p.ref) + ' · ' + esc(p.status) + ' · ' + esc(fmtTime(p.t)) + '</div></div>' +
      '<div class="trail"><span class="num">' + money(p.price) + '</span></div></div>',
  })));

  /* ---- day-grouping helpers ---- */
  function dayLabel(t) {
    var now = new Date();
    var d = new Date(t);
    var nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var dMid   = new Date(d.getFullYear(),   d.getMonth(),   d.getDate()).getTime();
    var diff = nowMid - dMid;
    if (diff === 0)       return 'Today';
    if (diff === 86400000) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /* ---- week-count helper ---- */
  function weekCount(items) {
    var cutoff = Date.now() - 7 * 86400000;
    return items.filter((i) => i.t >= cutoff).length;
  }

  /* ---- filter config ---- */
  var FILTERS = [
    { label: 'All',      value: 'all' },
    { label: 'Orders',   value: 'orders' },
    { label: 'Money',    value: 'money' },
    { label: 'Bookings', value: 'bookings' },
  ];

  /* ---- action state (survives re-render within session) ---- */
  var currentFilter = 'all';

  /* ---- render ---- */
  function render(parts) {
    parts = parts || {};
    if (parts.filter != null) currentFilter = parts.filter;

    /* collect + sort */
    var items = [];
    providers.forEach(function (fn) {
      try { items = items.concat(fn() || []); } catch (e) {}
    });
    items.sort((a, b) => b.t - a.t);

    /* filter — items without kind always pass through */
    var visible = currentFilter === 'all'
      ? items
      : items.filter((i) => !i.kind || i.kind === currentFilter);

    /* summary header */
    var wc = weekCount(items);
    var summary = '<div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0 10px">' +
      '<span style="font-size:13px;color:var(--ash);font-weight:600">' +
        (wc === 0 ? 'No activity this week'
          : wc === 1 ? '1 item this week'
          : esc(String(wc)) + ' items this week') +
      '</span>' +
      '<span class="pill-status neutral" style="font-size:11px">' + esc(String(items.length)) + ' total</span>' +
      '</div>';

    /* filter chips */
    var filterChips = RW.ui.chips(FILTERS, currentFilter, 'activityFilter', true);

    /* grouped body */
    var body;
    if (visible.length === 0) {
      var emptyMsg = currentFilter === 'all'
        ? 'No activity yet.<br>Your orders, parcels &amp; bookings appear here.'
        : 'No ' + esc(currentFilter) + ' activity yet.';
      body = summary + filterChips + RW.ui.empty('🧾', emptyMsg);
    } else {
      /* group by calendar day */
      var groups = [];
      var groupMap = {};
      visible.forEach(function (item) {
        var key = dayLabel(item.t);
        if (!groupMap[key]) {
          groupMap[key] = { label: key, items: [] };
          groups.push(groupMap[key]);
        }
        groupMap[key].items.push(item);
      });

      var grouped = groups.map(function (g) {
        return '<div class="section-title" style="font-size:13px;font-weight:700;color:var(--ash);margin:18px 0 8px;letter-spacing:0.1px">' +
          esc(g.label) + '</div>' +
          g.items.map((i) => i.html).join('');
      }).join('');

      body = summary + filterChips + grouped;
    }

    return RW.ui.screen({ title: 'Activity', plain: true, tab: 'activity', body: body, fab: false });
  }

  RW.register({
    id: 'activity',
    title: 'Activity',
    emoji: '🧾',
    showTile: false,
    render: render,
    actions: {
      activityFilter: function (el) {
        render({ filter: el.dataset.v });
        RW.render();
      },
    },
  });
})(window.RW);
