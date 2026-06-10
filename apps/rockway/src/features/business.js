/* Rockway feature — Business (supply-side: list your business, manage bookings). */
(function (RW) {
  'use strict';
  const { esc, uid } = RW.util;

  // ---- category map ----
  var CATEGORIES = [
    { v: 'Pets',         label: 'Pets',          emoji: '🐾' },
    { v: 'Hair & Beauty', label: 'Hair & Beauty', emoji: '💈' },
    { v: 'Fitness',      label: 'Fitness',        emoji: '🏋️' },
    { v: 'Trades',       label: 'Trades',         emoji: '🔧' },
    { v: 'Auto',         label: 'Auto',           emoji: '🚗' },
    { v: 'Health',       label: 'Health',         emoji: '🏥' },
    { v: 'Home',         label: 'Home',           emoji: '🏠' },
    { v: 'Lessons',      label: 'Lessons',        emoji: '📚' },
    { v: 'Dining',       label: 'Dining',         emoji: '🍽️' },
    { v: 'Other',        label: 'Other',          emoji: '⭐' },
  ];

  // ---- Gibraltar areas ----
  var AREAS = [
    'Town Centre', 'Ocean Village', 'Marina Bay', 'Queensway Quay',
    'Catalan Bay', 'Sandy Bay', 'North District', 'South District',
    'Upper Town', 'Westside', 'Reclamation', 'Frontier Area',
  ];

  function catEmoji(cat) {
    var found = CATEGORIES.filter(function (c) { return c.v === cat; })[0];
    return found ? found.emoji : '⭐';
  }


  // Format a timestamp as a short date/time string
  function fmtWhen(t) {
    if (!t) return '';
    var d = new Date(t);
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    var mm = m < 10 ? '0' + m : String(m);
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' · ' + h + ':' + mm + ampm;
  }


  // ---- status pill ----
  // selected day in the week schedule strip (session only)
  var openDay = null;

  // Human "when" for a received booking: prefer the booking's own label, else
  // build one from whenIso + slot (never run fmtWhen on a label string → NaN).
  function bookingWhen(b) {
    if (b.when && b.when !== 'x') return b.when;
    if (b.whenIso) {
      var nice = new Date(b.whenIso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      return nice + (b.slot ? ' · ' + b.slot : '');
    }
    return b.slot || 'Requested';
  }

  // Update a received booking's status AND mirror it onto the customer's own
  // booking (same id) so their Bookings tab stays in sync for self-bookings.
  function setBookingStatus(id, status, msg) {
    if (!id) return;
    RW.S.bizBookings = RW.S.bizBookings || [];
    var b = RW.S.bizBookings.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    b.status = status;
    (RW.S.bookings || []).forEach(function (cb) { if (cb.id === id) cb.status = status; });
    RW.store.save();
    RW.toast(msg);
    RW.render();
  }

  // Next 7 Gibraltar days as { iso, label, dow }.
  function weekDays() {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(Date.now() + i * 86400000);
      var iso = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Gibraltar' });
      out.push({
        iso: iso,
        label: i === 0 ? 'Today' : i === 1 ? 'Tom' : d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/Gibraltar' }),
        dom: d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'Europe/Gibraltar' }),
      });
    }
    return out;
  }

  // The schedule strip + selected-day detail (bookings that day + block-outs).
  function scheduleSection() {
    var biz = RW.S.myBusiness;
    biz.blocked = biz.blocked || [];
    var days = weekDays();
    if (!openDay) openDay = days[0].iso;
    var active = function (s) { return s !== 'Cancelled' && s !== 'Declined'; };

    var strip = '<div class="card" style="margin-bottom:12px"><div class="week-strip">';
    days.forEach(function (d) {
      var n = (RW.S.bizBookings || []).filter(function (b) { return b.whenIso === d.iso && active(b.status); }).length;
      var blk = biz.blocked.filter(function (k) { return String(k).split(' ')[0] === d.iso; }).length;
      var on = d.iso === openDay ? ' on' : '';
      strip += '<button class="day-pill' + on + '" data-act="bizDay" data-day="' + d.iso + '">' +
        '<span class="dl">' + esc(d.label) + '</span><span class="dn num">' + esc(d.dom) + '</span>' +
        (n ? '<span class="db">' + n + '</span>' : (blk ? '<span class="db blk">•</span>' : '<span class="db gap"></span>')) +
        '</button>';
    });
    strip += '</div>';

    // selected day detail
    var dayBookings = (RW.S.bizBookings || []).filter(function (b) { return b.whenIso === openDay; });
    var dayBlocks = biz.blocked.filter(function (k) { return String(k).split(' ')[0] === openDay; }).sort();
    var detail = '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px">';
    if (dayBookings.length) {
      dayBookings.forEach(function (b) {
        detail += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
          '<span class="num" style="font-weight:800;font-size:13px;min-width:42px">' + esc(b.slot || '—') + '</span>' +
          '<span style="flex:1;font-size:13px">' + esc(b.customer || 'Customer') + ' · ' + esc(b.service) + '</span>' +
          statusPill(b.status) + '</div>';
      });
    } else {
      detail += '<div class="subtle" style="margin-bottom:4px">No bookings on this day yet.</div>';
    }
    // block-out manager
    var slotOpts = '';
    for (var hh = 9; hh <= 17; hh++) { var t = (hh < 10 ? '0' : '') + hh + ':00'; slotOpts += '<option value="' + t + '">' + t + '</option>'; }
    detail += '<div style="display:flex;gap:8px;margin-top:10px">' +
      '<select id="block-slot" class="input" style="flex:1">' + slotOpts + '</select>' +
      '<button class="btn sm" data-act="bizBlock">Block</button></div>';
    if (dayBlocks.length) {
      detail += '<div class="chips" style="margin-top:10px">' + dayBlocks.map(function (k) {
        var slot = String(k).split(' ')[1] || '';
        return '<span class="chip">⛔ ' + esc(slot) + ' <span data-act="bizUnblock" data-key="' + esc(k) + '" style="cursor:pointer;font-weight:800">×</span></span>';
      }).join('') + '</div>';
    }
    detail += '<div class="subtle" style="margin-top:8px">Blocked slots disappear from your booking page instantly.</div>';
    detail += '</div>';
    return strip + detail + '</div>';
  }

  function statusPill(status) {
    var cls = 'neutral';
    if (status === 'Confirmed') cls = 'ok';
    else if (status === 'Declined') cls = 'danger';
    else if (status === 'Requested') cls = 'warn';
    return '<span class="pill-status ' + cls + '">' + esc(status) + '</span>';
  }

  // ---- onboarding form (State A) ----
  function renderOnboarding() {
    var selectedCat = RW.S._bizDraftCat || 'Hair & Beauty';

    var heroHtml = RW.ui.hero({
      emoji: '🏪',
      title: 'List your business',
      sub: 'Reach every customer on the Rock — free forever',
      accent: '#1455c0',
      chips: ['Free listing', 'Instant bookings', 'Gibraltar only'],
    });

    var catSeg = '<div class="chips" style="margin-bottom:4px">' +
      CATEGORIES.map(function (c) {
        var on = c.v === selectedCat ? ' on' : '';
        return '<span class="chip tap' + on + '" data-act="bizCategory" data-v="' + esc(c.v) + '">' +
          c.emoji + ' ' + esc(c.label) + '</span>';
      }).join('') + '</div>';

    var areaOptions = AREAS.map(function (a) {
      return '<option value="' + esc(a) + '">' + esc(a) + '</option>';
    }).join('');

    var form = '<div class="card">' +
      '<label class="fld">Business name *</label>' +
      '<input id="biz-name" class="input" placeholder="e.g. Rock Barbers" />' +

      '<label class="fld">Category *</label>' +
      catSeg +
      '<input type="hidden" id="biz-cat" value="' + esc(selectedCat) + '" />' +

      '<label class="fld">Area *</label>' +
      '<select id="biz-area" class="input">' + areaOptions + '</select>' +

      '<label class="fld">Short description *</label>' +
      '<input id="biz-blurb" class="input" placeholder="One line about your business" />' +

      '<label class="fld">Phone</label>' +
      '<input id="biz-phone" class="input" type="tel" placeholder="+350 200 XXXXX" />' +

      '<label class="fld">Opening hours</label>' +
      '<input id="biz-hours" class="input" placeholder="e.g. Mon–Fri 9am–6pm" />' +
      '</div>';

    var services = '<div class="card" style="margin-top:12px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px">Your services (add up to 3)</div>' +

      '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px;margin-bottom:6px">' +
      '<div style="font-size:11px;font-weight:700;color:var(--ash)">Name</div>' +
      '<div style="font-size:11px;font-weight:700;color:var(--ash)">Price £</div>' +
      '<div style="font-size:11px;font-weight:700;color:var(--ash)">Mins</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px;margin-bottom:8px">' +
      '<input id="svc1-name" class="input" placeholder="Haircut *" />' +
      '<input id="svc1-price" class="input" type="number" min="0" step="0.01" placeholder="25" />' +
      '<input id="svc1-dur" class="input" type="number" min="5" step="5" placeholder="30" />' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px;margin-bottom:8px">' +
      '<input id="svc2-name" class="input" placeholder="Optional" />' +
      '<input id="svc2-price" class="input" type="number" min="0" step="0.01" placeholder="" />' +
      '<input id="svc2-dur" class="input" type="number" min="5" step="5" placeholder="" />' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px">' +
      '<input id="svc3-name" class="input" placeholder="Optional" />' +
      '<input id="svc3-price" class="input" type="number" min="0" step="0.01" placeholder="" />' +
      '<input id="svc3-dur" class="input" type="number" min="5" step="5" placeholder="" />' +
      '</div>' +
      '</div>';

    var publishBtn = '<button class="btn" style="margin-top:16px" data-act="bizPublish">' +
      '🚀 Publish listing</button>';

    var body = form + services + publishBtn;

    return RW.ui.screen({ title: 'For Business', hero: heroHtml, body: body });
  }

  // ---- dashboard (State B) ----
  function renderDashboard() {
    RW.S.myBusiness = RW.S.myBusiness || null;
    RW.S.bizBookings = RW.S.bizBookings || [];

    var biz = RW.S.myBusiness;
    var bookings = RW.S.bizBookings;

    // Header card
    var confirmedCount = bookings.filter(function (b) { return b.status === 'Confirmed'; }).length;
    var totalCount = bookings.length;

    var headerCard = '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-size:18px;font-weight:900;letter-spacing:-.3px;margin-bottom:6px">' + esc(biz.name) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">' +
      '<span class="chip">' + esc(catEmoji(biz.category)) + ' ' + esc(biz.category) + '</span>' +
      '<span class="chip">📍 ' + esc(biz.area) + '</span>' +
      '<span class="chip">' + (biz.rating === 'New' ? '🆕 New' : '⭐ ' + esc(String(biz.rating))) + '</span>' +
      '</div>' +
      (biz.blurb ? '<div style="font-size:13px;color:var(--ash);line-height:1.4;margin-bottom:8px">' + esc(biz.blurb) + '</div>' : '') +
      (biz.hours ? '<div style="font-size:12px;color:var(--ash)">🕐 ' + esc(biz.hours) + '</div>' : '') +
      '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="btn sm ghost" data-act="bizEdit">Edit</button>' +
      '<button class="btn sm sea" data-act="nav" data-route="#/discover">Preview in Discover</button>' +
      '</div>' +
      '</div>';

    // Quick stats
    var statsGrid = '<div class="grid2" style="margin-bottom:12px">' +
      '<div class="stat"><div class="n">🟢</div><div class="l">Live in Discover</div></div>' +
      '<div class="stat"><div class="n num">' + totalCount + '</div><div class="l">Total bookings</div></div>' +
      '</div>' +
      '<div class="grid2" style="margin-bottom:12px">' +
      '<div class="stat"><div class="n num">' + confirmedCount + '</div><div class="l">Confirmed</div></div>' +
      '<div class="stat"><div class="n">' + esc(String(biz.rating)) + '</div><div class="l">Rating</div></div>' +
      '</div>';

    // Incoming bookings
    var bookingsHtml;
    if (bookings.length === 0) {
      bookingsHtml = RW.ui.empty('📅', 'No booking requests yet. They will appear here once customers discover you on Rockway.');
    } else {
      var bRows = bookings.map(function (b) {
        var canAct = b.status === 'Requested';
        var actBtns = canAct
          ? '<div style="display:flex;gap:6px;margin-top:8px">' +
            '<button class="btn sm" style="background:var(--green);box-shadow:none" data-act="bizAccept" data-id="' + esc(b.id) + '">Accept</button>' +
            '<button class="btn sm ghost" style="color:var(--brand);box-shadow:inset 0 0 0 1.5px var(--brand)" data-act="bizDecline" data-id="' + esc(b.id) + '">Decline</button>' +
            '</div>'
          : '';
        return '<div style="padding:12px 0;border-bottom:1px solid var(--mist)">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<div style="font-weight:700;font-size:14px">' + esc(b.customer) + '</div>' +
          statusPill(b.status) +
          '</div>' +
          '<div style="font-size:13px;color:var(--ash);margin-top:3px">' + esc(b.service) + ' · ' + esc(b.ref) + '</div>' +
          '<div style="font-size:12px;color:var(--ash);margin-top:2px">📅 ' + esc(bookingWhen(b)) + '</div>' +
          actBtns +
          '</div>';
      }).join('');
      bookingsHtml = '<div class="card" style="padding-bottom:4px">' + bRows + '</div>';
    }

    // Services list
    var svcs = biz.services || [];
    var svcsHtml;
    if (svcs.length === 0) {
      svcsHtml = '<div style="color:var(--ash);font-size:13px">No services added yet.</div>';
    } else {
      svcsHtml = '<div class="card" style="padding-bottom:4px">' +
        svcs.map(function (s) {
          var durText = s.durationMin ? ' · ' + esc(String(s.durationMin)) + ' min' : '';
          return '<div class="row" style="border-bottom:1px solid var(--mist)">' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:14px">' + esc(s.name) + '</div>' +
            '<div style="font-size:12px;color:var(--ash)">' + durText + '</div>' +
            '</div>' +
            '<div style="font-weight:900;font-size:16px" class="num">£' + esc(Number(s.price).toFixed(2)) + '</div>' +
            '</div>';
        }).join('') +
        '</div>';
    }

    // Add service mini-form
    var addServiceForm = '<div class="card" style="margin-top:12px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">Add a service</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px;margin-bottom:10px">' +
      '<input id="new-svc-name" class="input" placeholder="Name *" />' +
      '<input id="new-svc-price" class="input" type="number" min="0" step="0.01" placeholder="£" />' +
      '<input id="new-svc-dur" class="input" type="number" min="5" step="5" placeholder="min" />' +
      '</div>' +
      '<button class="btn sm ghost" data-act="bizAddService">+ Add service</button>' +
      '</div>';

    // Edit form (shown when RW.S._bizEditing is true)
    var editSection = '';
    if (RW.S._bizEditing) {
      var areaOpts = AREAS.map(function (a) {
        return '<option value="' + esc(a) + '"' + (a === biz.area ? ' selected' : '') + '>' + esc(a) + '</option>';
      }).join('');
      var catChips = '<div class="chips" style="margin-bottom:4px">' +
        CATEGORIES.map(function (c) {
          var on = c.v === biz.category ? ' on' : '';
          return '<span class="chip tap' + on + '" data-act="bizCategory" data-v="' + esc(c.v) + '">' +
            c.emoji + ' ' + esc(c.label) + '</span>';
        }).join('') + '</div>';

      editSection = '<div class="card" style="margin-top:12px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">Edit listing</div>' +
        '<label class="fld">Business name</label>' +
        '<input id="edit-biz-name" class="input" value="' + esc(biz.name) + '" />' +
        '<label class="fld">Category</label>' +
        catChips +
        '<label class="fld">Area</label>' +
        '<select id="edit-biz-area" class="input">' + areaOpts + '</select>' +
        '<label class="fld">Description</label>' +
        '<input id="edit-biz-blurb" class="input" value="' + esc(biz.blurb || '') + '" />' +
        '<label class="fld">Phone</label>' +
        '<input id="edit-biz-phone" class="input" value="' + esc(biz.phone || '') + '" />' +
        '<label class="fld">Opening hours</label>' +
        '<input id="edit-biz-hours" class="input" value="' + esc(biz.hours || '') + '" />' +
        '<div style="display:flex;gap:8px;margin-top:14px">' +
        '<button class="btn" data-act="bizSaveEdit">Save changes</button>' +
        '<button class="btn ghost" data-act="bizCancelEdit">Cancel</button>' +
        '</div>' +
        '</div>';
    }

    // Remove listing
    var removeBtn = '<button class="btn ghost" style="margin-top:16px;color:var(--brand);box-shadow:inset 0 0 0 1.5px var(--brand)" data-act="bizRemove">' +
      '🗑 Remove listing</button>';

    var body =
      headerCard +
      statsGrid +
      RW.ui.sectionTitle('This week') +
      scheduleSection() +
      RW.ui.sectionTitle('Incoming bookings') +
      bookingsHtml +
      RW.ui.sectionTitle('Your services') +
      svcsHtml +
      addServiceForm +
      editSection +
      removeBtn;

    return RW.ui.screen({ title: 'For Business', body: body });
  }

  // ---- render dispatcher ----
  function render() {
    RW.S.myBusiness = RW.S.myBusiness || null;
    RW.S.bizBookings = RW.S.bizBookings || [];

    if (!RW.S.myBusiness) {
      return renderOnboarding();
    }
    return renderDashboard();
  }

  // ---- actions ----
  var actions = {

    bizCategory: function (el) {
      var v = el.dataset.v;
      if (!v) return;
      // In editing mode, update the live biz category; otherwise store draft
      if (RW.S.myBusiness && RW.S._bizEditing) {
        RW.S.myBusiness.category = v;
        RW.S.myBusiness.emoji = catEmoji(v);
        RW.store.save();
      } else {
        RW.S._bizDraftCat = v;
      }
      RW.render();
    },

    bizPublish: function () {
      var name   = (document.getElementById('biz-name')  || {}).value || '';
      var cat    = (document.getElementById('biz-cat')   || {}).value || RW.S._bizDraftCat || 'Other';
      var area   = (document.getElementById('biz-area')  || {}).value || '';
      var blurb  = (document.getElementById('biz-blurb') || {}).value || '';
      var phone  = (document.getElementById('biz-phone') || {}).value || '';
      var hours  = (document.getElementById('biz-hours') || {}).value || '';

      var svc1n = (document.getElementById('svc1-name')  || {}).value || '';
      var svc1p = (document.getElementById('svc1-price') || {}).value || '';
      var svc1d = (document.getElementById('svc1-dur')   || {}).value || '';
      var svc2n = (document.getElementById('svc2-name')  || {}).value || '';
      var svc2p = (document.getElementById('svc2-price') || {}).value || '';
      var svc2d = (document.getElementById('svc2-dur')   || {}).value || '';
      var svc3n = (document.getElementById('svc3-name')  || {}).value || '';
      var svc3p = (document.getElementById('svc3-price') || {}).value || '';
      var svc3d = (document.getElementById('svc3-dur')   || {}).value || '';

      name  = name.trim();
      blurb = blurb.trim();

      if (!name)  { RW.toast('Please enter a business name.'); return; }
      if (!area)  { RW.toast('Please select an area.'); return; }
      if (!blurb) { RW.toast('Please add a short description.'); return; }
      if (!svc1n.trim()) { RW.toast('Please add at least one service.'); return; }

      var p1 = parseFloat(svc1p);
      if (isNaN(p1) || p1 < 0) p1 = 0;
      var d1 = parseInt(svc1d, 10);
      if (isNaN(d1) || d1 < 1) d1 = 30;

      var services = [{ id: uid(), name: svc1n.trim(), price: p1, durationMin: d1 }];

      if (svc2n.trim()) {
        var p2 = parseFloat(svc2p);
        if (isNaN(p2) || p2 < 0) p2 = 0;
        var d2 = parseInt(svc2d, 10);
        if (isNaN(d2) || d2 < 1) d2 = 30;
        services.push({ id: uid(), name: svc2n.trim(), price: p2, durationMin: d2 });
      }

      if (svc3n.trim()) {
        var p3 = parseFloat(svc3p);
        if (isNaN(p3) || p3 < 0) p3 = 0;
        var d3 = parseInt(svc3d, 10);
        if (isNaN(d3) || d3 < 1) d3 = 30;
        services.push({ id: uid(), name: svc3n.trim(), price: p3, durationMin: d3 });
      }

      RW.S.myBusiness = {
        id: 'mybiz',
        name: name,
        category: cat,
        emoji: catEmoji(cat),
        area: area,
        blurb: blurb,
        phone: phone.trim(),
        hours: hours.trim(),
        services: services,
        rating: 'New',
        reviews: 0,
        t: Date.now(),
      };

      RW.S.bizBookings = [];
      RW.S._bizDraftCat = null;
      RW.store.save();
      RW.toast("You’re live on Rockway!");
      RW.render();
    },

    bizAccept: function (el) { setBookingStatus(el.dataset.id, 'Confirmed', 'Booking confirmed!'); },
    bizDecline: function (el) { setBookingStatus(el.dataset.id, 'Declined', 'Booking declined.'); },

    bizDay: function (el) {
      openDay = el.dataset.day || null;
      RW.render();
    },
    bizBlock: function (el) {
      var sel = document.getElementById('block-slot');
      var slot = sel ? sel.value : '';
      if (!openDay || !slot) { RW.toast('Pick a time to block.'); return; }
      RW.S.myBusiness.blocked = RW.S.myBusiness.blocked || [];
      var key = openDay + ' ' + slot;
      if (RW.S.myBusiness.blocked.indexOf(key) === -1) RW.S.myBusiness.blocked.push(key);
      RW.store.save();
      RW.toast('Blocked ' + slot + ' — gone from your booking page.');
      RW.render();
    },
    bizUnblock: function (el) {
      var key = el.dataset.key;
      RW.S.myBusiness.blocked = (RW.S.myBusiness.blocked || []).filter(function (k) { return k !== key; });
      RW.store.save();
      RW.render();
    },

    bizAddService: function () {
      if (!RW.S.myBusiness) return;
      var name  = (document.getElementById('new-svc-name')  || {}).value || '';
      var price = (document.getElementById('new-svc-price') || {}).value || '';
      var dur   = (document.getElementById('new-svc-dur')   || {}).value || '';

      name = name.trim();
      if (!name) { RW.toast('Please enter a service name.'); return; }

      var p = parseFloat(price);
      if (isNaN(p) || p < 0) p = 0;
      var d = parseInt(dur, 10);
      if (isNaN(d) || d < 1) d = 30;

      RW.S.myBusiness.services = RW.S.myBusiness.services || [];
      RW.S.myBusiness.services.push({ id: uid(), name: name, price: p, durationMin: d });
      RW.store.save();
      RW.toast('Service added.');
      RW.render();
    },

    bizEdit: function () {
      RW.S._bizEditing = true;
      RW.render();
    },

    bizCancelEdit: function () {
      RW.S._bizEditing = false;
      RW.render();
    },

    bizSaveEdit: function () {
      if (!RW.S.myBusiness) return;
      var name  = (document.getElementById('edit-biz-name')  || {}).value || '';
      var area  = (document.getElementById('edit-biz-area')  || {}).value || '';
      var blurb = (document.getElementById('edit-biz-blurb') || {}).value || '';
      var phone = (document.getElementById('edit-biz-phone') || {}).value || '';
      var hours = (document.getElementById('edit-biz-hours') || {}).value || '';

      name = name.trim();
      if (!name) { RW.toast('Business name cannot be empty.'); return; }

      RW.S.myBusiness.name  = name;
      RW.S.myBusiness.area  = area;
      RW.S.myBusiness.blurb = blurb.trim();
      RW.S.myBusiness.phone = phone.trim();
      RW.S.myBusiness.hours = hours.trim();
      // category already updated live via bizCategory
      RW.S._bizEditing = false;
      RW.store.save();
      RW.toast('Listing updated.');
      RW.render();
    },

    bizRemove: function () {
      if (!confirm('Remove your listing from Rockway? This cannot be undone.')) return;
      RW.S.myBusiness = null;
      RW.S.bizBookings = [];
      RW.S._bizEditing = false;
      RW.S._bizDraftCat = null;
      RW.store.save();
      RW.toast('Listing removed.');
      RW.render();
    },
  };

  RW.register({
    id: 'business',
    title: 'For Business',
    emoji: '🏪',
    tileBg: '#e6effc',
    section: 'services',
    order: 60,
    showTile: false,
    render: render,
    actions: actions,
  });

  // Surface incoming booking activity
  RW.registerActivity(function () {
    RW.S.bizBookings = RW.S.bizBookings || [];
    return RW.S.bizBookings.map(function (b) {
      return {
        t: b.t,
        html: '<div class="card" style="margin-bottom:0">' +
          '<div style="font-weight:700;font-size:14px">🏪 Booking request</div>' +
          '<div style="font-size:13px;color:var(--ink60);margin-top:2px">' + esc(b.customer) + ' — ' + esc(b.service) + '</div>' +
          '<div style="margin-top:6px">' + statusPill(b.status) + '</div>' +
          '</div>',
      };
    });
  });
})(window.RW);
