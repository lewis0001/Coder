/* Rockway feature — What's On (events & ticketing for Gibraltar). */
(function (RW) {
  'use strict';
  const { esc, money, fmtDate, ref } = RW.util;

  // ---- Authentic Gibraltar event calendar ----
  const EVENTS = [
    {
      id: 'e1',
      name: 'Gibraltar National Day',
      date: '2026-09-10',
      venue: 'Casemates Square',
      area: 'Grand Casemates',
      emoji: '🇬🇮',
      price: 0,
      cat: 'culture',
      desc: 'The Rock turns red & white. Parades, children’s fancy-dress, live music and fireworks from the Detached Mole.',
      accent: '#d4112a',
    },
    {
      id: 'e2',
      name: 'Calentita Food Festival',
      date: '2026-06-27',
      venue: 'Casemates Square',
      area: 'Grand Casemates',
      emoji: '🍽️',
      price: 0,
      cat: 'food',
      desc: 'Gibraltar’s big open-air food and culture night. Calentita, panissa, rosto and live music under the stars.',
      accent: '#e08a00',
    },
    {
      id: 'e3',
      name: 'Gibraltar Music Festival',
      date: '2026-09-05',
      venue: 'Victoria Stadium',
      area: 'North District',
      emoji: '🎸',
      price: 55,
      cat: 'music',
      desc: 'Headline rock and pop acts under the shadow of the Rock. The biggest paid gig of the year at Victoria Stadium.',
      accent: '#1455c0',
    },
    {
      id: 'e4',
      name: 'Gibraltar International Literary Festival',
      date: '2026-11-14',
      venue: 'Garrison Library',
      area: 'Main Street',
      emoji: '📚',
      price: 12,
      cat: 'culture',
      desc: 'Talks, readings and panels at one of the oldest lending libraries in the world. A Gibraltarian cultural gem.',
      accent: '#5b3d8a',
    },
    {
      id: 'e5',
      name: 'Mediterranean Sunset Yoga',
      date: '2026-05-31',
      venue: 'Europa Point',
      area: 'Europa Point',
      emoji: '🧘',
      price: 8,
      cat: 'wellness',
      desc: 'Golden-hour flow at the southern tip of the Rock, facing Africa across the Strait of Gibraltar.',
      accent: '#0a9d4a',
    },
    {
      id: 'e6',
      name: 'Trafalgar Cemetery Heritage Walk',
      date: '2026-06-05',
      venue: 'Trafalgar Cemetery',
      area: 'South District',
      emoji: '🪦',
      price: 5,
      cat: 'history',
      desc: 'Guided walk through 300 years of Gibraltarian history among the graves of Trafalgar veterans.',
      accent: '#3a4150',
    },
    {
      id: 'e7',
      name: 'Bay of Gibraltar Dolphin Regatta',
      date: '2026-07-11',
      venue: 'Ocean Village Marina',
      area: 'Ocean Village',
      emoji: '🐬',
      price: 22,
      cat: 'outdoor',
      desc: 'Sailing race and dolphin-watching safari in the Bay. Common, bottlenose and striped dolphins expected.',
      accent: '#1455c0',
    },
    {
      id: 'e8',
      name: 'Tercentenary Hall Rock Concert',
      date: '2026-08-22',
      venue: 'Tercentenary Hall',
      area: 'North District',
      emoji: '🎼',
      price: 18,
      cat: 'music',
      desc: 'An evening of Gibraltarian and Mediterranean music inside the main sports and events hall.',
      accent: '#d4112a',
    },
    {
      id: 'e9',
      name: 'Upper Rock Nature Walk',
      date: '2026-06-14',
      venue: 'Upper Rock Nature Reserve',
      area: 'Upper Rock',
      emoji: '🐒',
      price: 10,
      cat: 'outdoor',
      desc: 'Ranger-guided morning walk through the Nature Reserve. Spot Barbary macaques, rare plants and panoramic views.',
      accent: '#0a9d4a',
    },
    {
      id: 'e10',
      name: 'St. Michael’s Cave Concert',
      date: '2026-10-03',
      venue: "St. Michael’s Cave",
      area: 'Upper Rock',
      emoji: '🩸',
      price: 30,
      cat: 'music',
      desc: 'Classical music echoes through Gibraltar’s most dramatic natural amphitheatre — a 60-metre limestone grotto.',
      accent: '#5b3d8a',
    },
  ];

  // Category definitions with colour accents for pill badges
  const CAT_META = {
    culture:  { label: 'Culture',  color: '#5b3d8a' },
    music:    { label: 'Music',    color: '#1455c0' },
    food:     { label: 'Food',     color: '#e08a00' },
    history:  { label: 'History',  color: '#3a4150' },
    outdoor:  { label: 'Outdoor',  color: '#0a9d4a' },
    wellness: { label: 'Wellness', color: '#0a9d4a' },
  };

  // Category filter chips
  const CAT_FILTERS = [
    { label: 'All',      value: '' },
    { label: 'Culture',  value: 'culture' },
    { label: 'Music',    value: 'music' },
    { label: 'Food',     value: 'food' },
    { label: 'History',  value: 'history' },
    { label: 'Outdoor',  value: 'outdoor' },
    { label: 'Wellness', value: 'wellness' },
  ];

  // Month filter chips derived from actual event dates
  const MONTH_FILTERS = [
    { label: 'Any month', value: '' },
    { label: 'May',       value: '05' },
    { label: 'Jun',       value: '06' },
    { label: 'Jul',       value: '07' },
    { label: 'Aug',       value: '08' },
    { label: 'Sep',       value: '09' },
    { label: 'Oct',       value: '10' },
    { label: 'Nov',       value: '11' },
  ];

  // Expose next upcoming event for home card / other modules
  RW.api.nextEvent = function () {
    var today = new Date().toISOString().slice(0, 10);
    var upcoming = EVENTS.slice()
      .filter(function (e) { return e.date >= today; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    return upcoming[0] || EVENTS[0];
  };

  // ---- Date-block helper: bold day + short month in event accent colour ----
  function dateBlock(iso, accent) {
    var d = new Date(iso + 'T00:00:00');
    var day = d.getDate();
    var mon = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    var col = accent || 'var(--brand)';
    return (
      '<div style="text-align:center;min-width:40px;flex:0 0 40px;' +
      'background:var(--cloud);border-radius:10px;padding:5px 4px">' +
      '<div class="num" style="font-size:20px;font-weight:900;line-height:1;color:' + col + '">' +
      day + '</div>' +
      '<div style="font-size:10px;font-weight:700;color:var(--ash);letter-spacing:.5px">' +
      esc(mon) + '</div>' +
      '</div>'
    );
  }

  // ---- Category badge pill ----
  function catBadge(cat) {
    var meta = CAT_META[cat] || { label: cat, color: '#6b7280' };
    return (
      '<span style="display:inline-block;font-size:10.5px;font-weight:700;' +
      'padding:2px 8px;border-radius:999px;background:' + meta.color + '22;' +
      'color:' + meta.color + '">' + esc(meta.label) + '</span>'
    );
  }

  // ---- Single event card ----
  function eventCard(e) {
    var ticket = (RW.S.tickets || []).find(function (t) { return t.eventId === e.id; });

    var priceHtml = e.price
      ? '<span class="num" style="font-weight:800;font-size:13px;color:var(--brand)">' +
        money(e.price) + '</span>'
      : '<span style="color:var(--green);font-weight:800;font-size:13px">Free</span>';

    var accentBar =
      '<div style="height:3px;border-radius:3px;background:' + e.accent +
      ';margin:-14px -14px 12px;border-radius:var(--radius) var(--radius) 0 0"></div>';

    var venueHtml =
      '<div style="font-size:12px;color:var(--ash);margin-top:3px;display:flex;' +
      'align-items:center;gap:4px">' +
      '<span style="font-size:11px">📍</span> ' + esc(e.venue) +
      '</div>';

    var metaRow =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'margin-top:6px;flex-wrap:wrap;gap:4px">' +
      priceHtml + catBadge(e.cat) + '</div>';

    var actionHtml;
    if (ticket) {
      actionHtml =
        '<div class="pill-status ok" style="margin-top:10px;width:100%;' +
        'justify-content:center;font-size:12.5px">' +
        '✓ Booked · ref <span class="num" style="font-size:12px">' +
        esc(ticket.ref) + '</span></div>';
    } else {
      var btnClass = e.price ? 'btn sm' : 'btn sm ghost';
      var btnLabel = e.price
        ? 'Get ticket · ' + money(e.price)
        : 'RSVP · Free';
      actionHtml =
        '<button class="' + btnClass + '" style="margin-top:10px;width:100%" ' +
        'data-act="ticket" data-id="' + esc(e.id) + '">' + btnLabel + '</button>';
    }

    return (
      '<div class="card" style="padding:14px;margin-bottom:10px">' +
      accentBar +
      '<div style="display:flex;align-items:flex-start;gap:12px">' +
      dateBlock(e.date, e.accent) +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-weight:800;font-size:15px;line-height:1.25">' +
      esc(e.name) + '</div>' +
      venueHtml + metaRow +
      '</div>' +
      '<div style="font-size:26px;flex:0 0 auto;margin-top:-2px">' + e.emoji + '</div>' +
      '</div>' +
      '<div style="font-size:12.5px;color:var(--ash);margin-top:8px;line-height:1.55">' +
      esc(e.desc) + '</div>' +
      actionHtml +
      '</div>'
    );
  }

  // ---- Quick stats row (total / free / upcoming this month) ----
  function statsRow(visible) {
    var today = new Date().toISOString().slice(0, 10);
    var thisMonth = today.slice(0, 7);
    var upcoming = visible.filter(function (e) { return e.date >= today; }).length;
    var free     = visible.filter(function (e) { return e.price === 0; }).length;
    var thisM    = visible.filter(function (e) { return e.date.slice(0, 7) === thisMonth; }).length;

    function stat(n, lbl) {
      return '<div class="stat"><div class="n num">' + n + '</div><div class="l">' + esc(lbl) + '</div></div>';
    }
    // Three-up: use a flex row so the third fits
    return (
      '<div style="display:flex;gap:8px;margin-bottom:14px">' +
      stat(upcoming, 'Upcoming') +
      stat(free, 'Free entry') +
      stat(thisM, 'This month') +
      '</div>'
    );
  }

  // ---- "Your tickets" section ----
  function yourTicketsSection() {
    var tickets = RW.S.tickets || [];
    if (!tickets.length) return '';

    var rows = tickets.map(function (t) {
      var e = EVENTS.find(function (x) { return x.id === t.eventId; });
      if (!e) return '';
      var isPast = e.date < new Date().toISOString().slice(0, 10);
      var statusClass = isPast ? 'pill-status neutral' : 'pill-status ok';
      var statusText  = isPast ? 'Used' : '✓ Confirmed';
      return (
        '<div class="row" style="border-bottom:1px solid var(--mist);padding:11px 0">' +
        '<div class="lead" style="font-size:22px;background:var(--green-soft);border-radius:12px">' +
        e.emoji + '</div>' +
        '<div class="body">' +
        '<div class="name" style="font-size:14px;font-weight:700">' + esc(e.name) + '</div>' +
        '<div class="sub">' + fmtDate(e.date) + ' · ' + esc(e.venue) + '</div>' +
        '</div>' +
        '<div class="trail" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
        '<div class="' + statusClass + '" style="font-size:11px">' + statusText + '</div>' +
        '<div class="num" style="font-size:11px;color:var(--ash)">' + esc(t.ref) + '</div>' +
        '</div>' +
        '</div>'
      );
    }).filter(Boolean).join('');

    if (!rows) return '';

    var total = tickets.length;
    return (
      RW.ui.sectionTitle('🎫 Your tickets (' + total + ')') +
      '<div class="card" style="padding:0 14px">' + rows + '</div>'
    );
  }

  // ---- Main render ----
  function render() {
    var catFilter = RW.S.evtCat || '';
    var monFilter = RW.S.evtMon || '';

    var sorted = EVENTS.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });

    var visible = sorted.filter(function (e) {
      if (catFilter && e.cat !== catFilter) return false;
      if (monFilter && e.date.slice(5, 7) !== monFilter) return false;
      return true;
    });

    var heroHtml = RW.ui.hero({
      emoji: '🎉',
      title: "What’s On in Gibraltar",
      sub: 'Culture, music, food & more on the Rock',
      accent: '#d4112a',
      chips: ['National Day 10 Sep', 'Casemates', 'Victoria Stadium', 'Europa Point'],
    });

    var filterCats = RW.ui.chips(CAT_FILTERS, catFilter, 'evtFilterCat', true);
    var filterMons = RW.ui.chips(MONTH_FILTERS, monFilter, 'evtFilterMon', false);

    var cards;
    if (visible.length === 0) {
      cards = RW.ui.empty(
        '🗓️',
        'No events match those filters.\nTry a different month or category.',
        'Clear filters',
        '#/events'
      );
    } else {
      cards = visible.map(eventCard).join('');
    }

    var ticketsHtml = yourTicketsSection();
    var upcomingTitle = ticketsHtml ? RW.ui.sectionTitle('Upcoming events') : '';

    var body =
      filterCats +
      filterMons +
      (visible.length ? statsRow(visible) : '') +
      ticketsHtml +
      upcomingTitle +
      cards;

    return RW.ui.screen({ title: "What’s On", hero: heroHtml, body: body });
  }

  // ---- Register ----
  RW.register({
    id: 'events',
    title: "What’s On",
    emoji: '🎉',
    tileBg: '#fff4d6',
    section: 'explore',
    order: 10,
    render: render,
    homeOrder: 30,

    homeCard: function () {
      var e = RW.api.nextEvent();
      if (!e) return '';
      var d = new Date(e.date + 'T00:00:00');
      var dayNum = d.getDate();
      var mon = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
      var ticket = (RW.S.tickets || []).find(function (t) { return t.eventId === e.id; });

      var priceTag = e.price
        ? '<span class="num" style="font-size:13px;font-weight:800;color:var(--brand)">' +
          money(e.price) + '</span>'
        : '<span style="font-size:12px;font-weight:800;color:var(--green)">Free</span>';

      var statusBadge = ticket
        ? '<div class="pill-status ok" style="font-size:10.5px;margin-top:4px">✓ Booked</div>'
        : '';

      return (
        RW.ui.sectionTitle('Coming up', 'See all', '#/events') +
        '<div class="card" data-act="nav" data-route="#/events" style="cursor:pointer;' +
        'border-left:3px solid ' + e.accent + '">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="background:' + e.accent + '18;border-radius:12px;padding:7px 10px;' +
        'text-align:center;flex:0 0 auto">' +
        '<div class="num" style="font-size:20px;font-weight:900;color:' + e.accent +
        ';line-height:1">' + dayNum + '</div>' +
        '<div style="font-size:9.5px;font-weight:700;color:var(--ash);letter-spacing:.5px">' +
        esc(mon) + '</div>' +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:800;font-size:14.5px;line-height:1.2">' +
        esc(e.name) + '</div>' +
        '<div style="font-size:12px;color:var(--ash);margin-top:2px">' +
        '📍 ' + esc(e.venue) + '</div>' +
        statusBadge +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:0 0 auto">' +
        '<div style="font-size:24px">' + e.emoji + '</div>' +
        priceTag +
        '</div>' +
        '</div></div>'
      );
    },

    actions: {
      ticket: function (el) {
        var e = EVENTS.find(function (x) { return x.id === el.dataset.id; });
        if (!e) return;
        RW.S.tickets = RW.S.tickets || [];
        if (RW.S.tickets.find(function (t) { return t.eventId === e.id; })) return;
        if (e.price && !RW.store.debit(e.price, e.name + ' ticket')) {
          RW.toast('Top up your wallet first');
          RW.go('#/wallet');
          return;
        }
        RW.S.tickets.push({ eventId: e.id, ref: ref('EV'), t: Date.now() });
        RW.store.save();
        RW.toast(e.price ? 'Ticket purchased 🎫' : "You’re on the list 🎉");
        RW.render();
      },

      evtFilterCat: function (el) {
        var v = el.dataset.v || '';
        RW.S.evtCat = (v === (RW.S.evtCat || '')) ? '' : v;
        RW.store.save();
        RW.render();
      },

      evtFilterMon: function (el) {
        var v = el.dataset.v || '';
        RW.S.evtMon = (v === (RW.S.evtMon || '')) ? '' : v;
        RW.store.save();
        RW.render();
      },
    },
  });
})(window.RW);
