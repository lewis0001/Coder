/* Rockway feature — Bills (Gibraltar utility, telecom & government bills). */
(function (RW) {
  'use strict';
  const { esc, money, fmtTime } = RW.util;

  // Guard: ensure bills map exists (store.js already seeds it, but guard for safety)
  RW.S.bills = RW.S.bills || {};

  // ---- Authentic Gibraltar billers ----
  // AquaGib: potable water (metered, monthly) + GEA electricity (billed by AquaGib on GEA's behalf).
  // Gibraltar Rates: covers salt-water mains (not metered — flat rate), refuse collection, street services.
  // Gibtelecom / GibFibre: broadband (GibFibre) + landline bundle.
  // u-mee: alternative broadband/TV/mobile provider.
  // Gov Housing Rent: government housing rent via gov.gi pay-rent eService (optional).
  const BILLERS = [
    {
      id: 'aquagib',
      name: 'AquaGib',
      sub: 'Water + Electricity (GEA, billed via AquaGib)',
      emoji: '💧',
      amount: 68.40,
      breakdown: [
        { label: 'Potable water (metered)', amount: 22.40 },
        { label: 'Electricity — GEA / GibElec charge', amount: 46.00 },
      ],
      note: 'GEA (Gibraltar Electricity Authority) does not bill directly — the electricity charge is a line item inside your AquaGib bill. Pay at AquaGib offices, Suite 10b, Leanse Place, 50 Town Range, or by Direct Debit / online.',
      contact: '+350 20075957',
      optional: false,
    },
    {
      id: 'rates',
      name: 'Gibraltar Rates',
      sub: 'Incl. salt-water mains, refuse & street services',
      emoji: '🏛️',
      amount: 45.00,
      breakdown: [
        { label: 'Residential rates', amount: 30.00 },
        { label: 'Salt-water mains (flat, not metered)', amount: 10.00 },
        { label: 'Refuse & street services', amount: 5.00 },
      ],
      note: 'Salt water (used for toilet flushing, firefighting, street cleaning) is supplied via a separate mains network and charged as a flat component of Rates — it is not metered.',
      contact: 'HM Government of Gibraltar — Finance Centre',
      optional: false,
    },
    {
      id: 'gibtelecom',
      name: 'Gibtelecom / GibFibre',
      sub: 'Broadband (GibFibre) + landline bundle',
      emoji: '📡',
      amount: 39.99,
      breakdown: [
        { label: 'GibFibre broadband', amount: 29.99 },
        { label: 'Landline (Dual Play)', amount: 10.00 },
      ],
      note: 'Gibtelecom is the incumbent provider (government-owned). GibFibre is their fibre-broadband brand. Bundles available: Dual Play (broadband + landline) and Triple Play (+ TV). gibtele.com',
      contact: '+350 20052200',
      optional: false,
    },
    {
      id: 'umee',
      name: 'u-mee',
      sub: 'Alternative broadband / TV / mobile',
      emoji: '📶',
      amount: 34.99,
      breakdown: [
        { label: 'Broadband', amount: 24.99 },
        { label: 'TV / mobile add-on', amount: 10.00 },
      ],
      note: 'u-mee is the main competitor to Gibtelecom, offering broadband, TV and mobile plans. You are only likely to have one of Gibtelecom or u-mee — the other will show as inactive.',
      contact: 'u-mee.com',
      optional: true,
    },
    {
      id: 'gov-rent',
      name: 'Government Housing Rent',
      sub: 'HM Gov Gibraltar — pay-rent eService (gov.gi)',
      emoji: '🏠',
      amount: 120.00,
      breakdown: [
        { label: 'Monthly housing rent', amount: 120.00 },
      ],
      note: 'Applicable only to residents in government-owned housing. Pay via the gov.gi pay-rent eService portal.',
      contact: 'gov.gi/pay-rent',
      optional: true,
    },
  ];

  // ---- helpers ----
  function billerState(id) {
    return RW.S.bills[id] || null;
  }

  function isPaid(id) {
    var s = billerState(id);
    return s && s.paidAt ? true : false;
  }

  function hasDirectDebit(id) {
    var s = billerState(id);
    return s && s.directDebit ? true : false;
  }

  function isHidden(id) {
    var s = billerState(id);
    return s && s.hidden ? true : false;
  }

  // Format a timestamp as a short date (e.g. "29 May")
  function shortDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function billerCard(b) {
    var paid = isPaid(b.id);
    var dd = hasDirectDebit(b.id);
    var state = billerState(b.id);

    // Breakdown lines — nested elegantly
    var breakdownHtml = b.breakdown.map(function (item) {
      return '<div class="kv" style="padding:5px 0;font-size:13px">' +
        '<span style="color:var(--ash)">' + esc(item.label) + '</span>' +
        '<span class="num">' + esc(money(item.amount)) + '</span>' +
      '</div>';
    }).join('');

    // Status pill
    var statusPill = paid
      ? '<span class="pill-status ok">✓ Paid ' + esc(shortDate(state.paidAt)) + '</span>'
      : (dd
        ? '<span class="pill-status info">↻ Direct Debit</span>'
        : '<span class="pill-status warn">Due</span>');

    // Pay button
    var payBtn = paid
      ? '<button class="btn sm ghost" disabled style="opacity:0.4;cursor:not-allowed;pointer-events:none">✓ Paid</button>'
      : '<button class="btn sm sea" data-act="billsPay" data-id="' + esc(b.id) + '" data-amount="' + b.amount + '" data-name="' + esc(b.name) + '">Pay <span class="num">' + esc(money(b.amount)) + '</span></button>';

    // Direct Debit toggle
    var ddBtn = dd
      ? '<button class="btn sm ghost" data-act="billsDirectDebitOff" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '" style="color:var(--sea)">✓ DD on</button>'
      : '<button class="btn sm ghost" data-act="billsDirectDebitOn" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '">Set up DD</button>';

    // Optional biller hide/show
    var optionalBtn = b.optional
      ? '<button class="btn sm ghost" data-act="billsToggleOptional" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '" style="font-size:11px">Hide</button>'
      : '';

    // Card accent: paid cards are visually quieter
    var cardStyle = paid
      ? 'style="margin-bottom:12px;opacity:0.75"'
      : 'style="margin-bottom:12px"';

    return '<div class="card" ' + cardStyle + '>' +
      // Header: logo emoji + name/sub + status pill
      '<div style="display:flex;align-items:center;gap:12px;padding-bottom:10px">' +
        '<div style="width:46px;height:46px;border-radius:14px;background:var(--cloud);display:grid;place-items:center;font-size:24px;flex:0 0 auto">' +
          b.emoji +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14.5px">' + esc(b.name) + '</div>' +
          '<div style="font-size:12px;color:var(--ash);margin-top:2px">' + esc(b.sub) + '</div>' +
        '</div>' +
        '<div>' + statusPill + '</div>' +
      '</div>' +
      // Breakdown section
      '<div style="border-top:1px solid var(--mist);padding:8px 0 4px">' +
        breakdownHtml +
        '<div class="kv total"><span>Total</span><span class="num">' + esc(money(b.amount)) + '</span></div>' +
      '</div>' +
      // Note (authentic Gibraltar detail)
      '<div style="padding:8px 0 4px">' +
        '<div style="font-size:11px;color:var(--ash);line-height:1.45">' + esc(b.note) + '</div>' +
        '<div style="font-size:11px;color:var(--ash);margin-top:3px">Contact: ' + esc(b.contact) + '</div>' +
      '</div>' +
      // Action bar
      '<div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--mist);padding-top:10px;margin-top:4px">' +
        payBtn + ddBtn + optionalBtn +
      '</div>' +
    '</div>';
  }

  function hiddenRow(b) {
    return RW.ui.row({
      lead: b.emoji,
      leadBg: 'var(--cloud)',
      name: b.name,
      sub: 'Optional biller — hidden',
      trail: '<button class="btn sm ghost" data-act="billsToggleOptional" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '" style="font-size:11px">Show</button>',
    });
  }

  function render() {
    RW.S.bills = RW.S.bills || {};

    var visibleBillers = BILLERS.filter(function (b) { return !b.optional || !isHidden(b.id); });
    var hiddenBillers  = BILLERS.filter(function (b) { return b.optional && isHidden(b.id); });
    var paidCount      = visibleBillers.filter(function (b) { return isPaid(b.id); }).length;
    var unpaidBillers  = visibleBillers.filter(function (b) { return !isPaid(b.id); });
    var totalDue       = unpaidBillers.reduce(function (acc, b) { return acc + b.amount; }, 0);
    var allPaid        = unpaidBillers.length === 0 && visibleBillers.length > 0;

    // ---- Summary stats strip ----
    var ddCount = visibleBillers.filter(function (b) { return hasDirectDebit(b.id); }).length;
    var statsHtml =
      '<div class="grid2" style="margin-bottom:16px">' +
        '<div class="stat">' +
          '<div class="n num" style="color:' + (totalDue > 0 ? 'var(--brand)' : 'var(--green)') + '">' +
            esc(money(totalDue)) +
          '</div>' +
          '<div class="l">Total due</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="n">' + paidCount + ' <span style="font-size:14px;font-weight:600;color:var(--ash)">/ ' + visibleBillers.length + '</span></div>' +
          '<div class="l">Paid this cycle</div>' +
        '</div>' +
      '</div>';

    // ---- Direct Debit info strip (if any active) ----
    var ddInfoHtml = ddCount > 0
      ? '<div style="background:var(--sea-soft);color:var(--sea);border-radius:10px;padding:9px 13px;font-size:12px;font-weight:600;margin-bottom:14px">' +
          '↻ ' + ddCount + ' Direct Debit' + (ddCount > 1 ? 's' : '') + ' active — payments collected automatically each month' +
        '</div>'
      : '';

    // ---- Bill cards or all-paid state ----
    var billsBodyHtml;
    if (allPaid) {
      billsBodyHtml =
        RW.ui.empty('✅', '¡Todo pagao! All bills settled for this cycle.') +
        '<div style="margin-top:16px">' +
          visibleBillers.map(billerCard).join('') +
        '</div>';
    } else {
      billsBodyHtml = visibleBillers.map(billerCard).join('');
    }

    // ---- Hidden billers section ----
    var hiddenSectionHtml = hiddenBillers.length
      ? RW.ui.sectionTitle('Optional (hidden)') +
        '<div class="card" style="padding:0 12px">' +
          hiddenBillers.map(hiddenRow).join('') +
        '</div>'
      : '';

    var body =
      statsHtml +
      ddInfoHtml +
      RW.ui.sectionTitle('Your Bills') +
      billsBodyHtml +
      hiddenSectionHtml +
      '<div style="text-align:center;font-size:11.5px;color:var(--ash);margin-top:18px;line-height:1.5">' +
        'Gibraltar pound (GIP) · pegged 1:1 to GBP · all amounts debited from Rockway Wallet' +
      '</div>';

    return RW.ui.screen({ title: 'Bills', body });
  }

  // ---- Activity feed ----
  RW.registerActivity(function () {
    RW.S.bills = RW.S.bills || {};
    var items = [];
    Object.keys(RW.S.bills).forEach(function (id) {
      var entry = RW.S.bills[id];
      if (!entry) return;
      var biller = BILLERS.filter(function (b) { return b.id === id; })[0];
      var name = biller ? biller.name : id;
      if (entry.paidAt) {
        items.push({
          t: entry.paidAt,
          html: '<div class="card row">' +
            '<div class="lead">🧾</div>' +
            '<div class="body">' +
              '<div class="name">' + esc(name) + ' bill paid</div>' +
              '<div class="sub"><span class="num">' + esc(money(entry.amount)) + '</span> · ' + esc(fmtTime(entry.paidAt)) + '</div>' +
            '</div>' +
            '<div class="trail"><span class="pill-status ok">Paid</span></div>' +
          '</div>',
        });
      }
      if (entry.directDebit && entry.directDebitSetAt) {
        items.push({
          t: entry.directDebitSetAt,
          html: '<div class="card row">' +
            '<div class="lead">↻</div>' +
            '<div class="body">' +
              '<div class="name">' + esc(name) + ' — Direct Debit active</div>' +
              '<div class="sub">' + esc(fmtTime(entry.directDebitSetAt)) + '</div>' +
            '</div>' +
            '<div class="trail"><span class="pill-status info">DD Active</span></div>' +
          '</div>',
        });
      }
    });
    return items;
  });

  // ---- Actions ----
  RW.register({
    id: 'bills',
    title: 'Bills',
    emoji: '🧾',
    tileBg: '#fde7ea',
    section: 'money',
    order: 30,
    render: render,
    actions: {
      billsPay: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id     = el.dataset.id;
        var name   = el.dataset.name;
        var amount = parseFloat(el.dataset.amount);
        if (!id || isNaN(amount) || amount <= 0) {
          RW.toast('Invalid bill data.');
          return;
        }
        if (isPaid(id)) {
          RW.toast(esc(name) + ' is already marked as paid this cycle.');
          return;
        }
        var ok = RW.store.debit(amount, name + ' bill');
        if (!ok) {
          RW.toast('Insufficient funds — top up your wallet to pay ' + money(amount) + '.');
          return;
        }
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          paidAt: Date.now(),
          amount: amount,
        });
        RW.store.save();
        RW.toast('✓ ' + name + ' paid — ' + money(amount) + ' debited from wallet.');
        RW.render();
      },

      billsDirectDebitOn: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id   = el.dataset.id;
        var name = el.dataset.name;
        if (!id) return;
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          directDebit: true,
          directDebitSetAt: Date.now(),
        });
        RW.store.save();
        RW.toast('↻ Direct Debit set up for ' + name + '. Mandate registered — payments collected automatically.');
        RW.render();
      },

      billsDirectDebitOff: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id   = el.dataset.id;
        var name = el.dataset.name;
        if (!id) return;
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          directDebit: false,
          directDebitSetAt: null,
        });
        RW.store.save();
        RW.toast('Direct Debit cancelled for ' + name + '. You will need to pay manually.');
        RW.render();
      },

      billsToggleOptional: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id      = el.dataset.id;
        var name    = el.dataset.name;
        if (!id) return;
        var current = isHidden(id);
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          hidden: !current,
        });
        RW.store.save();
        RW.toast(current ? 'Showing ' + name + '.' : name + ' hidden — tap Show to restore.');
        RW.render();
      },

      billsView: function (el) {
        var id     = el.dataset.id;
        var biller = BILLERS.filter(function (b) { return b.id === id; })[0];
        if (!biller) return;
        RW.toast(biller.name + ': ' + money(biller.amount) + ' due. ' + biller.contact);
      },
    },
  });
})(window.RW);
