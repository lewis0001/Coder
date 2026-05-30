/* Rockway feature — What's On (events & ticketing). */
(function (RW) {
  'use strict';
  const { esc, money, fmtDate, ref } = RW.util;

  const events = [
    { id: 'e1', name: 'Gibraltar National Day', date: '2026-09-10', venue: 'Casemates Square', emoji: '🇬🇮', price: 0, desc: 'A sea of red & white. Concerts, balloon release & parades.' },
    { id: 'e2', name: 'Calentita Food Festival', date: '2026-06-26', venue: 'Casemates Square', emoji: '🫓', price: 0, desc: 'Gibraltar’s big night of food, music and culture.' },
    { id: 'e3', name: 'Gibraltar Music Festival', date: '2026-07-18', venue: 'Victoria Stadium', emoji: '🎸', price: 55, desc: 'Headline acts under the Rock.' },
    { id: 'e4', name: 'Mediterranean Sunset Yoga', date: '2026-05-31', venue: 'Europa Point', emoji: '🧘', price: 8, desc: 'Golden hour flow facing Africa.' },
    { id: 'e5', name: 'Trafalgar Cemetery Heritage Walk', date: '2026-06-05', venue: 'Trafalgar Cemetery', emoji: '🪦', price: 5, desc: 'Guided history of Gibraltar’s past.' },
  ];
  RW.api.nextEvent = () => events.slice().sort((a, b) => a.date.localeCompare(b.date))[0];

  function render() {
    const list = events.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
      const has = RW.S.tickets.find((t) => t.eventId === e.id);
      return '<div class="card"><div class="row" style="border:0;padding:0"><div class="lead" style="font-size:26px">' + e.emoji + '</div>' +
        '<div class="body"><div class="name" style="font-size:15px">' + esc(e.name) + '</div><div class="sub">' + fmtDate(e.date) + ' · 📍 ' + esc(e.venue) + '</div></div>' +
        '<div class="trail">' + (e.price ? money(e.price) : 'Free') + '</div></div>' +
        '<div class="muted tiny" style="margin-top:8px">' + esc(e.desc) + '</div>' +
        (has ? '<div class="pill-status ok" style="margin-top:10px">✓ Ticket booked · ' + has.ref + '</div>'
             : '<button class="btn sm ' + (e.price ? '' : 'ghost') + '" style="margin-top:10px;width:100%" data-act="ticket" data-id="' + e.id + '">' + (e.price ? 'Get ticket · ' + money(e.price) : 'RSVP · Free') + '</button>') + '</div>';
    }).join('');
    return RW.ui.screen({ title: "What's On", body: '<div class="muted tiny" style="margin-bottom:10px">Events & culture across Gibraltar</div>' + list });
  }

  RW.register({
    id: 'events', title: "What's On", emoji: '🎉', tileBg: '#fff4d6', section: 'explore', order: 10, render,
    homeOrder: 30,
    homeCard: () => {
      const e = RW.api.nextEvent();
      return RW.ui.sectionTitle('Coming up', 'See all', '#/events') +
        '<div class="card row" data-act="nav" data-route="#/events" style="cursor:pointer"><div class="lead">' + e.emoji + '</div>' +
        '<div class="body"><div class="name">' + esc(e.name) + '</div><div class="sub">' + fmtDate(e.date) + ' · ' + esc(e.venue) + '</div></div>' +
        '<div class="trail">' + (e.price ? money(e.price) : 'Free') + '</div></div>';
    },
    actions: {
      ticket: (el) => {
        const e = events.find((x) => x.id === el.dataset.id);
        if (!e) return;
        if (e.price && !RW.store.debit(e.price, e.name + ' ticket')) { RW.toast('Top up your wallet first'); RW.go('#/wallet'); return; }
        RW.S.tickets.push({ eventId: e.id, ref: ref('EV') }); RW.store.save();
        RW.toast(e.price ? 'Ticket purchased 🎟️' : 'You’re on the list 🎉'); RW.render();
      },
    },
  });
})(window.RW);
