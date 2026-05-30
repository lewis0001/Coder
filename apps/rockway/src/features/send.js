/* Rockway feature — Send a parcel (courier). Gibraltar-local pickup/drop-off,
   size selector with descriptions, ETA, pill-status history, empty state. */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref, fmtTime } = RW.util;

  // Common Gibraltar spots offered as quick-fill chips
  const GIB_SPOTS = [
    'Main Street',
    'Ocean Village',
    'Casemates Square',
    'Catalan Bay',
    'Frontier (La Línea)',
  ];

  // Size options: value, label, description, price (£), ETA minutes
  const SIZES = [
    { v: 'Small',  label: 'Small',  desc: 'Fits a shoebox',       p: 4.5,  eta: 25 },
    { v: 'Medium', label: 'Medium', desc: 'Up to a laptop bag',   p: 7.0,  eta: 35 },
    { v: 'Large',  label: 'Large',  desc: 'Needs two hands',      p: 11.0, eta: 50 },
  ];

  // Map status string → pill-status CSS modifier
  function statusClass(s) {
    if (!s) return 'neutral';
    const lc = s.toLowerCase();
    if (lc.indexOf('deliver') !== -1) return 'ok';
    if (lc.indexOf('transit') !== -1 || lc.indexOf('collected') !== -1) return 'info';
    if (lc.indexOf('assign') !== -1 || lc.indexOf('booked') !== -1) return 'warn';
    return 'neutral';
  }

  // Return current size object from the live seg, or SIZES[0] as fallback
  function currentSize() {
    var seg = document.getElementById('p-size');
    if (seg) {
      var v = seg.dataset.val;
      for (var i = 0; i < SIZES.length; i++) { if (SIZES[i].v === v) return SIZES[i]; }
    }
    return SIZES[0];
  }

  function render() {
    var parcels = RW.S.parcels = RW.S.parcels || [];
    var defaultSize = SIZES[0];

    // ---- booking card ----
    var sizeButtons = SIZES.map(function (s) {
      var on = s.v === defaultSize.v ? ' class="on"' : '';
      return '<button' + on + ' data-act="psize" data-v="' + esc(s.v) + '" data-p="' + s.p + '" data-eta="' + s.eta + '">' +
        '<span style="font-weight:800">' + esc(s.label) + '</span>' +
        '<br><span style="font-size:11px;opacity:.7;font-weight:500">' + esc(s.desc) + '</span>' +
        '</button>';
    }).join('');

    var dropChips = GIB_SPOTS.map(function (spot) {
      return '<span class="chip tap" data-act="sendFillDrop" data-v="' + esc(spot) + '">' + esc(spot) + '</span>';
    }).join('');

    var pickChips = GIB_SPOTS.map(function (spot) {
      return '<span class="chip tap" data-act="sendFillPick" data-v="' + esc(spot) + '">' + esc(spot) + '</span>';
    }).join('');

    var bookCard =
      '<div class="card" style="margin-top:8px">' +

      '<label class="fld" style="margin-top:0">Pick-up address</label>' +
      '<input class="input" id="p-from" placeholder="e.g. 12 Main Street, Gibraltar">' +
      '<div class="chips" style="margin-top:6px">' + pickChips + '</div>' +

      '<label class="fld">Drop-off address</label>' +
      '<input class="input" id="p-to" placeholder="e.g. Ocean Village Marina">' +
      '<div class="chips" style="margin-top:6px">' + dropChips + '</div>' +

      '<label class="fld">Parcel size</label>' +
      '<div class="seg" id="p-size" data-val="' + esc(defaultSize.v) + '" style="flex-direction:column;height:auto;gap:4px">' +
      sizeButtons +
      '</div>' +

      '<div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between">' +
      '<div class="kv" style="flex:1;padding:0;margin:0;border:0"><span style="color:var(--ash);font-size:13px">Estimated arrival</span>' +
      '<span id="p-eta" class="num" style="font-weight:800;color:var(--sea)">' + defaultSize.eta + ' min</span></div>' +
      '</div>' +

      '<div class="kv total"><span>Quote</span><span id="p-quote" class="num">' + money(defaultSize.p) + '</span></div>' +

      '<button class="btn" style="margin-top:12px" data-act="sendParcel">📦 Book courier</button>' +
      '</div>';

    // ---- parcel history ----
    var histSection = '';
    if (parcels.length === 0) {
      histSection = RW.ui.sectionTitle('Your parcels') +
        RW.ui.empty('📦', 'No parcels sent yet.\nBook a courier above and it will appear here.');
    } else {
      var rows = parcels.slice().reverse().map(function (p) {
        var sc = statusClass(p.status);
        var pill = '<span class="pill-status ' + sc + '">' + esc(p.status || 'Booked') + '</span>';
        var ts = p.t ? '<span class="muted tiny">' + esc(fmtTime(p.t)) + '</span>' : '';
        return RW.ui.row({
          lead: '📦',
          leadBg: 'var(--sea-soft)',
          name: esc(p.size) + ' parcel → ' + esc(p.to),
          sub: 'Ref ' + esc(p.ref),
          trail: '<div style="text-align:right">' +
            '<div class="num" style="font-weight:800;font-size:13px">' + money(p.price) + '</div>' +
            '<div style="margin-top:3px">' + pill + '</div>' +
            (ts ? '<div style="margin-top:2px">' + ts + '</div>' : '') +
            '</div>',
        });
      }).join('');
      histSection = RW.ui.sectionTitle('Your parcels') + '<div class="card">' + rows + '</div>';
    }

    var heroHtml = RW.ui.hero({
      emoji: '📦',
      title: 'Send a parcel',
      sub: 'Fast local courier across Gibraltar',
      accent: '#7c3aed',
      chips: ['Same-day delivery', 'Tracked', 'Insured'],
    });

    var body = bookCard + histSection;

    return RW.ui.screen({ title: 'Send a parcel', body: body, hero: heroHtml });
  }

  RW.register({
    id: 'send',
    title: 'Send',
    emoji: '📦',
    tileBg: '#ede7fb',
    section: 'daily',
    order: 30,
    render: render,
    actions: {
      // Update size selection and refresh quote + ETA without full re-render
      psize: function (el) {
        var seg = el.closest('.seg');
        if (!seg) return;
        seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        el.classList.add('on');
        seg.dataset.val = el.dataset.v;
        var price = parseFloat(el.dataset.p);
        var eta   = parseInt(el.dataset.eta, 10);
        var qEl = document.getElementById('p-quote');
        var eEl = document.getElementById('p-eta');
        if (qEl) qEl.textContent = money(isNaN(price) ? 0 : price);
        if (eEl) eEl.textContent = (isNaN(eta) ? '—' : eta) + ' min';
      },

      // Fill pick-up field from chip tap
      sendFillPick: function (el) {
        var inp = document.getElementById('p-from');
        if (inp) inp.value = el.dataset.v || '';
      },

      // Fill drop-off field from chip tap
      sendFillDrop: function (el) {
        var inp = document.getElementById('p-to');
        if (inp) inp.value = el.dataset.v || '';
      },

      // Book the courier
      sendParcel: function () {
        var fromEl = document.getElementById('p-from');
        var toEl   = document.getElementById('p-to');
        var from   = (fromEl ? fromEl.value : '').trim();
        var to     = (toEl   ? toEl.value   : '').trim();

        if (!from) { RW.toast('Please enter a pick-up address'); return; }
        if (!to)   { RW.toast('Please enter a drop-off address'); return; }
        if (from === to) { RW.toast('Pick-up and drop-off must differ'); return; }

        var size  = currentSize();
        var price = size.p;
        var eta   = size.eta;

        if (!RW.store.debit(price, 'Parcel to ' + to)) {
          RW.toast('Not enough balance — please top up your wallet');
          return;
        }

        RW.S.parcels = RW.S.parcels || [];
        RW.S.parcels.push({
          id:     uid(),
          ref:    ref('PX'),
          t:      Date.now(),
          to:     to,
          from:   from,
          size:   size.v,
          price:  price,
          status: 'Courier assigned',
        });
        RW.store.save();

        RW.toast('📦 Courier booked — arriving in ~' + eta + ' min!');
        RW.render();
      },
    },
  });
})(window.RW);
