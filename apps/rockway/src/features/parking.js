/* Rockway feature — Parking (Gibraltar pay & display + residential permits). */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref } = RW.util;

  // ---- Gibraltar pay & display car parks (gibcarparks.com) ----
  const CAR_PARKS = [
    { id: 'mid-harbour',   name: 'Mid-Harbour',    zone: 'Mid-Harbour',    hint: 'Waterfront / Marina' },
    { id: 'eurotowers',    name: 'Eurotowers',      zone: 'Eurotowers',     hint: 'Town centre tower block' },
    { id: 'devils-tongue', name: "Devil's Tongue",  zone: "Devil's Tongue", hint: 'North District' },
    { id: 'icc',           name: 'ICC',             zone: 'ICC',            hint: 'International Commercial Centre' },
    { id: 'coach-park',    name: 'Coach Park',      zone: 'Coach Park',     hint: 'Bus & coach terminus' },
  ];

  // Pay & display tariff (Gibraltar Car Parks Ltd)
  const DURATIONS = [
    { label: '1 hour',  hours: 1,  price: 1.40 },
    { label: '2 hours', hours: 2,  price: 2.40 },
    { label: '4 hours', hours: 4,  price: 4.00 },
    { label: 'All day', hours: 10, price: 8.00 },
  ];

  // Residential Parking Scheme — escalating monthly cost per permit held by household
  // Zone areas based on Gibraltar Transport & Parking Plan / GBC reporting
  const RPS_ZONES = [
    { zone: 1, name: 'Zone 1', area: 'Town Centre / Main Street',          color: '#1455c0' },
    { zone: 2, name: 'Zone 2', area: 'Westside / Glacis Estate',           color: '#0a9d4a' },
    { zone: 3, name: 'Zone 3', area: 'Moorish Castle / Upper Town',        color: '#e08a00' },
    { zone: 4, name: 'Zone 4', area: 'Reclamation Areas / Ocean Village',  color: '#7c3aed' },
  ];

  // Monthly permit price by number already held in the household (0-indexed: 0 = first)
  function permitMonthlyPrice(permitsBefore) {
    if (permitsBefore === 0) return 5;
    if (permitsBefore === 1) return 10;
    return 20 * Math.pow(2, permitsBefore - 2); // 3rd = £20, 4th = £40, …
  }

  // ---- helpers ----

  function activeSessions() {
    RW.S.parking = RW.S.parking || [];
    return RW.S.parking.filter(function (p) { return p.expires > Date.now(); });
  }

  // Returns { text, isWarn } — warn when < 15 minutes remain
  function fmtRemaining(expires) {
    var ms = expires - Date.now();
    if (ms <= 0) return { text: 'Expired', isWarn: false };
    var totalMins = Math.floor(ms / 60000);
    var h = Math.floor(totalMins / 60);
    var m = totalMins % 60;
    var text = h > 0 ? (h + 'h ' + m + 'm left') : (m + 'm left');
    return { text: text, isWarn: totalMins < 15 };
  }

  function fmtExpiry(ts) {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // ---- render helpers ----

  function renderActiveSession(p) {
    var rem = fmtRemaining(p.expires);
    var pillClass = rem.isWarn ? 'warn' : 'ok';
    return '<div class="row">' +
      '<div class="lead" style="background:var(--sea-soft)">🅿️</div>' +
      '<div class="body">' +
        '<div class="name">' + esc(p.zone) + ' · <span class="num">' + esc(p.reg) + '</span></div>' +
        '<div class="sub" style="margin-top:4px">' +
          '<span class="pill-status ' + pillClass + '">' +
            '<span class="num">' + esc(rem.text) + '</span>' +
          '</span>' +
          '&ensp;<span class="num" style="font-size:12px;color:var(--ash)">until ' + esc(fmtExpiry(p.expires)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="trail">' +
        '<button class="btn sm ghost" data-act="parkingExtend" data-id="' + esc(p.id) + '">+1h</button>' +
      '</div>' +
    '</div>';
  }

  function renderZoneCard(z, myPermits) {
    var myPermit = myPermits.filter(function (p) { return p.zone === z.zone; })[0];
    var hasPermit = !!myPermit;
    var permitsBefore = myPermits.length; // how many this household already holds
    var displayPrice = permitMonthlyPrice(hasPermit ? myPermit.permitsBefore || 0 : permitsBefore);

    var statusHtml = hasPermit
      ? '<span class="pill-status ok" style="margin-left:6px;vertical-align:middle">Active</span>'
      : '';

    var priceBreakdown = '<span class="num">£5</span>/mo 1st · <span class="num">£10</span> 2nd · <span class="num">£20</span>+ 3rd';

    return '<div class="card" style="margin-bottom:10px;padding:14px 14px 12px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + z.color + ';flex:0 0 auto"></span>' +
          '<span style="font-weight:800;font-size:15px">' + esc(z.name) + '</span>' +
          statusHtml +
        '</div>' +
        (hasPermit
          ? '<span class="pill-status neutral">Ref <span class="num">' + esc(myPermit.ref) + '</span></span>'
          : '<button class="btn sm sea" data-act="parkingPermit" data-zone="' + z.zone + '" data-zname="' + esc(z.name) + '">Apply</button>') +
      '</div>' +
      '<div style="font-size:13px;color:var(--ash);margin-bottom:6px">' + esc(z.area) + '</div>' +
      '<div class="kv" style="padding:4px 0;font-size:12.5px;color:var(--ash)">' +
        '<span>Monthly permit</span>' +
        '<span>' + (hasPermit
          ? '<span class="num">£' + displayPrice + '</span>/mo'
          : '<span class="num">£' + displayPrice + '</span>/mo') +
        '</span>' +
      '</div>' +
      '<div style="font-size:11.5px;color:var(--fog);margin-top:2px">' + priceBreakdown + '</div>' +
    '</div>';
  }

  // ---- render ----

  function render() {
    RW.S.parking = RW.S.parking || [];
    RW.S.parkingPermits = RW.S.parkingPermits || [];

    // --- Hero ---
    var heroHtml = RW.ui.hero({
      emoji: '🅿️',
      title: 'Parking',
      sub: 'Pay & display · Residential permits · Gibraltar Car Parks Ltd',
      accent: '#1455c0',
      chips: ['gibcarparks.com', 'Zones 1–4', 'Scarcity warning'],
    });

    // --- Active sessions ---
    var active = activeSessions();
    var sessionsHtml = '';
    if (active.length) {
      var sessionRows = active.map(renderActiveSession).join('');
      sessionsHtml =
        RW.ui.sectionTitle('Active sessions') +
        '<div class="card">' + sessionRows + '</div>';
    } else {
      sessionsHtml =
        RW.ui.sectionTitle('Active sessions') +
        RW.ui.empty('🅿️', 'No active sessions. Pay below to start one.');
    }

    // --- Pay & Display form ---
    var parkOpts = CAR_PARKS.map(function (cp, i) {
      return '<button class="' + (i === 0 ? 'on' : '') + '" data-act="parkingPickZone" data-v="' + esc(cp.id) + '">' + esc(cp.name) + '</button>';
    }).join('');

    var durOpts = DURATIONS.map(function (d, i) {
      return '<button class="' + (i === 0 ? 'on' : '') + '" data-act="parkingPickDur" data-v="' + d.hours + '" data-p="' + d.price + '">' +
        esc(d.label) + ' · <span class="num">' + money(d.price) + '</span>' +
      '</button>';
    }).join('');

    var payForm =
      '<div class="card" style="margin-top:8px">' +
      '<label class="fld">Car park</label>' +
      '<div class="seg" id="pk-zone" data-val="' + esc(CAR_PARKS[0].id) + '">' + parkOpts + '</div>' +
      '<div id="pk-zone-hint" style="font-size:11.5px;color:var(--ash);margin-top:4px">' + esc(CAR_PARKS[0].hint) + '</div>' +
      '<label class="fld" style="margin-top:12px">Vehicle registration</label>' +
      '<input class="input" id="pk-reg" maxlength="12" placeholder="e.g. GBZ 123" ' +
        'style="text-transform:uppercase;letter-spacing:1px;font-weight:700" ' +
        'data-act="parkingRegInput">' +
      '<label class="fld" style="margin-top:12px">Duration</label>' +
      '<div class="seg" id="pk-dur" data-val="1" data-p="1.4">' + durOpts + '</div>' +
      '<div class="kv total" style="margin-top:14px">' +
        '<span>Total</span>' +
        '<span id="pk-total" class="num">' + money(DURATIONS[0].price) + '</span>' +
      '</div>' +
      '<button class="btn" style="margin-top:14px" data-act="parkingPay">Pay &amp; Display</button>' +
      '<div class="muted tiny" style="margin-top:8px;text-align:center">' +
        'Operated by Gibraltar Car Parks Ltd · ' +
        '<span class="link" style="color:var(--sea);cursor:pointer" data-act="nav" data-route="https://parking.gibcarparks.com/">gibcarparks.com</span>' +
      '</div>' +
      '</div>';

    // --- Find a space hint ---
    var findHint =
      '<div class="card" style="margin-top:10px;padding:12px 14px;display:flex;align-items:center;gap:12px">' +
      '<span style="font-size:22px">🔍</span>' +
      '<div>' +
        '<div style="font-weight:700;font-size:13.5px">Find a space</div>' +
        '<div style="font-size:12px;color:var(--ash);margin-top:2px">Check live availability at <strong>gibcarparks.com</strong> — spaces fill fast in Gibraltar.</div>' +
      '</div>' +
      '</div>';

    // --- Residential Permit cards ---
    var myPermits = RW.S.parkingPermits;
    var zoneCards = RPS_ZONES.map(function (z) {
      return renderZoneCard(z, myPermits);
    }).join('');

    var permitsSection =
      RW.ui.sectionTitle('Residential Parking Scheme') +
      '<div class="muted tiny" style="margin-bottom:12px">' +
        'Zones 1–4 across Gibraltar. Permit pricing escalates per household — apply early, spaces are genuinely scarce.' +
      '</div>' +
      zoneCards;

    // --- Expired / recent history ---
    var expired = RW.S.parking.filter(function (p) { return p.expires <= Date.now(); });
    var historyHtml = '';
    if (expired.length) {
      var histRows = expired.slice().reverse().slice(0, 5).map(function (p) {
        return RW.ui.row({
          lead: '🅿️',
          leadBg: 'var(--cloud)',
          name: p.zone + ' · ' + p.reg,
          sub: 'Expired · ' + p.duration + ' · Ref ' + p.ref,
          trail: '<span class="num" style="color:var(--ash)">' + money(p.price) + '</span>',
        });
      }).join('');
      historyHtml =
        RW.ui.sectionTitle('Recent sessions') +
        '<div class="card">' + histRows + '</div>';
    }

    var body =
      sessionsHtml +
      RW.ui.sectionTitle('Pay &amp; Display') +
      payForm +
      findHint +
      permitsSection +
      historyHtml;

    return RW.ui.screen({ title: 'Parking', hero: heroHtml, body });
  }

  // ---- activity registration ----

  RW.registerActivity(function () {
    RW.S.parking = RW.S.parking || [];
    return RW.S.parking.map(function (p) {
      var isActive = p.expires > Date.now();
      var rem = isActive ? fmtRemaining(p.expires) : null;
      return {
        t: p.t,
        html: '<div class="card row">' +
          '<div class="lead" style="background:var(--sea-soft)">🅿️</div>' +
          '<div class="body">' +
            '<div class="name">Parking · ' + esc(p.zone) + '</div>' +
            '<div class="sub"><span class="num">' + esc(p.reg) + '</span> · ' + esc(p.duration) +
              (isActive
                ? ' · <span class="pill-status ' + (rem.isWarn ? 'warn' : 'ok') + '"><span class="num">' + esc(rem.text) + '</span></span>'
                : ' · Expired') +
            '</div>' +
          '</div>' +
          '<div class="trail"><span class="num">' + money(p.price) + '</span></div>' +
        '</div>',
      };
    });
  });

  // ---- actions ----

  RW.register({
    id: 'parking',
    title: 'Parking',
    emoji: '🅿️',
    tileBg: '#e6effc',
    section: 'daily',
    order: 60,
    render,
    tick: 30000, // refresh every 30s so the live countdown updates
    actions: {

      // Toggle car park selection — also update the hint text without full re-render
      parkingPickZone: function (el) {
        var seg = el.closest('.seg');
        seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        el.classList.add('on');
        seg.dataset.val = el.dataset.v;
        var cp = CAR_PARKS.filter(function (c) { return c.id === el.dataset.v; })[0];
        var hintEl = document.getElementById('pk-zone-hint');
        if (hintEl && cp) hintEl.textContent = cp.hint;
      },

      // Toggle duration selection and update displayed total
      parkingPickDur: function (el) {
        var seg = el.closest('.seg');
        seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        el.classList.add('on');
        seg.dataset.val = el.dataset.v;
        seg.dataset.p = el.dataset.p;
        var totalEl = document.getElementById('pk-total');
        if (totalEl) totalEl.textContent = money(parseFloat(el.dataset.p));
      },

      // Uppercase reg plate as user types (input event via data-act)
      parkingRegInput: function (el) {
        var pos = el.selectionStart;
        el.value = el.value.toUpperCase();
        el.setSelectionRange(pos, pos);
      },

      // Pay for a pay & display session
      parkingPay: function () {
        var zoneSeg  = document.getElementById('pk-zone');
        var durSeg   = document.getElementById('pk-dur');
        var regInput = document.getElementById('pk-reg');

        var cpId   = zoneSeg ? zoneSeg.dataset.val : CAR_PARKS[0].id;
        var hours  = parseFloat(durSeg ? durSeg.dataset.val : '1');
        var price  = parseFloat(durSeg ? durSeg.dataset.p   : '1.4');
        var rawReg = regInput ? regInput.value.trim().toUpperCase() : '';

        if (!rawReg) {
          RW.toast('Please enter your vehicle registration');
          return;
        }

        // Validate numbers to avoid NaN creeping in
        if (isNaN(hours) || hours <= 0) hours = 1;
        if (isNaN(price) || price <= 0) price = 1.40;

        var cp = CAR_PARKS.filter(function (c) { return c.id === cpId; })[0] || CAR_PARKS[0];
        var durLabel = DURATIONS.filter(function (d) { return d.hours === hours; })[0];
        var durationText = durLabel ? durLabel.label : (hours + 'h');

        if (!RW.store.debit(price, 'Parking · ' + cp.zone)) {
          RW.toast('Insufficient wallet balance — top up first');
          return;
        }

        var now = Date.now();
        var expires = now + (hours * 3600000);

        RW.S.parking = RW.S.parking || [];
        RW.S.parking.push({
          id:       uid(),
          ref:      ref('PK'),
          t:        now,
          zone:     cp.zone,
          reg:      rawReg,
          duration: durationText,
          hours:    hours,
          price:    price,
          expires:  expires,
        });

        RW.store.save();
        RW.toast('🅿️ Paid! Active until ' + fmtExpiry(expires) + ' · ' + rawReg);
        RW.render();
      },

      // Extend an active session by 1 hour (£1.40)
      parkingExtend: function (el) {
        RW.S.parking = RW.S.parking || [];
        var id = el.dataset.id;
        var session = RW.S.parking.filter(function (p) { return p.id === id; })[0];
        if (!session) { RW.toast('Session not found'); return; }

        var extPrice = 1.40;
        if (!RW.store.debit(extPrice, 'Parking extend · ' + session.zone)) {
          RW.toast('Insufficient wallet balance — top up first');
          return;
        }

        // Extend from current expiry (or now if somehow already expired)
        var base = Math.max(session.expires, Date.now());
        session.expires = base + 3600000;
        session.duration = session.duration + ' +1h';

        RW.store.save();
        RW.toast('⏱️ Extended — now expires ' + fmtExpiry(session.expires));
        RW.render();
      },

      // Apply for a residential parking permit
      parkingPermit: function (el) {
        RW.S.parkingPermits = RW.S.parkingPermits || [];
        var zone  = parseInt(el.dataset.zone, 10);
        var zname = el.dataset.zname || ('Zone ' + zone);

        if (isNaN(zone)) { RW.toast('Invalid zone'); return; }

        var alreadyHeld = RW.S.parkingPermits.filter(function (p) { return p.zone === zone; })[0];
        if (alreadyHeld) {
          RW.toast('You already hold a permit for ' + zname);
          return;
        }

        var permitsBefore = RW.S.parkingPermits.length;
        var monthlyPrice  = permitMonthlyPrice(permitsBefore);

        RW.S.parkingPermits.push({
          id:           uid(),
          ref:          ref('RP'),
          t:            Date.now(),
          zone:         zone,
          zoneName:     zname,
          monthlyPrice: monthlyPrice,
          permitsBefore: permitsBefore, // snapshot for display later
          status:       'Applied',
        });

        RW.store.save();
        RW.toast('Applied for ' + zname + ' — ' + money(monthlyPrice) + '/mo · Ref saved');
        RW.render();
      },
    },
  });
})(window.RW);
