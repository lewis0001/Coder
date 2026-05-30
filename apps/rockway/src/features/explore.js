/* Rockway feature — Explore (Gibraltar attractions, experiences & tickets). */
(function (RW) {
  'use strict';
  const { esc, money, ref, fmtTime } = RW.util;

  // ---- Attractions & experiences ----
  // Upper Rock Nature Reserve: combined ticket covers St Michael's Cave,
  // Apes' Den, Great Siege Tunnels, Moorish Castle, Skywalk, Windsor
  // Suspension Bridge — ~£19 adult (2026 estimate).
  const ATTRACTIONS = [
    {
      id: 'upper-rock',
      name: 'Upper Rock Nature Reserve',
      emoji: '🦍',
      price: 19,
      kind: 'ticket',
      blurb: 'Combined ticket to six iconic sites on the Rock: St Michael\'s Cave (a vast limestone grotto used for concerts), Apes\' Den (home of Europe\'s only wild Barbary macaques), Great Siege Tunnels (carved 1779–83), Moorish Castle Tower of Homage (c. 1333), the Skywalk glass platform at 340 m, and Windsor Suspension Bridge over a 50 m gorge. Walk it independently or join a taxi tour via the Gibraltar Taxi Association.',
      sub: 'St Michael\'s Cave · Apes\' Den · Great Siege Tunnels · Moorish Castle · Skywalk · Windsor Bridge',
      note: 'Rock tours are run by the Gibraltar Taxi Association — book directly with your driver at Casemates or Cathedral Square ranks.',
    },
    {
      id: 'dolphin-watching',
      name: 'Dolphin Watching in the Bay',
      emoji: '🐬',
      price: 30,
      kind: 'ticket',
      blurb: 'Boat safari into the Bay of Gibraltar to spot common, bottlenose and striped dolphins. The bay is one of the best dolphin-watching sites in Europe — these waters feed and shelter three resident species year-round.',
      sub: 'Bay of Gibraltar · ~2 hours · Adult ~£30',
      note: null,
    },
    {
      id: 'europa-point',
      name: 'Europa Point & Lighthouse',
      emoji: '🏛️',
      price: 0,
      kind: 'rsvp',
      blurb: 'The southernmost tip of the Rock, where the Atlantic meets the Mediterranean. On clear days you can see Morocco across the Strait — Africa just 14 km away. Ibrahim-al-Ibrahim Mosque stands nearby; the lighthouse has guided ships since 1841. Reachable by Bus Route 3 from the Air Terminal.',
      sub: 'Southernmost point of Gibraltar · Free entry · Views to Africa',
      note: null,
    },
    {
      id: 'med-steps',
      name: 'Mediterranean Steps Guided Hike',
      emoji: '🥾',
      price: 0,
      kind: 'rsvp',
      blurb: 'A strenuous but spectacular trail climbing the eastern face of the Rock from Jews\' Gate to the Upper Rock ridge. Rare flora, Barbary macaques, kestrels and panoramic views across three countries and two continents. Join a guided hike — a local guide brings the geology, history and wildlife to life.',
      sub: 'Eastern face of the Rock · ~2 h · Guided hike · Free',
      note: null,
    },
  ];

  // Cable car: CLOSED for refurbishment — do NOT sell tickets.
  const CABLE_CAR = {
    id: 'cable-car',
    name: 'Gibraltar Cable Car',
    emoji: '🚡',
    blurb: 'The cable car to the Top Station (412 m, 6 minutes) is temporarily closed for a full refurbishment. It is expected to reopen in 2027. In the meantime, reach the Upper Rock by taxi tour (Gibraltar Taxi Association) or on foot via the Mediterranean Steps.',
    reopens: '2027',
  };

  // ---- state helpers ----
  function tickets() { return (RW.S.tickets = RW.S.tickets || []); }
  function myExploreTickets() { return tickets().filter(function (t) { return t.kind === 'explore'; }); }
  function holding(attractionId) {
    return myExploreTickets().find(function (t) { return t.id === attractionId; });
  }

  // ---- render ----
  function render() {
    var mine = myExploreTickets();

    // ---- attraction cards ----
    var attractionCards = ATTRACTIONS.map(function (a) {
      var held = holding(a.id);
      var isFree = a.price === 0;
      var priceLabel = isFree ? 'Free' : money(a.price);
      var statusHtml = '';
      var actionHtml = '';

      if (held) {
        statusHtml = '<div class="pill-status ok" style="margin-top:10px">Booked ✓ &nbsp;·&nbsp; Ref: ' + esc(held.ref) + '</div>';
      } else if (isFree) {
        actionHtml = '<button class="btn ghost sm" style="margin-top:10px;width:100%" data-act="exploreRsvp" data-id="' + esc(a.id) + '">Save to my list · Free</button>';
      } else {
        actionHtml = '<button class="btn sm" style="margin-top:10px;width:100%" data-act="exploreBook" data-id="' + esc(a.id) + '">Book · ' + priceLabel + '</button>';
      }

      var noteHtml = a.note ? '<div class="muted tiny" style="margin-top:6px;font-style:italic">' + esc(a.note) + '</div>' : '';

      return '<div class="card">' +
        '<div class="row" style="border:0;padding:0">' +
        '<div class="lead" style="font-size:26px">' + a.emoji + '</div>' +
        '<div class="body">' +
        '<div class="name" style="font-size:15px">' + esc(a.name) + '</div>' +
        '<div class="sub">' + esc(a.sub) + '</div>' +
        '</div>' +
        '<div class="trail">' + priceLabel + '</div>' +
        '</div>' +
        '<div class="muted tiny" style="margin-top:8px">' + esc(a.blurb) + '</div>' +
        noteHtml +
        (statusHtml || actionHtml) +
        '</div>';
    }).join('');

    // ---- cable car closed card ----
    var cableCarCard = '<div class="card" style="opacity:0.85">' +
      '<div class="row" style="border:0;padding:0">' +
      '<div class="lead" style="font-size:26px">' + CABLE_CAR.emoji + '</div>' +
      '<div class="body">' +
      '<div class="name" style="font-size:15px">' + esc(CABLE_CAR.name) + '</div>' +
      '<div class="sub"><span class="pill-status warn" style="font-size:11px">Closed — reopening ' + esc(CABLE_CAR.reopens) + '</span></div>' +
      '</div>' +
      '</div>' +
      '<div class="muted tiny" style="margin-top:8px">' + esc(CABLE_CAR.blurb) + '</div>' +
      '<button class="btn ghost sm" style="margin-top:10px;width:100%" data-act="exploreNotify" data-id="' + esc(CABLE_CAR.id) + '">Notify me when it reopens</button>' +
      '</div>';

    // ---- my tickets section ----
    var ticketsSection = '';
    if (mine.length) {
      var ticketRows = mine.map(function (t) {
        var attraction = ATTRACTIONS.find(function (a) { return a.id === t.id; });
        var label = attraction ? attraction.name : t.name;
        var emoji = attraction ? attraction.emoji : '🎟️';
        var priceStr = t.price > 0 ? money(t.price) : 'Free';
        return '<div class="row">' +
          '<div class="lead" style="font-size:22px">' + emoji + '</div>' +
          '<div class="body">' +
          '<div class="name">' + esc(label) + '</div>' +
          '<div class="sub">Ref: ' + esc(t.ref) + ' &nbsp;·&nbsp; ' + fmtTime(t.t) + '</div>' +
          '</div>' +
          '<div class="trail pill-status ok" style="font-size:12px">' + priceStr + '</div>' +
          '</div>';
      }).join('');

      ticketsSection = RW.ui.sectionTitle('Your tickets') +
        '<div class="card" style="padding:0">' + ticketRows + '</div>';
    }

    var body = ticketsSection +
      RW.ui.sectionTitle('Attractions & Experiences') +
      attractionCards +
      RW.ui.sectionTitle('Cable Car') +
      cableCarCard;

    return RW.ui.screen({ title: 'Explore', body: body });
  }

  // ---- register activity provider ----
  RW.registerActivity(function () {
    return myExploreTickets().map(function (t) {
      var attraction = ATTRACTIONS.find(function (a) { return a.id === t.id; });
      var label = attraction ? attraction.name : t.name;
      var emoji = attraction ? attraction.emoji : '🎟️';
      var priceStr = t.price > 0 ? money(t.price) : 'Free';
      return {
        t: t.t,
        html: '<div class="card row" style="cursor:pointer" data-act="nav" data-route="#/explore">' +
          '<div class="lead" style="font-size:22px">' + emoji + '</div>' +
          '<div class="body">' +
          '<div class="name">' + esc(label) + '</div>' +
          '<div class="sub">Ref: ' + esc(t.ref) + ' &nbsp;·&nbsp; ' + fmtTime(t.t) + '</div>' +
          '</div>' +
          '<div class="trail">' + priceStr + '</div>' +
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
      exploreNotify: function (el) {
        RW.toast('We\'ll let you know when the cable car reopens — ¡te llamo p\'atrá!');
      },
    },
  });
})(window.RW);
