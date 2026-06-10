/* Rockway feature — Explore (Gibraltar attractions, experiences & info). */
(function (RW) {
  'use strict';
  const { esc, ref, fmtTime } = RW.util;

  // ---- Attractions & experiences ----
  // Prices shown are operator prices (Rockway does NOT take payment).
  //   Upper Rock combined ticket ~£19 adult
  //   GTA shared Rock Tour ~£22-25 pp (incl. Nature Reserve entry)
  //   Dolphin watching ~£30 adult (~2 h)
  //   Europa Point, Med Steps: free entry
  const ATTRACTIONS = [
    {
      id: 'upper-rock',
      name: 'Upper Rock Nature Reserve',
      emoji: '\u{1F98D}',
      fromPrice: 19,
      free: false,
      area: 'Upper Rock',
      category: 'nature',
      blurb: 'Six iconic sites on the Rock in one combined ticket — St Michael\'s Cave, Apes\' Den (Europe\'s only wild Barbary macaques), Great Siege Tunnels (carved 1779–83), Moorish Castle Tower of Homage (c. 1333), the Skywalk glass platform at 340 m, and Windsor Suspension Bridge spanning a 50 m gorge.',
      sub: 'St Michael\'s Cave · Apes\' Den · Great Siege Tunnels · Skywalk · Windsor Bridge',
      note: 'Reach the Upper Rock by Gibraltar Taxi Association tour (Casemates Square or Cathedral Square ranks) or on foot. Pay the operator on the day.',
    },
    {
      id: 'dolphin-watching',
      name: 'Dolphin Watching',
      emoji: '\u{1F42C}',
      fromPrice: 30,
      free: false,
      area: 'Bay of Gibraltar',
      category: 'nature',
      blurb: 'Boat safari into the Bay of Gibraltar to spot common, bottlenose and striped dolphins — three resident species that feed here year-round. One of the finest dolphin-watching sites in Europe. Departs Ocean Village marina; approximately two hours.',
      sub: 'Bay of Gibraltar · Ocean Village · ~2 hours',
      note: 'Book directly with boat operators at Ocean Village marina.',
    },
    {
      id: 'med-steps',
      name: 'Mediterranean Steps Hike',
      emoji: '\u{1F97E}',
      fromPrice: 0,
      free: true,
      area: 'Upper Rock (east face)',
      category: 'nature',
      blurb: 'A strenuous, spectacular trail climbing the eastern face of the Rock from Jews\' Gate to the Upper Rock ridge. Rare flora, Barbary macaques, kestrels and panoramic views across three countries and two continents. Free entry.',
      sub: 'Eastern face · ~2 h · Guided hike · Free',
      note: null,
    },
    {
      id: 'st-michaels-cave',
      name: 'St Michael\'s Cave',
      emoji: '⛪',
      fromPrice: 0,
      free: false,
      area: 'Upper Rock',
      category: 'caves',
      blurb: 'A breathtaking natural limestone grotto deep inside the Rock, with cathedral-scale stalactite and stalagmite formations. The main chamber doubles as a concert and event venue. Included in the Upper Rock combined ticket; accessible on foot or by taxi tour.',
      sub: 'Upper Rock Nature Reserve · Included in combined ticket',
      note: 'Covered by the Upper Rock combined ticket — reserve via Upper Rock Nature Reserve above.',
    },
    {
      id: 'skywalk',
      name: 'Skywalk & Windsor Bridge',
      emoji: '\u{1F309}',
      fromPrice: 0,
      free: false,
      area: 'Upper Rock, 340 m',
      category: 'views',
      blurb: 'The Skywalk is a cantilevered glass platform at 340 m — higher than the Shard — with 360° views over the Strait of Gibraltar, Morocco, Spain and the Atlantic. Windsor Suspension Bridge spans a 50 m gorge minutes away. Both are included in the Upper Rock combined ticket.',
      sub: 'Upper Rock · 340 m elevation · Views to Africa & Spain',
      note: 'Covered by the Upper Rock combined ticket.',
    },
    {
      id: 'europa-point',
      name: 'Europa Point & Lighthouse',
      emoji: '\u{1F3DB}️',
      fromPrice: 0,
      free: true,
      area: 'Europa Point',
      category: 'views',
      blurb: 'The southernmost tip of the Rock, where the Atlantic meets the Mediterranean. On a clear day Morocco is just 14 km across the Strait. The lighthouse has guided ships since 1841; Ibrahim-al-Ibrahim Mosque stands nearby. Bus Route 3 from the Air Terminal.',
      sub: 'Southernmost point of Gibraltar · Free entry · Views to Africa',
      note: null,
    },
    {
      id: 'gta-rock-tour',
      name: 'GTA Rock Tour',
      emoji: '\u{1F696}',
      fromPrice: 22,
      free: false,
      area: 'Upper Rock & Europa Point',
      category: 'tours',
      blurb: 'The classic way to see the Rock — a guided tour with a licensed Gibraltar Taxi Association driver. Shared minibus tours run ~£22–25 pp with Nature Reserve entry included. Private tours from ~£360 per vehicle (up to 6 people). Book at Casemates Square or Cathedral Square taxi ranks.',
      sub: 'Casemates Sq · Cathedral Sq · Shared ~£22–25 pp',
      note: 'Private tour: ~£360/vehicle (up to 6). VIP unlimited: ~£200/hour (2-h min). Nature Reserve entry included. Pay the driver directly.',
    },
  ];

  // Cable car: CLOSED for refurbishment — do NOT sell tickets.
  const CABLE_CAR = {
    id: 'cable-car',
    name: 'Gibraltar Cable Car',
    emoji: '\u{1F6A1}',
    area: 'Upper Rock, 412 m',
    blurb: 'The cable car to the Top Station (412 m, 6 minutes) is closed for a full refurbishment and is expected to reopen in 2027. While closed, reach the Upper Rock by Gibraltar Taxi Association tour or on foot via the Mediterranean Steps. The Skywalk, St Michael\'s Cave and Apes\' Den remain open via the combined Nature Reserve ticket.',
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
  function reservations() { return (RW.S.reservations = RW.S.reservations || []); }
  function myExploreItems() {
    return reservations().filter(function (r) { return r.kind === 'explore'; });
  }
  function holding(attractionName) {
    return myExploreItems().find(function (r) { return r.name === attractionName; });
  }
  function getFilter() { return RW.S._exploreFilter || 'all'; }

  // ---- render helpers ----
  function matchesFilter(a, filter) {
    if (filter === 'all') return true;
    if (filter === 'free') return a.free === true;
    return a.category === filter;
  }

  function priceBadge(a) {
    if (a.free) {
      return '<span class="pill-status ok" style="font-size:11px;padding:3px 8px">Free</span>';
    }
    return (
      '<span style="font-size:10.5px;font-weight:700;color:var(--ash)">From </span>' +
      '<span class="num" style="font-weight:800;font-size:15px;color:var(--ink)">£' + esc(String(a.fromPrice)) + '</span>'
    );
  }

  function attractionCard(a) {
    var held = holding(a.name);

    var trailHtml = priceBadge(a);

    var areaHtml = a.area
      ? '<span class="chip" style="font-size:10.5px;margin-top:4px;display:inline-block">' + esc(a.area) + '</span>'
      : '';

    // operator price info line (shown when there is a price)
    var priceInfoHtml = (!a.free && a.fromPrice > 0)
      ? '<div class="muted tiny" style="margin-top:5px;font-style:italic">From £' + esc(String(a.fromPrice)) + ' · pay the operator</div>'
      : '';

    var bottomHtml;
    if (held) {
      bottomHtml =
        '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">' +
        '<span class="pill-status ok">Reserved ✓ · ref <span class="num">' + esc(held.ref) + '</span></span>' +
        '<span style="font-size:12px;color:var(--ash);font-weight:600">' + fmtTime(held.t) + '</span>' +
        '</div>';
    } else {
      var btnLabel = a.free ? 'Add to my list · Free' : 'Reserve / Enquire';
      bottomHtml =
        '<button class="btn ghost sm" style="margin-top:12px;width:100%"' +
        ' data-act="exploreReserve" data-id="' + esc(a.id) + '">' +
        btnLabel +
        '</button>';
    }

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
        priceInfoHtml +
        noteHtml +
        bottomHtml +
      '</div>'
    );
  }

  // ---- "Your list" reservation row ----
  function reservationRow(r) {
    var attraction = ATTRACTIONS.find(function (a) { return a.name === r.name; });
    var emoji = attraction ? attraction.emoji : '\u{1F3AB}';
    var whenStr = r.when || 'Flexible';
    return (
      '<div class="row">' +
        '<div class="lead" style="font-size:22px">' + emoji + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(r.name) + '</div>' +
          '<div class="sub">Ref <span class="num">' + esc(r.ref) + '</span> · ' + esc(whenStr) + ' · ' + fmtTime(r.t) + '</div>' +
        '</div>' +
        '<div class="trail">' +
          '<span class="pill-status ok" style="font-size:12px">Reserved</span>' +
        '</div>' +
      '</div>'
    );
  }

  // ---- render ----
  function render() {
    var mine = myExploreItems();
    var filter = getFilter();

    // ---- hero ----
    var heroHtml = RW.ui.hero({
      emoji: '\u{1F9ED}',
      title: 'Explore Gibraltar',
      sub: 'The Rock, its caves, viewpoints & wildlife',
      accent: '#1a4d7c',
      chips: ['Upper Rock', 'Europa Point', 'Bay of Gibraltar', 'Mediterranean Steps'],
    });

    // ---- quick stats strip ----
    var paid = ATTRACTIONS.filter(function (a) { return !a.free && a.fromPrice > 0; }).length;
    var free = ATTRACTIONS.filter(function (a) { return a.free; }).length;
    var listed = mine.length;
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

    // ---- "Your list" section ----
    var listSection = '';
    if (mine.length) {
      listSection =
        RW.ui.sectionTitle('Your list') +
        '<div class="card" style="padding:0">' +
          mine.map(reservationRow).join('') +
        '</div>';
    } else if (filter === 'all') {
      listSection =
        RW.ui.sectionTitle('Your list') +
        RW.ui.empty('\u{1F5FA}️', 'Nothing on your list yet — reserve an experience below.');
    }

    // ---- attraction cards ----
    var visible = ATTRACTIONS.filter(function (a) { return matchesFilter(a, filter); });
    var attractionCards = visible.length
      ? visible.map(attractionCard).join('')
      : RW.ui.empty('\u{1F52D}', 'No attractions in this category.');

    // ---- cable car closed card ----
    var showCableCar = (filter === 'all' || filter === 'views');
    var cableCarCard = '';
    if (showCableCar) {
      var notified = (RW.S._cableCarNotify === true);
      var notifyHtml = notified
        ? '<div style="margin-top:10px"><span class="pill-status info">\u{1F514} Notify set ✓</span></div>'
        : '<button class="btn ghost sm" style="margin-top:12px;width:100%"' +
          ' data-act="exploreNotify" data-id="' + esc(CABLE_CAR.id) + '">' +
          '\u{1F514} Notify me when it reopens' +
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
      listSection +
      RW.ui.sectionTitle('Attractions & Experiences') +
      attractionCards +
      cableCarCard;

    return RW.ui.screen({ title: 'Explore', hero: heroHtml, body: body });
  }

  // ---- register feature ----
  RW.register({
    id: 'explore',
    title: 'Explore',
    emoji: '\u{1F9ED}',
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

      exploreReserve: function (el) {
        var id = el.dataset.id;
        var attraction = ATTRACTIONS.find(function (a) { return a.id === id; });
        if (!attraction) return;
        if (holding(attraction.name)) { RW.toast('Already on your list!'); return; }
        var rsvpRef = ref('EX');
        reservations().push({
          id: RW.util.uid(),
          ref: rsvpRef,
          t: Date.now(),
          kind: 'explore',
          name: attraction.name,
          when: 'Flexible',
        });
        RW.store.save();
        RW.toast('Added to your Rockway list ✓');
        RW.render();
      },

      exploreNotify: function () {
        RW.S._cableCarNotify = true;
        RW.store.save();
        RW.toast('We\'ll let you know when the cable car reopens!');
        RW.render();
      },

    },
  });

  // ---- global search: attractions & experiences ----
  RW.registerSearch(function (q) {
    return ATTRACTIONS.filter(function (a) {
      return String(a.name).toLowerCase().indexOf(q) !== -1 ||
        String(a.area || '').toLowerCase().indexOf(q) !== -1 ||
        String(a.category || '').toLowerCase().indexOf(q) !== -1;
    }).map(function (a) {
      return { group: 'Explore', label: a.name, sub: (a.area || 'Gibraltar') + (a.free ? ' \u00b7 Free' : a.fromPrice ? ' \u00b7 from \u00a3' + a.fromPrice : ''), route: '#/explore', lead: a.emoji };
    });
  });

})(window.RW);
