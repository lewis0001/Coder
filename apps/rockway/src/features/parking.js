/* Rockway feature — Parking (Gibraltar pay & display + residential permits). */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref } = RW.util;

  // ---- Gibraltar pay & display car parks (gibcarparks.com) ----
  const CAR_PARKS = [
    { id: 'mid-harbour',   name: 'Mid-Harbour',    zone: 'Mid-Harbour'    },
    { id: 'eurotowers',    name: 'Eurotowers',      zone: 'Eurotowers'     },
    { id: 'devils-tongue', name: "Devil's Tongue",  zone: "Devil's Tongue" },
    { id: 'icc',           name: 'ICC',             zone: 'ICC'            },
    { id: 'coach-park',    name: 'Coach Park',      zone: 'Coach Park'     },
  ];

  // Pay & display tariff
  const DURATIONS = [
    { label: '1 hour',    hours: 1,  price: 1.40 },
    { label: '2 hours',   hours: 2,  price: 2.40 },
    { label: '4 hours',   hours: 4,  price: 4.00 },
    { label: 'All day',   hours: 10, price: 8.00 },
  ];

  // Residential Parking Scheme zones
  const RPS_ZONES = [
    { zone: 1, name: 'Zone 1', area: 'Town Centre / Main Street',       price1: 5,  price2: 10, price3: 20 },
    { zone: 2, name: 'Zone 2', area: 'Westside / Glacis Estate',        price1: 5,  price2: 10, price3: 20 },
    { zone: 3, name: 'Zone 3', area: 'Moorish Castle / Upper Town',     price1: 5,  price2: 10, price3: 20 },
    { zone: 4, name: 'Zone 4', area: 'Reclamation Areas / Ocean Village', price1: 5, price2: 10, price3: 20 },
  ];

  // ---- helpers ----

  function activeSessions() {
    RW.S.parking = RW.S.parking || [];
    return RW.S.parking.filter(function (p) { return p.expires > Date.now(); });
  }

  function fmtRemaining(expires) {
    var ms = expires - Date.now();
    if (ms <= 0) return 'Expired';
    var totalMins = Math.floor(ms / 60000);
    var h = Math.floor(totalMins / 60);
    var m = totalMins % 60;
    if (h > 0) return h + 'h ' + m + 'm remaining';
    return m + 'm remaining';
  }

  function selectedParkValue(container) {
    var el = container.querySelector('[data-val]');
    return el ? el.dataset.val : CAR_PARKS[0].id;
  }

  // ---- render ----

  function render() {
    RW.S.parking = RW.S.parking || [];

    // --- Pay & Display form ---
    var parkOpts = CAR_PARKS.map(function (cp, i) {
      return '<button class="' + (i === 0 ? 'on' : '') + '" data-act="parkingPickZone" data-v="' + esc(cp.id) + '">' + esc(cp.name) + '</button>';
    }).join('');

    var durOpts = DURATIONS.map(function (d, i) {
      return '<button class="' + (i === 0 ? 'on' : '') + '" data-act="parkingPickDur" data-v="' + d.hours + '" data-p="' + d.price + '">' + esc(d.label) + ' · ' + money(d.price) + '</button>';
    }).join('');

    var payForm =
      '<div class="card" style="margin-top:8px">' +
      '<div class="fld" style="font-size:.78rem;color:var(--muted);margin-bottom:4px">Car park / zone</div>' +
      '<div class="seg" id="pk-zone" data-val="' + CAR_PARKS[0].id + '">' + parkOpts + '</div>' +
      '<label class="fld" style="margin-top:12px">Vehicle registration</label>' +
      '<input class="input" id="pk-reg" maxlength="12" placeholder="e.g. GBZ 123" style="text-transform:uppercase">' +
      '<div class="fld" style="font-size:.78rem;color:var(--muted);margin:12px 0 4px">Duration</div>' +
      '<div class="seg" id="pk-dur" data-val="1" data-p="1.4">' + durOpts + '</div>' +
      '<div class="kv total" style="margin-top:14px"><span>Total</span><span id="pk-total">' + money(DURATIONS[0].price) + '</span></div>' +
      '<div class="muted tiny" style="margin-top:6px">Operated by Gibraltar Car Parks Ltd (gibcarparks.com)</div>' +
      '<button class="btn" style="margin-top:12px" data-act="parkingPay">Pay &amp; Display</button>' +
      '</div>';

    // --- Active sessions ---
    var active = activeSessions();
    var sessionsHtml = '';
    if (active.length) {
      var rows = active.map(function (p) {
        return '<div class="row">' +
          '<div class="lead" style="background:#e6effc">🅿️</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(p.zone) + ' · ' + esc(p.reg) + '</div>' +
            '<div class="sub">' + esc(fmtRemaining(p.expires)) + ' · ' + esc(p.duration) + '</div>' +
          '</div>' +
          '<div class="trail">' +
            '<button class="btn sm ghost" data-act="parkingExtend" data-id="' + esc(p.id) + '">Extend</button>' +
          '</div>' +
        '</div>';
      }).join('');
      sessionsHtml = RW.ui.sectionTitle('Active sessions') + '<div class="card">' + rows + '</div>';
    }

    // --- Residential Permit cards ---
    RW.S.parkingPermits = RW.S.parkingPermits || [];
    var myPermitZones = RW.S.parkingPermits.map(function (p) { return p.zone; });

    var zoneCards = RPS_ZONES.map(function (z) {
      var hasPermit = myPermitZones.indexOf(z.zone) !== -1;
      var myPermit = RW.S.parkingPermits.filter(function (p) { return p.zone === z.zone; })[0];
      var statusBadge = hasPermit
        ? '<span class="pill-status ok" style="margin-left:8px">Active · Ref ' + esc(myPermit.ref) + '</span>'
        : '';
      var permitCount = RW.S.parkingPermits.length + 1;
      var displayPrice = permitCount === 1 ? z.price1 : (permitCount === 2 ? z.price2 : z.price3);
      return '<div class="row">' +
        '<div class="lead" style="background:#e6effc;font-size:1.1rem">' + z.zone + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(z.name) + statusBadge + '</div>' +
          '<div class="sub">' + esc(z.area) + '</div>' +
          '<div class="sub">£' + displayPrice + '/month (1st permit £5 · 2nd £10 · 3rd £20+)</div>' +
        '</div>' +
        '<div class="trail">' +
          (hasPermit
            ? '<span class="muted tiny">Held</span>'
            : '<button class="btn sm" data-act="parkingPermit" data-zone="' + z.zone + '" data-zname="' + esc(z.name) + '">Apply</button>') +
        '</div>' +
      '</div>';
    }).join('');

    var permitsSection =
      RW.ui.sectionTitle('Residential Parking Scheme', 'gibcarparks.com', 'https://parking.gibcarparks.com/') +
      '<div class="muted tiny" style="margin-bottom:10px">Zones 1–4 · Permit pricing escalates per household permit held. Scarcity is real — apply early.</div>' +
      '<div class="card">' + zoneCards + '</div>';

    // --- Expired history ---
    var expired = RW.S.parking.filter(function (p) { return p.expires <= Date.now(); });
    var historyHtml = '';
    if (expired.length) {
      var histRows = expired.slice().reverse().slice(0, 5).map(function (p) {
        return '<div class="row">' +
          '<div class="lead" style="background:#f0f0f0">🅿️</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(p.zone) + ' · ' + esc(p.reg) + '</div>' +
            '<div class="sub">Expired · ' + esc(p.duration) + ' · Ref ' + esc(p.ref) + '</div>' +
          '</div>' +
          '<div class="trail muted">' + money(p.price) + '</div>' +
        '</div>';
      }).join('');
      historyHtml = RW.ui.sectionTitle('Recent sessions') + '<div class="card">' + histRows + '</div>';
    }

    var body =
      '<div class="muted tiny" style="margin-bottom:10px">Parking is scarce in Gibraltar. Pay &amp; display bays and residential permits managed via Gibraltar Car Parks Ltd.</div>' +
      RW.ui.sectionTitle('Pay &amp; Display') +
      payForm +
      sessionsHtml +
      permitsSection +
      historyHtml;

    return RW.ui.screen({ title: 'Parking', body });
  }

  // ---- activity registration ----

  RW.registerActivity(function () {
    RW.S.parking = RW.S.parking || [];
    return RW.S.parking.map(function (p) {
      var isActive = p.expires > Date.now();
      return {
        t: p.t,
        html: '<div class="card row">' +
          '<div class="lead" style="background:#e6effc">🅿️</div>' +
          '<div class="body">' +
            '<div class="name">Parking · ' + esc(p.zone) + '</div>' +
            '<div class="sub">' + esc(p.reg) + ' · ' + esc(p.duration) + (isActive ? ' · ' + fmtRemaining(p.expires) : ' · Expired') + '</div>' +
          '</div>' +
          '<div class="trail">' + money(p.price) + '</div>' +
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
    actions: {

      // Toggle car park selection in segmented control
      parkingPickZone: function (el) {
        var seg = el.closest('.seg');
        seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        el.classList.add('on');
        seg.dataset.val = el.dataset.v;
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

      // Pay for a pay & display session
      parkingPay: function () {
        var zoneSeg = document.getElementById('pk-zone');
        var durSeg  = document.getElementById('pk-dur');
        var regInput = document.getElementById('pk-reg');

        var cpId    = zoneSeg ? zoneSeg.dataset.val : CAR_PARKS[0].id;
        var hours   = parseFloat(durSeg ? durSeg.dataset.val : '1');
        var price   = parseFloat(durSeg ? durSeg.dataset.p   : '1.4');
        var rawReg  = regInput ? regInput.value.trim().toUpperCase() : '';

        if (!rawReg) { RW.toast('Please enter your vehicle registration'); return; }

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
        RW.toast('🅿️ Paid! Session active until ' + new Date(expires).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        RW.render();
      },

      // Extend an active session by 1 hour
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

        // Extend from current expiry (or now if already expired)
        var base = Math.max(session.expires, Date.now());
        session.expires = base + 3600000;
        session.duration = session.duration + ' +1h';

        RW.store.save();
        RW.toast('⏱️ Extended by 1 hour — now expires ' + new Date(session.expires).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        RW.render();
      },

      // Apply for a residential parking permit (no payment — council approval flow)
      parkingPermit: function (el) {
        RW.S.parkingPermits = RW.S.parkingPermits || [];
        var zone  = parseInt(el.dataset.zone, 10);
        var zname = el.dataset.zname || ('Zone ' + zone);

        var alreadyHeld = RW.S.parkingPermits.filter(function (p) { return p.zone === zone; })[0];
        if (alreadyHeld) {
          RW.toast('You already hold a permit for ' + zname);
          return;
        }

        var permitCount = RW.S.parkingPermits.length; // 0-based before push
        var monthlyPrice = permitCount === 0 ? 5 : (permitCount === 1 ? 10 : 20 * Math.pow(2, permitCount - 2));

        RW.S.parkingPermits.push({
          id:           uid(),
          ref:          ref('RP'),
          t:            Date.now(),
          zone:         zone,
          zoneName:     zname,
          monthlyPrice: monthlyPrice,
          status:       'Applied',
        });

        RW.store.save();
        RW.toast('Application submitted for ' + zname + ' (£' + monthlyPrice + '/month) — you\'ll be notified of approval');
        RW.render();
      },
    },
  });
})(window.RW);
