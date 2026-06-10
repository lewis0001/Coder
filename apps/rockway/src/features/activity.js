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

  /* ---- which booking row is expanded (session only) ---- */
  var expandedId = null;

  /* ---- built-in providers (bookings + event/explore reservations) ---- */
  function statusPill(s) {
    var cls = s === 'Confirmed' ? 'ok' : s === 'Declined' ? 'danger' : s === 'Cancelled' ? 'neutral' : 'info';
    return '<span class="pill-status ' + cls + '">' + esc(s || 'Requested') + '</span>';
  }
  function statusLine(s) {
    if (s === 'Confirmed') return 'Confirmed by the business — see you there.';
    if (s === 'Declined') return 'The business couldn’t take this one. Try another time or place.';
    if (s === 'Cancelled') return 'You cancelled this booking.';
    return 'Waiting for the business to confirm.';
  }
  RW.registerActivity(() => (RW.S.bookings || []).map((b) => {
    var dim = (b.status === 'Cancelled' || b.status === 'Declined');
    var open = expandedId === b.id;
    var head =
      '<div class="row" data-act="activityOpen" data-id="' + esc(b.id) + '" style="cursor:pointer;border-bottom:0">' +
      '<div class="lead" style="background:var(--green-soft)">📅</div>' +
      '<div class="body"><div class="name">' + esc(b.service) + ' · ' + esc(b.bizName) + '</div>' +
      '<div class="sub">' + esc(b.when) + ' · ' + esc(b.ref) +
      (b.price ? ' · <span class="num">' + esc(b.price) + '</span>' : '') + '</div></div>' +
      '<div class="trail">' + statusPill(b.status) + '</div></div>';
    var panel = '';
    if (open) {
      var canChange = (b.status === 'Requested' || b.status === 'Confirmed');
      panel =
        '<div style="border-top:1px solid var(--line);margin-top:4px;padding-top:10px">' +
        '<div style="font-size:13px;color:var(--ash);margin-bottom:10px">' + esc(statusLine(b.status)) + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn sm ghost" data-act="nav" data-route="#/discover/' + esc(b.bizId || '') + '">View business</button>' +
        (canChange ? '<button class="btn sm ghost" data-act="activityResched" data-id="' + esc(b.id) + '">Change time</button>' : '') +
        (canChange ? '<button class="btn sm" data-act="activityCancel" data-id="' + esc(b.id) + '">Cancel booking</button>' : '') +
        '</div></div>';
    }
    return {
      t: b.t,
      kind: 'bookings',
      html: '<div class="card" style="' + (dim ? 'opacity:.6;' : '') + 'cursor:pointer">' + head + panel + '</div>',
    };
  }));

  RW.registerActivity(() => (RW.S.reservations || []).map((r) => ({
    t: r.t,
    kind: 'bookings',
    html: '<div class="card row">' +
      '<div class="lead">' + (r.kind === 'explore' ? '🧭' : '🎟️') + '</div>' +
      '<div class="body"><div class="name">' + esc(r.name) + '</div>' +
      '<div class="sub">' + esc(r.when || 'Reserved') + ' · ' + esc(r.ref) + '</div></div>' +
      '<div class="trail"><span class="pill-status ok">Reserved</span></div></div>',
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
    { label: 'Bookings', value: 'bookings' },
  ];

  /* ---- action state (survives re-render within session) ---- */
  var currentFilter = 'all';

  /* ---- render ---- */
  function render(parts) {
    /* The router passes an ARRAY of route segments (#/activity/bookings →
     * ['bookings']). Never read named props off it — `parts.filter` is
     * Array.prototype.filter, which once made a function the active filter
     * and hid every booking. Accept only a known segment string. */
    if (parts && typeof parts[0] === 'string' &&
        FILTERS.some(function (f) { return f.value === parts[0]; })) {
      currentFilter = parts[0];
    }

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
        ? 'No activity yet.<br>Your bookings, RSVPs &amp; reservations appear here.'
        : 'No ' + esc(currentFilter) + ' yet.<br>Book a local business from Discover.';
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

    return RW.ui.screen({ title: 'Bookings & activity', plain: true, tab: 'activity', body: body });
  }

  RW.register({
    id: 'activity',
    title: 'Activity',
    emoji: '🧾',
    showTile: false,
    render: render,
    actions: {
      activityFilter: function (el) {
        currentFilter = el.dataset.v;
        RW.render();
      },
      activityOpen: function (el) {
        var id = el.dataset.id;
        expandedId = (expandedId === id) ? null : id;
        RW.render();
      },
      activityCancel: function (el) {
        var id = el.dataset.id;
        var b = (RW.S.bookings || []).filter(function (x) { return x.id === id; })[0];
        if (!b) return;
        if (typeof confirm === 'function' && !confirm('Cancel this booking?')) return;
        b.status = 'Cancelled';
        // keep the owner side in sync for self-bookings
        (RW.S.bizBookings || []).forEach(function (ob) { if (ob.id === id) ob.status = 'Cancelled'; });
        RW.store.save();
        RW.toast('Booking cancelled.');
        RW.render();
      },
      activityResched: function (el) {
        var id = el.dataset.id;
        var b = (RW.S.bookings || []).filter(function (x) { return x.id === id; })[0];
        if (!b) return;
        RW.toast('Pick a new time, then cancel this one.');
        RW.go('#/discover/' + (b.bizId || ''));
      },
    },
  });
})(window.RW);
