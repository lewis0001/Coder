/* Rockway feature — Explore (Gibraltar attractions, experiences & tickets). */
(function (RW) {
  'use strict';
  const { esc, money, ref, fmtTime } = RW.util;

  // ---- Attractions & experiences ----
  // Price notes (2026 estimates — verify with operator before release):
  //   Upper Rock combined ticket ~£19 adult
  //   GTA shared Rock Tour ~£22–25 pp (incl. Nature Reserve entry)
  //   Dolphin watching ~£30 adult (~2 h)
  //   Europa Point, Med Steps: free entry
  const ATTRACTIONS = [
    {
      id: 'upper-rock',
      name: 'Upper Rock Nature Reserve',
      emoji: '🦍',
      price: 19,
      kind: 'ticket',
      area: 'Upper Rock',
      category: 'nature',
      blurb: 'Six iconic sites on the Rock in one combined ticket — St Michael’s Cave, Apes’ Den (Europe’s only wild Barbary macaques), Great Siege Tunnels (carved 1779–83), Moorish Castle Tower of Homage (c. 1333), the Skywalk glass platform at 340 m, and Windsor Suspension Bridge spanning a 50 m gorge.',
      sub: 'St Michael’s Cave · Apes’ Den · Great Siege Tunnels · Skywalk · Windsor Bridge',
      note: 'Reach the Upper Rock by Gibraltar Taxi Association tour (Casemates Square or Cathedral Square ranks) or on foot.',
    },
    {
      id: 'dolphin-watching',
      name: 'Dolphin Watching',
      emoji: '🐬',
      price: 30,
      kind: 'ticket',
      area: 'Bay of Gibraltar',
      category: 'nature',
      blurb: 'Boat safari into the Bay of Gibraltar to spot common, bottlenose and striped dolphins — three resident species that feed here year-round. One of the finest dolphin-watching sites in Europe, right on Gibraltar’s doorstep. Departs Ocean Village marina; approximately two hours.',
      sub: 'Bay of Gibraltar · Ocean Village · ~2 hours',
      note: null,
    },
    {
      id: 'med-steps',
      name: 'Mediterranean Steps Hike',
      emoji: '🥾',
      price: 0,
      kind: 'rsvp',
      area: 'Upper Rock (east face)',
      category: 'nature',
      blurb: 'A strenuous, spectacular trail climbing the eastern face of the Rock from Jews’ Gate to the Upper Rock ridge. Rare flora, Barbary macaques, kestrels and panoramic views across three countries and two continents. A local guide brings the geology, history and wildlife to life. Free entry.',
      sub: 'Eastern face · ~2 h · Guided hike · Free',
      note: null,
    },
    {
      id: 'st-michaels-cave',
      name: "St Michael’s Cave",
      emoji: '🕌',
      price: 0,
      kind: 'rsvp',
      area: 'Upper Rock',
      category: 'caves',
      blurb: 'A breathtaking natural limestone grotto deep inside the Rock, with cathedral-scale stalactite and stalagmite formations. The main chamber doubles as a concert and event venue. Included in the Upper Rock combined ticket; accessible on foot or by taxi tour.',
      sub: 'Upper Rock Nature Reserve · Included in combined ticket',
      note: 'Covered by the Upper Rock combined ticket — book via “Upper Rock Nature Reserve” above.',
    },
    {
      id: 'skywalk',
      name: 'Skywalk & Windsor Bridge',
      emoji: '🌉',
      price: 0,
      kind: 'rsvp',
      area: 'Upper Rock, 340 m',
      category: 'views',
      blurb: 'The Skywalk is a cantilevered glass platform at 340 m — higher than the Shard — with 360° views over the Strait of Gibraltar, Morocco, Spain and the Atlantic. Windsor Suspension Bridge spans a 50 m gorge minutes away. Both are included in the Upper Rock combined ticket.',
      sub: 'Upper Rock · 340 m elevation · Views to Africa & Spain',
      note: 'Covered by the Upper Rock combined ticket.',
    },
    {
      id: 'europa-point',
      name: 'Europa Point & Lighthouse',
      emoji: '🏛️',
      price: 0,
      kind: 'rsvp',
      area: 'Europa Point',
      category: 'views',
      blurb: 'The southernmost tip of the Rock, where the Atlantic meets the Mediterranean. On a clear day Morocco is just 14 km across the Strait — Africa visible to the naked eye. The lighthouse has guided ships since 1841; Ibrahim-al-Ibrahim Mosque stands nearby. Bus Route 3 from the Air Terminal.',
      sub: 'Southernmost point of Gibraltar · Free entry · Views to Africa',
      note: null,
    },
    {
      id: 'gta-rock-tour',
      name: 'GTA Rock Tour',
      emoji: '🚖',
      price: 22,
      kind: 'ticket',
      area: 'Upper Rock & Europa Point',
      category: 'tours',
      blurb: 'The classic way to see the Rock — a guided tour with a licensed Gibraltar Taxi Association driver. Shared minibus tours run ~£22–25 pp with Nature Reserve entry included. Private tours from ~£360 per vehicle (up to 6 people). Book at Casemates Square or Cathedral Square taxi ranks.',
      sub: 'Casemates Sq · Cathedral Sq · Shared ~£22–25 pp',
      note: 'Private tour: ~£360/vehicle (up to 6). VIP unlimited: ~£200/hour (2-h min). Nature Reserve entry included in all options.',
    },
  ];

  // Cable car: CLOSED for refurbishment — do NOT sell tickets.
  const CABLE_CAR = {
    id: 'cable-car',
    name: 'Gibraltar Cable Car',
    emoji: '🚡',
    area: 'Upper Rock, 412 m',
    blurb: 'The cable car to the Top Station (412 m, 6 minutes) is closed for a full refurbishment and is expected to reopen in 2027. While closed, reach the Upper Rock by Gibraltar Taxi Association tour or on foot via the Mediterranean Steps. The Skywalk, St Michael’s Cave and Apes’ Den remain open via the combined Nature Reserve ticket.',
    reopens: '2027',
  };

  // ---- category filter chip definitions ----
  const CATEGORIES = [
    { label: 'All',    value: 'all' },
    { label: 'Nature', value: 'nature' },
    { label: 'Caves',  value: 'caves' },
    { label: 'Views',  value: 'views' },
    { label: 'Tours',  value: 'tours' },
    { label: 'Free',   value: 'free' },
  ];

  // ---- state helpers ----
  function tickets() { return (RW.S.tickets = RW.S.tickets || []); }
  function myExploreTickets() { return tickets().filter(function (t) { return t.kind === 'explore'; }); }
  function holding(attractionId) {
    return myExploreTickets().find(function (t) { return t.id === attractionId; });
  }
  function getFilter() { return RW.S._exploreFilter || 'all'; }

  // ---- render helpers ----
  function matchesFilter(a, filter) {
    if (filter === 'all') return true;
    if (filter === 'free') return a.price === 0;
    return a.category === filter;
  }

  function attractionCard(a) {
    var held = holding(a.id);
    var isFree = a.price === 0;

    // ---- price badge (trail) ----
    var trailHtml = isFree
      ? '<span class="pill-status ok" style="font-size:11px;padding:3px 8px">Free</span>'
      : '<span class="num" style="font-weight:800;font-size:15px;color:var(--ink)">£' + esc(String(a.price)) + '</span>';

    // ---- area badge ----
    var areaHtml = a.area
      ? '<span class="chip" style="font-size:10.5px;margin-top:4px;display:inline-block">' + esc(a.area) + '</span>'
      : '';

    // ---- booked / action state ----
    var bottomHtml;
    if (held) {
      bottomHtml =
        '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">' +
        '<span class="pill-status ok">✔️ Booked</span>' +
        '<span style="font-size:12px;color:var(--ash);font-weight:600">Ref <span class="num">' + esc(held.ref) + '</span> · ' + fmtTime(held.t) + '</span>' +
        '</div>';
    } else if (isFree) {
      bottomHtml =
        '<button class="btn ghost sm" style="margin-top:12px;width:100%"' +
        ' data-act="exploreRsvp" data-id="' + esc(a.id) + '">' +
        'Save to my list · Free' +
        '</button>';
    } else {
      bottomHtml =
        '<button class="btn sm" style="margin-top:12px;width:100%"' +
        ' data-act="exploreBook" data-id="' + esc(a.id) + '">' +
        'Book · <span class="num">' + money(a.price) + '</span>' +
        '</button>';
    }

    // ---- optional note ----
    var noteHtml = a.note
      ? '<div class="muted tiny" style="margin-top:6px;font-style:italic;line-height:1.5">' + esc(a.note) + '</div>'
      : '';

    return (
      '<div class="card" style="margin-bottom:10px">' +
        '<div style="display:flex;align-items:flex-start;gap:12px">' +
          '<div style="font-size:28px;line-height:1;padding-top:2px;flex:0 0 auto">' + a.emoji + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:15px;font-weight:800;letter-spacing:-0.2px">' + esc(a.name) + '</div>' +
            areaHtml +
          '</div>' +
          '<div style="flex:0 0 auto;padding-top:2px">' + trailHtml + '</div>' +
        '</div>' +
        '<div class="muted tiny" style="margin-top:9px;line-height:1.6">' + esc(a.blurb) + '</div>' +
        '<div class="muted tiny" style="margin-top:5px;color:var(--slate)">' + esc(a.sub) + '</div>' +
        noteHtml +
        bottomHtml +
      '</div>'
    );
  }

  // ---- "Your tickets" ticket row ----
  function ticketRow(t) {
    var attraction = ATTRACTIONS.find(function (a) { return a.id === t.id; });
    var label = attraction ? attraction.name : t.name;
    var emoji = attraction ? attraction.emoji : '🎫';
    var priceStr = (t.price > 0) ? money(t.price) : 'Free';
    return (
      '<div class="row">' +
        '<div class="lead" style="font-size:22px">' + emoji + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(label) + '</div>' +
          '<div class="sub">Ref <span class="num">' + esc(t.ref) + '</span> · ' + fmtTime(t.t) + '</div>' +
        '</div>' +
        '<div class="trail">' +
          '<span class="pill-status ok" style="font-size:12px"><span class="num">' + esc(priceStr) + '</span></span>' +
        '</div>' +
      '</div>'
    );
  }

  // ---- render ----
  function render() {
    var mine = myExploreTickets();
    var filter = getFilter();

    // ---- hero ----
    var heroHtml = RW.ui.hero({
      emoji: '🧭',
      title: 'Explore Gibraltar',
      sub: 'The Rock, its caves, viewpoints & wildlife',
      accent: '#1a4d7c',
      chips: ['Upper Rock', 'Europa Point', 'Bay of Gibraltar', 'Mediterranean Steps'],
    });

    // ---- quick stats strip ----
    var paid = ATTRACTIONS.filter(function (a) { return a.price > 0; }).length;
    var free = ATTRACTIONS.filter(function (a) { return a.price === 0; }).length;
    var booked = mine.length;
    var statsHtml =
      '<div class="grid2" style="margin-bottom:14px">' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--brand)">' + paid + '</div>' +
          '<div class="l">Paid experiences</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--green)">' + free + '</div>' +
          '<div class="l">Free attractions</div>' +
        '</div>' +
      '</div>';

    // ---- category filter chips ----
    var filterChips = RW.ui.chips(CATEGORIES, filter, 'exploreFilter', true);

    // ---- "Your tickets" section ----
    var ticketsSection = '';
    if (mine.length) {
      ticketsSection =
        RW.ui.sectionTitle('Your tickets') +
        '<div class="card" style="padding:0">' +
          mine.map(ticketRow).join('') +
        '</div>';
    } else if (filter === 'all') {
      ticketsSection =
        RW.ui.sectionTitle('Your tickets') +
        RW.ui.empty('🎫', 'No tickets yet — book an experience below.');
    }

    // ---- attraction cards ----
    var visible = ATTRACTIONS.filter(function (a) { return matchesFilter(a, filter); });
    var attractionCards = visible.length
      ? visible.map(attractionCard).join('')
      : RW.ui.empty('🔭', 'No attractions in this category.');

    // ---- cable car closed card ----
    var showCableCar = (filter === 'all' || filter === 'views');
    var cableCarCard = '';
    if (showCableCar) {
      var notified = (RW.S._cableCarNotify === true);
      var notifyHtml = notified
        ? '<div style="margin-top:10px"><span class="pill-status info">🔔 Notify set ✔</span></div>'
        : '<button class="btn ghost sm" style="margin-top:12px;width:100%"' +
          ' data-act="exploreNotify" data-id="' + esc(CABLE_CAR.id) + '">' +
          '🔔 Notify me when it reopens' +
          '</button>';

      cableCarCard =
        RW.ui.sectionTitle('Cable Car') +
        '<div class="card" style="opacity:0.9;margin-bottom:10px">' +
          '<div style="display:flex;align-items:flex-start;gap:12px">' +
            '<div style="font-size:28px;line-height:1;padding-top:2px;flex:0 0 auto">' + CABLE_CAR.emoji + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:15px;font-weight:800;letter-spacing:-0.2px">' + esc(CABLE_CAR.name) + '</div>' +
              '<span class="chip" style="font-size:10.5px;margin-top:4px;display:inline-block">' + esc(CABLE_CAR.area) + '</span>' +
            '</div>' +
            '<div style="flex:0 0 auto;padding-top:2px">' +
              '<span class="pill-status warn" style="font-size:11px;padding:3px 8px">Closed</span>' +
            '</div>' +
          '</div>' +
          '<div class="muted tiny" style="margin-top:9px;line-height:1.6">' + esc(CABLE_CAR.blurb) + '</div>' +
          '<div class="muted tiny" style="margin-top:5px">Expected to reopen: <strong>' + esc(CABLE_CAR.reopens) + '</strong></div>' +
          notifyHtml +
        '</div>';
    }

    var body =
      statsHtml +
      filterChips +
      ticketsSection +
      RW.ui.sectionTitle('Attractions & Experiences') +
      attractionCards +
      cableCarCard;

    return RW.ui.screen({ title: 'Explore', hero: heroHtml, body: body });
  }

  // ---- register activity provider ----
  RW.registerActivity(function () {
    return myExploreTickets().map(function (t) {
      var attraction = ATTRACTIONS.find(function (a) { return a.id === t.id; });
      var label = attraction ? attraction.name : t.name;
      var emoji = attraction ? attraction.emoji : '🎫';
      var priceStr = (t.price > 0) ? money(t.price) : 'Free';
      return {
        t: t.t,
        html:
          '<div class="card row" style="cursor:pointer" data-act="nav" data-route="#/explore">' +
            '<div class="lead" style="font-size:22px">' + emoji + '</div>' +
            '<div class="body">' +
              '<div class="name">' + esc(label) + '</div>' +
              '<div class="sub">Ref <span class="num">' + esc(t.ref) + '</span> · ' + fmtTime(t.t) + '</div>' +
            '</div>' +
            '<div class="trail"><span class="num">' + esc(priceStr) + '</span></div>' +
          '</div>',
      };
    });
  });

  // ---- register feature ----
  RW.register({
    id: 'explore',
    title: 'Explore',
    emoji: '🧭',
    tileBg: '#fff4d6',
    section: 'explore',
    order: 20,
    render: render,
    actions: {

      exploreFilter: function (el) {
        RW.S._exploreFilter = el.dataset.v || 'all';
        RW.store.save();
        RW.render();
      },

      exploreBook: function (el) {
        var id = el.dataset.id;
        var attraction = ATTRACTIONS.find(function (a) { return a.id === id; });
        if (!attraction) return;
        if (holding(id)) { RW.toast('Already booked!'); return; }
        if (!RW.store.debit(attraction.price, attraction.name + ' ticket')) {
          RW.toast('Insufficient funds — top up your wallet first');
          RW.go('#/wallet');
          return;
        }
        var ticketRef = ref('EX');
        tickets().push({
          id: attraction.id,
          t: Date.now(),
          kind: 'explore',
          name: attraction.name,
          ref: ticketRef,
          price: attraction.price,
        });
        RW.store.save();
        RW.toast('Booked! Ref: ' + ticketRef);
        RW.render();
      },

      exploreRsvp: function (el) {
        var id = el.dataset.id;
        var attraction = ATTRACTIONS.find(function (a) { return a.id === id; });
        if (!attraction) return;
        if (holding(id)) { RW.toast('Already saved!'); return; }
        var ticketRef = ref('EX');
        tickets().push({
          id: attraction.id,
          t: Date.now(),
          kind: 'explore',
          name: attraction.name,
          ref: ticketRef,
          price: 0,
        });
        RW.store.save();
        RW.toast('Saved to your list · ' + ticketRef);
        RW.render();
      },

      exploreNotify: function () {
        RW.S._cableCarNotify = true;
        RW.store.save();
        RW.toast('We’ll let you know when the cable car reopens — te llamo p’atrá!');
        RW.render();
      },

    },
  });
})(window.RW);
