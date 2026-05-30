/* Rockway feature — Gov.gi (Gibraltar government eServices, appointments & portal deep-links). */
(function (RW) {
  'use strict';
  const { esc, uid, ref, fmtTime } = RW.util;

  // ---- Department filter definitions ----
  const DEPT_FILTERS = [
    { label: 'All',        value: 'all' },
    { label: 'Civil Status', value: 'civil' },
    { label: 'Driving',    value: 'driving' },
    { label: 'Tax',        value: 'tax' },
    { label: 'ID & Docs',  value: 'id' },
    { label: 'Housing',    value: 'housing' },
  ];

  // ---- Service catalogue (authentic Gov.gi eServices) ----
  // external:true = deep-links to portal.egov.gi rather than transacting natively
  const SERVICES = [
    {
      id: 'g-birth',   dept: 'civil',
      name: 'Birth Registration',
      desc: 'Register a birth — 21-day deadline · Joshua Hassan House',
      emoji: '👶',
      bookable: true,
      note: 'Opens counter 08:30–15:00 Mon–Fri',
    },
    {
      id: 'g-death',   dept: 'civil',
      name: 'Death Registration',
      desc: 'Register a death — 8-day deadline · Joshua Hassan House',
      emoji: '⚱️',
      bookable: true,
      note: 'Opens counter 08:30–15:00 Mon–Fri',
    },
    {
      id: 'g-marriage', dept: 'civil',
      name: 'Marriage Certificate',
      desc: 'Request certificate or book civil-partnership slot',
      emoji: '💍',
      bookable: true,
      note: 'Certificate ready 10–15 days after registration',
    },
    {
      id: 'g-driving', dept: 'driving',
      name: 'Driving Licence Renewal',
      desc: 'Renew or replace your standard/learner licence',
      emoji: '🪪',
      bookable: true,
      external: false,
    },
    {
      id: 'g-mot',     dept: 'driving',
      name: 'Vehicle MOT Booking',
      desc: 'Book a roadworthiness (MOT) test',
      emoji: '🚗',
      bookable: true,
      external: false,
    },
    {
      id: 'g-theory',  dept: 'driving',
      name: 'Theory / Driving Test',
      desc: 'Book theory test, driving test or CBT (motorbike)',
      emoji: '📝',
      bookable: true,
      external: false,
    },
    {
      id: 'g-tax',     dept: 'tax',
      name: 'Pay Income Tax Online',
      desc: 'PAYE & self-assessment — payments at tax.egov.gi',
      emoji: '💷',
      bookable: false,
      external: true,
      externalUrl: 'tax.egov.gi',
    },
    {
      id: 'g-taxreturn', dept: 'tax',
      name: 'File Tax Return',
      desc: 'Electronic-only returns — paper no longer accepted',
      emoji: '📊',
      bookable: false,
      external: true,
      externalUrl: 'tax.egov.gi',
    },
    {
      id: 'g-id',      dept: 'id',
      name: 'Gibraltar ID Card',
      desc: 'Apply or renew — required age 12+ (eID smartcard)',
      emoji: '🇬🇮',
      bookable: true,
      external: false,
    },
    {
      id: 'g-resident', dept: 'id',
      name: 'Certificate of Residence',
      desc: 'Proof of residence / permit of residence',
      emoji: '📜',
      bookable: true,
      external: true,
      externalUrl: 'portal.egov.gi',
    },
    {
      id: 'g-passport', dept: 'id',
      name: 'Passport Application',
      desc: 'New or renewed Gibraltar passport',
      emoji: '🛂',
      bookable: true,
      external: false,
    },
    {
      id: 'g-rent',    dept: 'housing',
      name: 'Pay Rent Online',
      desc: 'Government accommodation — pay via portal',
      emoji: '🏠',
      bookable: false,
      external: true,
      externalUrl: 'portal.egov.gi',
    },
    {
      id: 'g-tenancy', dept: 'housing',
      name: 'Tenancy Agreement',
      desc: 'Submit or manage a government tenancy',
      emoji: '🔑',
      bookable: true,
      external: true,
      externalUrl: 'portal.egov.gi',
    },
    {
      id: 'g-report',  dept: 'all',
      name: 'Report a Street Issue',
      desc: 'Potholes, lighting, cleanliness — sent to GSD',
      emoji: '🛠️',
      bookable: false,
      external: false,
    },
  ];

  // ---- In-memory filter state (resets on navigation, like eat.js) ----
  var _activeDept = 'all';

  // ---- Next available appointment slot (next working day, 10:30) ----
  function nextSlot() {
    var d = new Date(Date.now() + 2 * 86400000);
    // Skip to Monday if weekend
    var day = d.getDay();
    if (day === 0) d = new Date(d.getTime() + 86400000);
    if (day === 6) d = new Date(d.getTime() + 2 * 86400000);
    d.setHours(10, 30, 0, 0);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) + ', 10:30';
  }

  // ---- Pill-status for appointment ----
  function apptPill(a) {
    if (a.cancelled) return '<span class="pill-status danger">Cancelled</span>';
    return '<span class="pill-status ok">✓ Confirmed</span>';
  }

  // ---- Render a single service row ----
  function serviceRow(svc) {
    var trailHtml;
    if (svc.external) {
      trailHtml = '<span class="pill-status info" style="font-size:11px;white-space:nowrap">↗ ' + esc(svc.externalUrl) + '</span>';
    } else if (svc.bookable) {
      trailHtml = '<button class="btn sm" data-act="govBook" data-id="' + esc(svc.id) + '" data-name="' + esc(svc.name) + '">Book</button>';
    } else {
      trailHtml = '<button class="btn sm ghost" data-act="govReport" data-name="' + esc(svc.name) + '">Report</button>';
    }

    var sub = esc(svc.desc) + (svc.note ? ' <span style="color:var(--ash)">· ' + esc(svc.note) + '</span>' : '');

    return (
      '<div class="row">' +
        '<div class="lead" style="background:var(--cloud);font-size:20px">' + svc.emoji + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(svc.name) + '</div>' +
          '<div class="sub">' + sub + '</div>' +
        '</div>' +
        '<div class="trail">' + trailHtml + '</div>' +
      '</div>'
    );
  }

  // ---- Stats strip ----
  function statsStrip(appts) {
    var govAppts = appts.filter(function (a) { return a.kind === 'gov' && !a.cancelled; });
    var upcoming = govAppts.filter(function (a) { return a.t > Date.now() - 86400000; }).length;
    return (
      '<div class="grid2" style="margin-bottom:16px">' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--brand)">' + esc(String(SERVICES.filter(function (s) { return s.bookable && !s.external; }).length)) + '</div>' +
          '<div class="l">Bookable services</div>' +
        '</div>' +
        '<div class="stat" style="text-align:right">' +
          '<div class="n num" style="color:var(--green)">' + esc(String(upcoming)) + '</div>' +
          '<div class="l">Your appointments</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ---- Main render ----
  function render() {
    RW.S.appointments = RW.S.appointments || [];

    var dept = _activeDept;
    var visible = dept === 'all'
      ? SERVICES
      : SERVICES.filter(function (s) { return s.dept === dept || s.dept === 'all'; });

    // Filter chips
    var filterChips = RW.ui.chips(DEPT_FILTERS, dept, 'govFilter', true);

    // Service list
    var serviceList = visible.length
      ? '<div class="card" style="padding:0 12px">' + visible.map(serviceRow).join('') + '</div>'
      : RW.ui.empty('🏛️', 'No services in this category');

    // Appointments section
    var govAppts = RW.S.appointments.filter(function (a) { return a.kind === 'gov'; }).slice().reverse();
    var apptsHtml;
    if (govAppts.length) {
      apptsHtml = (
        RW.ui.sectionTitle('Your appointments') +
        '<div class="card" style="padding:0 12px">' +
        govAppts.map(function (a) {
          return (
            '<div class="row">' +
              '<div class="lead" style="background:var(--green-soft)">&#128197;</div>' +
              '<div class="body">' +
                '<div class="name">' + esc(a.name) + '</div>' +
                '<div class="sub num">' + esc(a.when) + ' &nbsp;&middot;&nbsp; Ref <strong>' + esc(a.ref) + '</strong></div>' +
              '</div>' +
              '<div class="trail">' + apptPill(a) + '</div>' +
            '</div>'
          );
        }).join('') +
        '</div>'
      );
    } else {
      apptsHtml = (
        RW.ui.sectionTitle('Your appointments') +
        RW.ui.empty('📅', 'No appointments yet — book a service above')
      );
    }

    // Portal note
    var portalNote = (
      '<div style="background:var(--sea-soft);color:var(--sea);border-radius:10px;' +
        'padding:10px 13px;font-size:12px;font-weight:600;margin-bottom:16px;' +
        'display:flex;align-items:flex-start;gap:8px;line-height:1.5">' +
        '<span style="font-size:16px">ℹ️</span>' +
        '<span>Some services deep-link to the official portal ' +
          '<strong>portal.egov.gi</strong> or <strong>tax.egov.gi</strong>. ' +
          'Services marked ↗ open in your browser.</span>' +
      '</div>'
    );

    var heroHtml = RW.ui.hero({
      emoji: '🏙️',
      title: 'Gov.gi eServices',
      sub: 'Book appointments & access public services',
      accent: '#c0392b',
      chips: ['Civil Status', 'Driving', 'Tax', 'ID & Docs'],
    });

    var body = (
      statsStrip(RW.S.appointments) +
      portalNote +
      RW.ui.sectionTitle('Services') +
      filterChips +
      serviceList +
      '<div style="height:20px"></div>' +
      apptsHtml
    );

    return RW.ui.screen({ title: 'Gov.gi', hero: heroHtml, body });
  }

  // ---- Actions ----
  RW.register({
    id: 'gov',
    title: 'Gov.gi',
    emoji: '🏙️',
    tileBg: '#fde7ea',
    section: 'services',
    order: 10,
    render,
    actions: {
      govFilter: function (el) {
        _activeDept = el.dataset.v || 'all';
        RW.render();
      },

      govBook: function (el) {
        RW.S.appointments = RW.S.appointments || [];
        var svcId   = el.dataset.id  || '';
        var svcName = el.dataset.name || 'Appointment';
        var svc     = SERVICES.filter(function (s) { return s.id === svcId; })[0];

        // Guard: external services should not reach here, but be safe
        if (svc && svc.external) {
          RW.toast('Opens at ' + esc(svc.externalUrl) + ' ↗');
          return;
        }

        var when   = nextSlot();
        var refNum = ref('GV');
        RW.S.appointments.push({
          id:    uid(),
          kind:  'gov',
          svcId: svcId,
          name:  svcName,
          when:  when,
          ref:   refNum,
          t:     Date.now(),
        });
        RW.store.save();

        RW.toast(
          '✓ Booked: ' + svcName + ' — ' + when + ' · Ref ' + refNum,
          4000
        );
        RW.render();
      },

      govReport: function (el) {
        var name = el.dataset.name || 'issue';
        RW.toast('🛠️ Thanks — ' + esc(name) + ' reported to Gov.gi');
      },
    },
  });

  // ---- Activity feed ----
  RW.registerActivity(function () {
    return (RW.S.appointments || [])
      .filter(function (a) { return a.kind === 'gov'; })
      .slice().reverse()
      .map(function (a) {
        return {
          t: a.t || 0,
          html: (
            '<div class="row">' +
              '<div class="lead" style="background:var(--green-soft)">🏙️</div>' +
              '<div class="body">' +
                '<div class="name">' + esc(a.name) + '</div>' +
                '<div class="sub">' + esc(a.when) + ' &nbsp;&middot;&nbsp; ' +
                  (a.t ? fmtTime(a.t) : '') + ' &nbsp;&middot;&nbsp; Ref <strong>' + esc(a.ref) + '</strong>' +
                '</div>' +
              '</div>' +
              '<div class="trail">' + (a.cancelled
                ? '<span class="pill-status danger">Cancelled</span>'
                : '<span class="pill-status ok">✓ Confirmed</span>') +
              '</div>' +
            '</div>'
          ),
        };
      });
  });
})(window.RW);
