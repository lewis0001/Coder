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
    const s = billerState(id);
    return s && s.paidAt ? true : false;
  }

  function hasDirectDebit(id) {
    const s = billerState(id);
    return s && s.directDebit ? true : false;
  }

  function isHidden(id) {
    const s = billerState(id);
    return s && s.hidden ? true : false;
  }

  function billerRow(b) {
    const paid = isPaid(b.id);
    const dd = hasDirectDebit(b.id);
    const hidden = isHidden(b.id);

    // Build breakdown lines
    const breakdownHtml = b.breakdown.map(function (item) {
      return '<div class="kv"><span>' + esc(item.label) + '</span><span>' + esc(money(item.amount)) + '</span></div>';
    }).join('');

    // Status pill
    const statusPill = paid
      ? '<span class="pill-status ok">Paid ' + esc(fmtTime(billerState(b.id).paidAt)) + '</span>'
      : '<span class="pill-status warn">Due</span>';

    // Pay button (disabled if already paid)
    const payBtn = paid
      ? '<button class="btn sm ghost" disabled style="opacity:0.45;cursor:not-allowed">Paid</button>'
      : '<button class="btn sm" data-act="billsPay" data-id="' + esc(b.id) + '" data-amount="' + b.amount + '" data-name="' + esc(b.name) + '">Pay ' + esc(money(b.amount)) + '</button>';

    // Direct Debit toggle
    const ddBtn = dd
      ? '<button class="btn sm ghost" data-act="billsDirectDebitOff" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '" style="color:var(--green)">✓ Direct Debit</button>'
      : '<button class="btn sm ghost" data-act="billsDirectDebitOn" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '">Set up Direct Debit</button>';

    // Optional biller hide/show toggle label
    const optionalToggle = b.optional
      ? '<button class="btn sm ghost" data-act="billsToggleOptional" data-id="' + esc(b.id) + '" data-name="' + esc(b.name) + '" style="font-size:11px;padding:4px 8px">' + (hidden ? 'Show' : 'Hide') + '</button>'
      : '';

    if (hidden) {
      return '<div class="row" style="opacity:0.5">' +
        '<div class="lead" style="font-size:22px">' + b.emoji + '</div>' +
        '<div class="body"><div class="name">' + esc(b.name) + '</div><div class="sub muted">Hidden (optional biller)</div></div>' +
        '<div class="trail">' + optionalToggle + '</div>' +
        '</div>';
    }

    return '<div class="card" style="margin-bottom:12px">' +
      // Header row: emoji, name, status pill
      '<div class="row" style="padding-bottom:0">' +
        '<div class="lead" style="font-size:22px">' + b.emoji + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(b.name) + '</div>' +
          '<div class="sub">' + esc(b.sub) + '</div>' +
        '</div>' +
        '<div class="trail">' + statusPill + '</div>' +
      '</div>' +
      // Breakdown
      '<div style="padding:8px 12px 4px;border-top:1px solid var(--rule,#f0f0f0);margin-top:6px">' +
        breakdownHtml +
        '<div class="kv total"><span>Total</span><span>' + esc(money(b.amount)) + '</span></div>' +
      '</div>' +
      // Note (authentic detail)
      '<div style="padding:6px 12px 8px">' +
        '<div class="sub muted" style="font-size:11px;line-height:1.4">' + esc(b.note) + '</div>' +
        '<div class="sub muted" style="font-size:11px;margin-top:3px">Contact: ' + esc(b.contact) + '</div>' +
      '</div>' +
      // Action buttons
      '<div style="padding:8px 12px 12px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--rule,#f0f0f0)">' +
        payBtn + ddBtn + (b.optional ? optionalToggle : '') +
      '</div>' +
    '</div>';
  }

  function render() {
    RW.S.bills = RW.S.bills || {};

    const activeBillers = BILLERS.filter(function (b) { return !b.optional || !isHidden(b.id); });
    const hiddenBillers = BILLERS.filter(function (b) { return b.optional && isHidden(b.id); });

    const paidCount = BILLERS.filter(function (b) { return isPaid(b.id); }).length;
    const totalDue = BILLERS.filter(function (b) { return !isPaid(b.id) && !isHidden(b.id); })
      .reduce(function (acc, b) { return acc + b.amount; }, 0);

    const summaryCard =
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="kv"><span>Bills due</span><span class="' + (totalDue > 0 ? 'warn' : '') + '">' + esc(money(totalDue)) + '</span></div>' +
        '<div class="kv"><span>Paid this cycle</span><span>' + paidCount + ' of ' + BILLERS.length + '</span></div>' +
        '<div class="sub muted" style="padding:6px 12px 8px;font-size:11px">' +
          'Gibraltar pound (GIP) · pegged 1:1 to GBP · all payments via Rockway Wallet' +
        '</div>' +
      '</div>';

    const billersHtml = BILLERS.map(billerRow).join('');

    const hiddenNotice = hiddenBillers.length
      ? '<div class="muted tiny" style="text-align:center;margin-top:8px">' +
          hiddenBillers.length + ' optional biller(s) hidden — show from the row above.' +
        '</div>'
      : '';

    const body =
      summaryCard +
      RW.ui.sectionTitle('Your Bills') +
      billersHtml +
      hiddenNotice +
      '<div class="muted tiny" style="margin-top:16px;text-align:center">' +
        'Tip: set up Direct Debit for each biller to never miss a payment.' +
      '</div>';

    return RW.ui.screen({ title: 'Bills', body });
  }

  // ---- Register activity feed provider ----
  RW.registerActivity(function () {
    RW.S.bills = RW.S.bills || {};
    var items = [];
    Object.keys(RW.S.bills).forEach(function (id) {
      var entry = RW.S.bills[id];
      if (!entry || !entry.paidAt) return;
      var biller = BILLERS.filter(function (b) { return b.id === id; })[0];
      var name = biller ? biller.name : id;
      items.push({
        t: entry.paidAt,
        html: '<div class="card row">' +
          '<div class="lead">🧾</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(name) + ' bill paid</div>' +
            '<div class="sub">' + esc(money(entry.amount)) + ' · ' + esc(fmtTime(entry.paidAt)) + '</div>' +
          '</div>' +
          '<div class="trail"><span class="pill-status ok">Paid</span></div>' +
        '</div>',
      });
      if (entry.directDebit && entry.directDebitSetAt) {
        items.push({
          t: entry.directDebitSetAt,
          html: '<div class="card row">' +
            '<div class="lead">🔄</div>' +
            '<div class="body">' +
              '<div class="name">' + esc(name) + ' — Direct Debit set up</div>' +
              '<div class="sub">' + esc(fmtTime(entry.directDebitSetAt)) + '</div>' +
            '</div>' +
            '<div class="trail"><span class="pill-status ok">Active</span></div>' +
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
        var id = el.dataset.id;
        var name = el.dataset.name;
        var amount = parseFloat(el.dataset.amount);
        if (!id || isNaN(amount) || amount <= 0) {
          RW.toast('Invalid bill data.');
          return;
        }
        if (isPaid(id)) {
          RW.toast(name + ' is already marked as paid.');
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
        RW.toast(name + ' bill paid — ' + money(amount) + ' debited.');
        RW.render();
      },

      billsDirectDebitOn: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id = el.dataset.id;
        var name = el.dataset.name;
        if (!id) return;
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          directDebit: true,
          directDebitSetAt: Date.now(),
        });
        RW.store.save();
        RW.toast('Direct Debit set up for ' + name + '. Mandate registered.');
        RW.render();
      },

      billsDirectDebitOff: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id = el.dataset.id;
        var name = el.dataset.name;
        if (!id) return;
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          directDebit: false,
          directDebitSetAt: null,
        });
        RW.store.save();
        RW.toast('Direct Debit cancelled for ' + name + '.');
        RW.render();
      },

      billsToggleOptional: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id = el.dataset.id;
        var name = el.dataset.name;
        if (!id) return;
        var current = isHidden(id);
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          hidden: !current,
        });
        RW.store.save();
        RW.toast((current ? 'Showing ' : 'Hiding ') + name + '.');
        RW.render();
      },

      billsView: function (el) {
        var id = el.dataset.id;
        var biller = BILLERS.filter(function (b) { return b.id === id; })[0];
        if (!biller) return;
        RW.toast(biller.name + ': ' + money(biller.amount) + ' due. ' + biller.contact);
      },
    },
  });
})(window.RW);
