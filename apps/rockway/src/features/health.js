/* Rockway feature — Health (GHA GP booking, prescriptions, out-of-hours, duty pharmacy, emergency). */
(function (RW) {
  'use strict';
  const { esc, uid, ref, fmtTime } = RW.util;

  // ---- GP appointment windows (PCC, 200 52441) ----
  const WINDOWS = [
    { id: 'same-day',  label: 'Same-day appointment',   sub: 'Call 08:15–11:00 · urgent on-the-day slots',              startH: 8,  startM: 15, endH: 11, endM: 0  },
    { id: 'follow-up', label: 'Follow-up / Specialist',  sub: 'Bloods, driving medicals, dietician · 11:00–15:00',       startH: 11, startM: 0,  endH: 15, endM: 0  },
    { id: 'evening',   label: 'Evening clinic',           sub: 'Call 16:00–18:00 · routine follow-up',                    startH: 16, startM: 0,  endH: 18, endM: 0  },
    { id: 'weekend',   label: 'Weekend / Emergency GP',   sub: 'Sat–Sun 08:30–09:30 and 15:30–16:30',              startH: 8,  startM: 30, endH: 9,  endM: 30 },
  ];

  // ---- example repeat-prescription meds ----
  const MEDS = [
    { id: 'm1', name: 'Amlodipine 5 mg tablets',   schedule: '28-day supply' },
    { id: 'm2', name: 'Metformin 500 mg tablets',   schedule: '56-day supply' },
    { id: 'm3', name: 'Salbutamol 100 mcg inhaler', schedule: 'As required'  },
    { id: 'm4', name: 'Atorvastatin 20 mg tablets', schedule: '28-day supply' },
  ];

  // ---- duty pharmacy (today's, rotated by day-of-year for demo realism) ----
  const PHARMACIES = [
    { name: 'Mill Pharmacy',     address: '291 Main Street' },
    { name: 'Calpe Pharmacy',    address: '267 Main Street' },
    { name: "Parody’s Pharmacy", address: '206 Main Street' },
    { name: 'Central Pharmacy',  address: '179 Main Street' },
    { name: 'Victoria Pharmacy', address: '120 Main Street' },
  ];

  function todayDutyPharmacy() {
    var d = new Date();
    var dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return PHARMACIES[dayOfYear % PHARMACIES.length];
  }

  // ---- time helpers ----
  function nowInWindow(w) {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var afterStart = h > w.startH || (h === w.startH && m >= w.startM);
    var beforeEnd  = h < w.endH  || (h === w.endH  && m <  w.endM);
    return afterStart && beforeEnd;
  }

  function isWeekend() {
    var d = new Date().getDay(); return d === 0 || d === 6;
  }

  function windowOpen(w) {
    if (w.id === 'weekend') return isWeekend() && nowInWindow(w);
    return !isWeekend() && nowInWindow(w);
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function nextSlotFor(w) {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var pastEnd = h > w.endH || (h === w.endH && m >= w.endM);
    var d = new Date(now);
    if (pastEnd) d.setDate(d.getDate() + 1);
    var dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return dateLabel + ' at ' + pad2(w.startH) + ':' + pad2(w.startM);
  }

  function healthAppts() {
    return (RW.S.appointments || []).filter(function (a) { return a.kind === 'health'; });
  }

  // ---- duty pharmacy open/closed check ----
  function dutyPharmacyStatus() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var mins = h * 60 + m;
    var wknd = isWeekend();
    if (!wknd) {
      // Mon-Fri duty: 19:00-21:00
      if (mins >= 19 * 60 && mins < 21 * 60) return { open: true, hours: '19:00–21:00 (tonight)' };
      return { open: false, hours: 'Opens 19:00–21:00 (Mon–Fri)' };
    }
    // Weekends: 11:00-13:00 and 18:00-20:00
    if ((mins >= 11 * 60 && mins < 13 * 60) || (mins >= 18 * 60 && mins < 20 * 60)) {
      return { open: true, hours: '11:00–13:00 & 18:00–20:00 (weekends)' };
    }
    return { open: false, hours: '11:00–13:00 & 18:00–20:00 (weekends)' };
  }

  // ---- render ----
  function render() {
    var duty = todayDutyPharmacy();
    var dutyStatus = dutyPharmacyStatus();
    var prescriptions = RW.S.prescriptions || [];
    var appts = healthAppts().slice().reverse();

    // ----------------------------------------------------------------
    // 1. EMERGENCY WIDGET — unmistakable danger styling, not alarmist
    // ----------------------------------------------------------------
    var emergency =
      '<div class="card" style="background:#fff0f0;border:2.5px solid var(--danger);border-radius:var(--radius);margin-bottom:4px">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
          '<div style="width:42px;height:42px;border-radius:12px;background:var(--danger);display:grid;place-items:center;font-size:22px;flex:0 0 auto">🚨</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:900;font-size:16px;color:var(--danger);letter-spacing:-.2px">Emergency Services</div>' +
            '<div class="subtle" style="font-size:12px;margin-top:1px">Gibraltar 999 · automated menu routes your call</div>' +
          '</div>' +
        '</div>' +
        '<div class="grid2" style="margin-bottom:10px">' +
          '<button class="btn" style="background:var(--danger);box-shadow:0 6px 18px rgba(212,17,42,0.35)" data-act="healthEmergency" data-num="999" data-label="Emergency 999 (Police / Ambulance / Fire)">' +
            '📞 999' +
          '</button>' +
          '<button class="btn ghost" style="color:var(--danger);box-shadow:inset 0 0 0 1.5px var(--danger)" data-act="healthEmergency" data-num="112" data-label="Emergency 112 (GSM international)">' +
            '📞 112' +
          '</button>' +
        '</div>' +
        '<div class="divider" style="margin:8px 0"></div>' +
        '<div style="font-size:11.5px;color:var(--ash);line-height:1.7">' +
          '<strong style="color:var(--slate)">Non-emergency:</strong> ' +
          'Police 200 72500 · Ambulance 200 77390 · Fire 200 79507' +
        '</div>' +
      '</div>';

    // ----------------------------------------------------------------
    // 2. GP BOOKING — live open/closed indicator per window
    // ----------------------------------------------------------------
    var windowRows = WINDOWS.map(function (w) {
      var open = windowOpen(w);
      var slot = nextSlotFor(w);
      var statusPill = open
        ? '<span class="pill-status ok" style="font-size:11px">Open now</span>'
        : '<span class="pill-status neutral" style="font-size:11px">Closed</span>';
      var nextLine = open
        ? ''
        : '<div class="subtle" style="font-size:11px;margin-top:3px">Next: ' + esc(slot) + '</div>';
      var btn = open
        ? '<button class="btn sm" data-act="healthBook" data-wid="' + esc(w.id) + '" data-wlabel="' + esc(w.label) + '" data-slot="' + esc(slot) + '">Book</button>'
        : '<button class="btn sm ghost" data-act="healthBook" data-wid="' + esc(w.id) + '" data-wlabel="' + esc(w.label) + '" data-slot="' + esc(slot) + '">Book</button>';
      return RW.ui.row({
        lead: open ? '🟢' : '⏰',
        leadBg: open ? '#d4edda' : '#f0f0f5',
        name: w.label,
        sub: w.sub,
        trail: statusPill + '<div style="margin-top:6px;text-align:right">' + btn + '</div>' + nextLine,
      });
    }).join('');

    var gpSection =
      RW.ui.sectionTitle('Book a GP Appointment') +
      '<div class="card" style="background:var(--sea-soft);border-radius:var(--radius);padding:11px 14px;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:20px">🏥</span>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:800;font-size:13.5px;color:var(--sea)">Primary Care Centre &middot; <span class="num">200 52441</span></div>' +
            '<div class="subtle" style="font-size:11.5px;margin-top:2px">Book up to 4 weeks ahead &middot; request preferred GP</div>' +
          '</div>' +
          '<span class="pill-status ok" style="font-size:11px;white-space:nowrap">Free at point of use (GPMS)</span>' +
        '</div>' +
      '</div>' +
      '<div class="card">' + windowRows + '</div>';

    // ----------------------------------------------------------------
    // 3. UPCOMING APPOINTMENTS — empty state if none
    // ----------------------------------------------------------------
    var apptSection;
    if (appts.length) {
      var apptRows = appts.map(function (a) {
        return RW.ui.row({
          lead: '📅',
          leadBg: '#d4edda',
          name: esc(a.name),
          sub: esc(a.when) + ' · Ref ' + esc(a.ref),
          trail: '<span class="pill-status info" style="font-size:11px">Confirmed</span>',
        });
      }).join('');
      apptSection =
        RW.ui.sectionTitle('Your Appointments') +
        '<div class="card">' + apptRows + '</div>';
    } else {
      apptSection =
        RW.ui.sectionTitle('Your Appointments') +
        '<div class="card">' +
          RW.ui.empty('📅', 'No health appointments booked yet. Use the windows above to book with your GP at the PCC.') +
        '</div>';
    }

    // ----------------------------------------------------------------
    // 4. REPEAT PRESCRIPTIONS — status pills + requested state
    // ----------------------------------------------------------------
    var rxRows = MEDS.map(function (med) {
      var existing = prescriptions.find(function (p) { return p.medId === med.id && p.status === 'Requested'; });
      var trailHtml;
      if (existing) {
        trailHtml =
          '<div style="text-align:right">' +
            '<span class="pill-status ok" style="font-size:11px">Requested ✓</span>' +
            '<div class="subtle" style="font-size:10.5px;margin-top:3px">Allow 48 hrs</div>' +
          '</div>';
      } else {
        trailHtml =
          '<button class="btn sm ghost" data-act="healthRepeat" data-medid="' + esc(med.id) + '" data-medname="' + esc(med.name) + '">Request</button>';
      }
      return RW.ui.row({
        lead: '💊',
        leadBg: '#e8f4fd',
        name: med.name,
        sub: med.schedule,
        trail: trailHtml,
      });
    }).join('');

    var rxSection =
      RW.ui.sectionTitle('Repeat Prescriptions') +
      '<div class="card" style="background:var(--cloud);border-radius:var(--radius);padding:11px 14px;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="font-size:16px">ℹ️</span>' +
          '<div class="subtle" style="font-size:12px">Requests go to GHA. Collect from your pharmacy when ready — allow 48 hrs. Free at point of use (GPMS).</div>' +
        '</div>' +
      '</div>' +
      '<div class="card">' + rxRows + '</div>';

    // ----------------------------------------------------------------
    // 5. OUT-OF-HOURS / GHA 111
    // ----------------------------------------------------------------
    var oohSection =
      RW.ui.sectionTitle('Out-of-Hours / Advice') +
      '<div class="card">' +
        RW.ui.row({
          lead: '📞',
          leadBg: '#fff3cd',
          name: 'GHA 111 — Clinical Advisor',
          sub: 'When PCC is closed · non-emergency medical advice',
          trail: '<button class="btn sm" data-act="healthDuty" data-num="111" data-label="GHA 111 Out-of-hours">Call 111</button>',
        }) +
        RW.ui.row({
          lead: '🏥',
          leadBg: '#fde8e8',
          name: 'A&amp;E — St Bernard’s Hospital',
          sub: 'Genuine emergencies · 24/7 · free at point of use',
          trail: '<button class="btn sm" style="background:var(--danger)" data-act="healthEmergency" data-num="999" data-label="Emergency 999">999</button>',
        }) +
        RW.ui.row({
          lead: '🔥',
          leadBg: '#fff0e8',
          name: 'Legacy direct line',
          sub: 'Fire &amp; Ambulance direct (still active) · 190',
          trail: '<button class="btn sm ghost" data-act="healthDuty" data-num="190" data-label="Fire &amp; Ambulance direct 190">Call 190</button>',
        }) +
      '</div>';

    // ----------------------------------------------------------------
    // 6. DUTY PHARMACY — clear tile with hours + open/closed pill
    // ----------------------------------------------------------------
    var dutyPill = dutyStatus.open
      ? '<span class="pill-status ok" style="font-size:11px">Open now</span>'
      : '<span class="pill-status neutral" style="font-size:11px">Closed</span>';

    var dutySection =
      RW.ui.sectionTitle('Duty Pharmacy Today') +
      '<div class="card">' +
        '<div style="display:flex;align-items:flex-start;gap:12px;padding:4px 0 10px">' +
          '<div class="lead" style="background:#e8f8f0;border-radius:14px;width:46px;height:46px;display:grid;place-items:center;font-size:22px;flex:0 0 auto">💊</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:800;font-size:15px">' + esc(duty.name) + '</div>' +
            '<div class="subtle">' + esc(duty.address) + '</div>' +
            '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
              dutyPill +
              '<span class="subtle">' + esc(dutyStatus.hours) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="flex:0 0 auto">' +
            '<button class="btn sm ghost" data-act="healthPick" data-pharmacy="' + esc(duty.name) + '">Info</button>' +
          '</div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="grid2" style="gap:8px">' +
          '<div class="stat">' +
            '<div class="n" style="font-size:13px;font-weight:800">Mon–Fri</div>' +
            '<div class="l">19:00–21:00</div>' +
          '</div>' +
          '<div class="stat">' +
            '<div class="n" style="font-size:13px;font-weight:800">Weekends</div>' +
            '<div class="l">11:00–13:00 &amp; 18:00–20:00</div>' +
          '</div>' +
        '</div>' +
        '<div class="subtle" style="font-size:11.5px;margin-top:10px">Full rota: <span style="color:var(--sea)">gha.gi/duty-pharmacy</span></div>' +
      '</div>';

    // ----------------------------------------------------------------
    // Hero banner
    // ----------------------------------------------------------------
    var heroHtml = RW.ui.hero({
      emoji: '🩺',
      title: 'Health Services',
      sub: 'GHA · Gibraltar Health Authority',
      accent: '#0a9d4a',
      chips: ['Free at point of use', 'GPMS entitled', 'PCC 200 52441'],
    });

    var body =
      emergency +
      gpSection +
      apptSection +
      rxSection +
      oohSection +
      dutySection;

    return RW.ui.screen({ title: 'Health', body: body, hero: heroHtml });
  }

  // ---- activity registration ----
  RW.registerActivity(function () {
    var appts = healthAppts().slice().reverse().map(function (a) {
      return {
        t: a.t || 0,
        html: RW.ui.row({
          lead: '📅',
          leadBg: '#d4edda',
          name: a.name,
          sub: a.when + ' · Ref ' + a.ref,
          trail: '<span class="pill-status info" style="font-size:11px">Confirmed</span>',
        }),
      };
    });
    var rxs = (RW.S.prescriptions || []).slice().reverse().map(function (p) {
      return {
        t: p.t || 0,
        html: RW.ui.row({
          lead: '💊',
          leadBg: '#e8f4fd',
          name: 'Prescription: ' + esc(p.name),
          sub: 'Status: ' + esc(p.status) + ' · ' + fmtTime(p.t),
          trail: '<span class="pill-status ok" style="font-size:11px">' + esc(p.status) + '</span>',
        }),
      };
    });
    return appts.concat(rxs);
  });

  // ---- register ----
  RW.register({
    id: 'health',
    title: 'Health',
    emoji: '🩺',
    tileBg: '#e3f7ec',
    section: 'services',
    order: 20,
    render: render,
    actions: {
      healthBook: function (el) {
        var wid    = el.dataset.wid;
        var wlabel = el.dataset.wlabel;
        var slot   = el.dataset.slot;
        var apptRef = ref('GH');
        var apptName = wlabel + ' (PCC)';
        RW.S.appointments = RW.S.appointments || [];
        RW.S.appointments.push({
          id: uid(),
          kind: 'health',
          name: apptName,
          when: slot,
          ref: apptRef,
          t: Date.now(),
        });
        RW.store.save();
        RW.toast('📅 Booked: ' + slot + ' · Ref ' + apptRef);
        RW.render();
      },

      healthRepeat: function (el) {
        var medId   = el.dataset.medid;
        var medName = el.dataset.medname;
        RW.S.prescriptions = RW.S.prescriptions || [];
        var existing = RW.S.prescriptions.find(function (p) { return p.medId === medId && p.status === 'Requested'; });
        if (existing) { RW.toast('Already requested: ' + medName); return; }
        RW.S.prescriptions.push({ id: uid(), t: Date.now(), medId: medId, name: medName, status: 'Requested' });
        RW.store.save();
        RW.toast('💊 Prescription requested: ' + medName);
        RW.render();
      },

      healthDuty: function (el) {
        var num   = el.dataset.num;
        var label = el.dataset.label;
        RW.toast('Calling ' + label + ' (' + num + ') — on a real device this would dial.');
      },

      healthEmergency: function (el) {
        var num   = el.dataset.num;
        var label = el.dataset.label;
        RW.toast('🚨 Calling ' + num + ' — ' + label + '. On a real device this dials immediately.');
      },

      healthPick: function (el) {
        var pharmacy = el.dataset.pharmacy;
        RW.toast('💊 Duty pharmacy: ' + pharmacy + ' — see gha.gi/duty-pharmacy for live rota.');
      },
    },
  });
})(window.RW);
