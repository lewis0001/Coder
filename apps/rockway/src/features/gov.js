/* Rockway feature — Gov.gi (Gibraltar government services & appointments). */
(function (RW) {
  'use strict';
  const { esc, uid, ref } = RW.util;

  const services = [
    { id: 'g-civil', name: 'Civil Status & Registration', desc: 'Birth, marriage & death certificates', emoji: '📜', bookable: true },
    { id: 'g-driving', name: 'Driving Licence Renewal', desc: 'Renew or replace your licence', emoji: '🪪', bookable: true },
    { id: 'g-id', name: 'Gibraltar ID Card', desc: 'New or renewed ID card', emoji: '🆔', bookable: true },
    { id: 'g-parking', name: 'Residential Parking Permit', desc: 'Apply or renew zone permit', emoji: '🅿️', bookable: true },
    { id: 'g-tax', name: 'Income Tax Office', desc: 'PAYE & self-assessment queries', emoji: '💷', bookable: true },
    { id: 'g-report', name: 'Report a Street Issue', desc: 'Potholes, lighting, cleanliness', emoji: '🛠️', bookable: false },
  ];

  function nextSlot() {
    const d = new Date(Date.now() + 2 * 86400000); d.setHours(10, 30, 0, 0);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) + ', 10:30';
  }

  function render() {
    const list = services.map((g) =>
      '<div class="row"><div class="lead">' + g.emoji + '</div><div class="body"><div class="name">' + esc(g.name) + '</div><div class="sub">' + esc(g.desc) + '</div></div>' +
      '<div class="trail"><button class="btn sm ' + (g.bookable ? '' : 'ghost') + '" data-act="' + (g.bookable ? 'govBook' : 'govReport') + '" data-name="' + esc(g.name) + '">' + (g.bookable ? 'Book' : 'Report') + '</button></div></div>').join('');
    const appts = RW.S.appointments.filter((a) => a.kind === 'gov').slice().reverse().map((a) =>
      '<div class="row"><div class="lead" style="background:var(--green-soft)">📅</div><div class="body"><div class="name">' + esc(a.name) + '</div><div class="sub">' + esc(a.when) + ' · Ref ' + a.ref + '</div></div></div>').join('');
    const body =
      '<div class="muted tiny" style="margin-bottom:10px">Book appointments & pay for public services</div>' +
      '<div class="card">' + list + '</div>' +
      (appts ? RW.ui.sectionTitle('Your appointments') + '<div class="card">' + appts + '</div>' : '');
    return RW.ui.screen({ title: 'Gov.gi services', body });
  }

  RW.register({
    id: 'gov', title: 'Gov.gi', emoji: '🏛️', tileBg: '#fde7ea', section: 'services', order: 10, render,
    actions: {
      govBook: (el) => {
        const when = nextSlot();
        RW.S.appointments.push({ id: uid(), kind: 'gov', name: el.dataset.name, when, ref: ref('GV') });
        RW.store.save(); RW.toast('Appointment booked: ' + when); RW.render();
      },
      govReport: () => RW.toast('Thanks — issue reported to Gov.gi 🛠️'),
    },
  });
})(window.RW);
