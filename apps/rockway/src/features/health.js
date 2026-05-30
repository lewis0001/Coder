/* Rockway feature — Health (GHA GP booking, prescriptions, out-of-hours, duty pharmacy, emergency). */
(function (RW) {
  'use strict';
  const { esc, uid, ref, fmtTime } = RW.util;

  // ---- GP appointment windows (PCC, 200 52441) ----
  const WINDOWS = [
    { id: 'same-day',  label: 'Same-day appointment',  sub: 'Call 08:15 – 11:00',  startH: 8,  startM: 15, endH: 11, endM: 0  },
    { id: 'follow-up', label: 'Follow-up / specialist', sub: 'Bloods, driving medicals, dietician · 11:00 – 15:00', startH: 11, startM: 0,  endH: 15, endM: 0  },
    { id: 'evening',   label: 'Evening clinic',          sub: 'Call 16:00 – 18:00',  startH: 16, startM: 0,  endH: 18, endM: 0  },
    { id: 'weekend',   label: 'Weekend / emergency GP',  sub: 'Sat–Sun 08:30–09:30 and 15:30–16:30', startH: 8, startM: 30, endH: 9, endM: 30 },
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
    { name: 'Mill Pharmacy',       address: '291 Main Street' },
    { name: 'Calpe Pharmacy',      address: '267 Main Street' },
    { name: 'Parody\'s Pharmacy',  address: '206 Main Street' },
    { name: 'Central Pharmacy',    address: '179 Main Street' },
    { name: 'Victoria Pharmacy',   address: '120 Main Street' },
  ];

  function todayDutyPharmacy() {
    const d = new Date();
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return PHARMACIES[dayOfYear % PHARMACIES.length];
  }

  // ---- helpers ----
  function nowInWindow(w) {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const afterStart = h > w.startH || (h === w.startH && m >= w.startM);
    const beforeEnd  = h < w.endH  || (h === w.endH  && m <  w.endM);
    return afterStart && beforeEnd;
  }

  function isWeekend() {
    const d = new Date().getDay(); return d === 0 || d === 6;
  }

  function windowOpen(w) {
    if (w.id === 'weekend') return isWeekend() && nowInWindow(w);
    if (w.id === 'same-day' || w.id === 'follow-up' || w.id === 'evening') {
      return !isWeekend() && nowInWindow(w);
    }
    return false;
  }

  function nextSlotFor(w) {
    // Build a slot label: today at a mid-point of the window, or tomorrow
    const now = new Date();
    const slotH = w.startH;
    const slotM = w.startM;
    const pad = (n) => String(n).padStart(2, '0');
    // If window hasn't opened today, use today; otherwise next available day
    const h = now.getHours(), m = now.getMinutes();
    const pastEnd = h > w.endH || (h === w.endH && m >= w.endM);
    const d = new Date(now);
    if (pastEnd) d.setDate(d.getDate() + 1);
    const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return dateLabel + ' at ' + pad(slotH) + ':' + pad(slotM);
  }

  function healthAppts() {
    return (RW.S.appointments || []).filter((a) => a.kind === 'health');
  }

  // ---- render ----
  function render() {
    const duty = todayDutyPharmacy();
    const prescriptions = RW.S.prescriptions || [];
    const appts = healthAppts().slice().reverse();

    // --- emergency widget ---
    const emergency =
      '<div class="card" style="border:2px solid #c0392b;background:#fff5f5">' +
        '<div class="name" style="color:#c0392b;font-weight:700;font-size:16px;margin-bottom:6px">Emergency Services</div>' +
        '<div class="sub" style="margin-bottom:10px">Unified since 18 March 2024 — automated menu routes your call</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn dark" data-act="healthEmergency" data-num="999" data-label="Emergency (Police / Ambulance / Fire)">📞 999</button>' +
          '<button class="btn ghost" data-act="healthEmergency" data-num="112" data-label="Emergency (112 — GSM international)">📞 112</button>' +
        '</div>' +
        '<div style="margin-top:8px;font-size:12px;color:#888">Non-emergency: Police 200 72500 · Ambulance 200 77390 · Fire 200 79507</div>' +
      '</div>';

    // --- GP booking windows ---
    const windowRows = WINDOWS.map((w) => {
      const open = windowOpen(w);
      const slot = nextSlotFor(w);
      return '<div class="row">' +
        '<div class="lead" style="background:' + (open ? '#d4edda' : '#f5f5f5') + '">' + (open ? '🟢' : '⏰') + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(w.label) + '</div>' +
          '<div class="sub">' + esc(w.sub) + '</div>' +
          (open ? '' : '<div class="sub" style="color:#888">Next slot: ' + esc(slot) + '</div>') +
        '</div>' +
        '<div class="trail">' +
          '<button class="btn sm' + (open ? '' : ' ghost') + '" data-act="healthBook" data-wid="' + esc(w.id) + '" data-wlabel="' + esc(w.label) + '" data-slot="' + esc(slot) + '">' +
            (open ? 'Book' : 'Book') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    const gpSection =
      RW.ui.sectionTitle('Book a GP Appointment', '', '') +
      '<div class="card muted tiny" style="margin-bottom:8px">Primary Care Centre · 200 52441 · Free via GPMS (GHA card required)</div>' +
      '<div class="card">' + windowRows + '</div>';

    // --- upcoming health appointments ---
    const apptSection = appts.length
      ? RW.ui.sectionTitle('Upcoming Appointments') +
        '<div class="card">' +
        appts.map((a) =>
          '<div class="row">' +
            '<div class="lead" style="background:#d4edda">📅</div>' +
            '<div class="body">' +
              '<div class="name">' + esc(a.name) + '</div>' +
              '<div class="sub">' + esc(a.when) + ' · Ref ' + esc(a.ref) + '</div>' +
            '</div>' +
          '</div>'
        ).join('') +
        '</div>'
      : '';

    // --- repeat prescriptions ---
    const rxRows = MEDS.map((med) => {
      const requested = prescriptions.find((p) => p.medId === med.id && p.status === 'Requested');
      return '<div class="row">' +
        '<div class="lead" style="background:#e8f4fd">💊</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(med.name) + '</div>' +
          '<div class="sub">' + esc(med.schedule) + '</div>' +
        '</div>' +
        '<div class="trail">' +
          (requested
            ? '<span class="pill-status ok">Requested</span>'
            : '<button class="btn sm ghost" data-act="healthRepeat" data-medid="' + esc(med.id) + '" data-medname="' + esc(med.name) + '">Request</button>'
          ) +
        '</div>' +
      '</div>';
    }).join('');

    const rxSection =
      RW.ui.sectionTitle('Repeat Prescriptions') +
      '<div class="card muted tiny" style="margin-bottom:8px">Requests submitted to GHA. Collect from your pharmacy when ready.</div>' +
      '<div class="card">' + rxRows + '</div>';

    // --- GHA 111 out-of-hours card ---
    const oohSection =
      RW.ui.sectionTitle('Out-of-Hours / Advice') +
      '<div class="card">' +
        '<div class="row">' +
          '<div class="lead" style="background:#fff3cd">📞</div>' +
          '<div class="body">' +
            '<div class="name">GHA 111 — Clinical Advisor</div>' +
            '<div class="sub">When PCC is closed · non-emergency medical advice</div>' +
          '</div>' +
          '<div class="trail"><button class="btn sm" data-act="healthDuty" data-num="111" data-label="GHA 111 Out-of-hours">Call 111</button></div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="lead" style="background:#fde8e8">🚑</div>' +
          '<div class="body">' +
            '<div class="name">A&amp;E — St Bernard\'s Hospital</div>' +
            '<div class="sub">Genuine emergencies · 24/7</div>' +
          '</div>' +
          '<div class="trail"><button class="btn sm dark" data-act="healthEmergency" data-num="999" data-label="Emergency 999">999</button></div>' +
        '</div>' +
      '</div>';

    // --- duty pharmacy tile ---
    const dutySection =
      RW.ui.sectionTitle('Duty Pharmacy Today') +
      '<div class="card">' +
        '<div class="row">' +
          '<div class="lead" style="background:#e8f8f0">🏥</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(duty.name) + '</div>' +
            '<div class="sub">' + esc(duty.address) + ' · Mon–Fri 19:00–21:00 · Weekends 11:00–13:00 &amp; 18:00–20:00</div>' +
          '</div>' +
          '<div class="trail"><button class="btn sm ghost" data-act="healthPick" data-pharmacy="' + esc(duty.name) + '">Info</button></div>' +
        '</div>' +
        '<div style="padding:8px 12px;font-size:12px;color:#888">Full rota: gha.gi/duty-pharmacy</div>' +
      '</div>';

    const body =
      emergency +
      gpSection +
      apptSection +
      rxSection +
      oohSection +
      dutySection;

    return RW.ui.screen({ title: 'Health', body });
  }

  // ---- activity registration ----
  RW.registerActivity(() => {
    const appts = healthAppts().slice().reverse().map((a) => ({
      t: a.t || 0,
      html: '<div class="row">' +
        '<div class="lead" style="background:#d4edda">📅</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(a.name) + '</div>' +
          '<div class="sub">' + esc(a.when) + ' · Ref ' + esc(a.ref) + '</div>' +
        '</div>' +
      '</div>',
    }));
    const rxs = (RW.S.prescriptions || []).slice().reverse().map((p) => ({
      t: p.t || 0,
      html: '<div class="row">' +
        '<div class="lead" style="background:#e8f4fd">💊</div>' +
        '<div class="body">' +
          '<div class="name">Prescription: ' + esc(p.name) + '</div>' +
          '<div class="sub">Status: ' + esc(p.status) + ' · ' + fmtTime(p.t) + '</div>' +
        '</div>' +
      '</div>',
    }));
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
    render,
    actions: {
      healthBook: (el) => {
        const wid    = el.dataset.wid;
        const wlabel = el.dataset.wlabel;
        const slot   = el.dataset.slot;
        const apptName = wlabel + ' (PCC)';
        RW.S.appointments = RW.S.appointments || [];
        RW.S.appointments.push({
          id: uid(),
          kind: 'health',
          name: apptName,
          when: slot,
          ref: ref('GH'),
          t: Date.now(),
        });
        RW.store.save();
        RW.toast('GP appointment booked — ' + slot);
        RW.render();
      },

      healthRepeat: (el) => {
        const medId   = el.dataset.medid;
        const medName = el.dataset.medname;
        RW.S.prescriptions = RW.S.prescriptions || [];
        // Avoid duplicate pending requests for same med
        const existing = RW.S.prescriptions.find((p) => p.medId === medId && p.status === 'Requested');
        if (existing) { RW.toast('Already requested: ' + medName); return; }
        RW.S.prescriptions.push({ id: uid(), t: Date.now(), medId, name: medName, status: 'Requested' });
        RW.store.save();
        RW.toast('Repeat prescription requested: ' + medName);
        RW.render();
      },

      healthDuty: (el) => {
        const num   = el.dataset.num;
        const label = el.dataset.label;
        RW.toast('Calling ' + label + ' (' + num + ') — in a real device this would dial.');
      },

      healthEmergency: (el) => {
        const num   = el.dataset.num;
        const label = el.dataset.label;
        RW.toast('EMERGENCY: calling ' + num + ' — ' + label + '. On a real device this would dial immediately.');
      },

      healthPick: (el) => {
        const pharmacy = el.dataset.pharmacy;
        RW.toast('Duty pharmacy: ' + pharmacy + ' — see gha.gi/duty-pharmacy for live rota.');
      },
    },
  });
})(window.RW);
