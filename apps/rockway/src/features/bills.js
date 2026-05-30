/* Rockway feature — Bills (Gibraltar utility, telecom & government bills). */
(function (RW) {
  'use strict';
  const { esc, money, fmtTime } = RW.util;

  // Guard: ensure bills map exists (store.js already seeds it, but guard for safety)
  RW.S.bills = RW.S.bills || {};

  // ---- Authentic Gibraltar billers ----
  // AquaGib: potable water (metered, monthly) + GEA electricity (billed by AquaGib on GEA's behalf).
  // Gibraltar Rates: covers salt-water mains (not metered — flat rate), refuse collection, street services.
  // Gibtelecom / GibFibre: broadband (GibFibre) + landline bundle (Dual Play or Triple Play).
  // u-mee: alternative broadband/TV/mobile provider (main competitor to Gibtelecom).
  // Gov Housing Rent: government housing rent via gov.gi pay-rent eService (optional).
  const BILLERS = [
    {
      id: 'aquagib',
      name: 'AquaGib',
      sub: 'Water + Electricity (GEA, billed via AquaGib)',
      emoji: '💧',
      amount: 68.40,
      dueDay: 15,          // day-of-month the bill is due
      breakdown: [
        { label: 'Potable water (metered, monthly)', amount: 22.40 },
        { label: 'Electricity — GEA / GibElec charge', amount: 46.00 },
      ],
      note: 'GEA (Gibraltar Electricity Authority) does not bill directly — the electricity charge appears as a line item inside your AquaGib bill. Pay at AquaGib offices, Suite 10b, Leanse Place, 50 Town Range, or by Direct Debit / online.',
      contact: '+350 20075957  ·  aquagib.gi',
      optional: false,
    },
    {
      id: 'rates',
      name: 'Gibraltar Rates',
      sub: 'Incl. salt-water mains, refuse & street services',
      emoji: '🏛️',
      amount: 45.00,
      dueDay: 1,
      breakdown: [
        { label: 'Residential rates', amount: 30.00 },
        { label: 'Salt-water mains (flat rate, not metered)', amount: 10.00 },
        { label: 'Refuse & street services', amount: 5.00 },
      ],
      note: 'Salt water (used for toilet flushing, firefighting, street cleaning) is supplied via a separate mains network and charged at a flat rate inside Rates — it is never metered. Pay at HM Government of Gibraltar Finance Centre.',
      contact: 'HM Government of Gibraltar — Finance Centre',
      optional: false,
    },
    {
      id: 'gibtelecom',
      name: 'Gibtelecom / GibFibre',
      sub: 'Broadband (GibFibre) + landline — Dual Play bundle',
      emoji: '📡',
      amount: 39.99,
      dueDay: 7,
      breakdown: [
        { label: 'GibFibre broadband', amount: 29.99 },
        { label: 'Landline (Dual Play)', amount: 10.00 },
      ],
      note: 'Gibtelecom is the government-owned incumbent. GibFibre is their fibre-broadband brand. Triple Play (+ TV) also available. gibtele.com',
      contact: '+350 20052200  ·  gibtele.com',
      optional: false,
    },
    {
      id: 'umee',
      name: 'u-mee',
      sub: 'Alternative broadband / TV / mobile',
      emoji: '📶',
      amount: 34.99,
      dueDay: 7,
      breakdown: [
        { label: 'Broadband', amount: 24.99 },
        { label: 'TV / mobile add-on', amount: 10.00 },
      ],
      note: 'u-mee is the main competitor to Gibtelecom — broadband, TV and mobile plans. Most households use one of Gibtelecom or u-mee, not both. u-mee.com',
      contact: 'u-mee.com',
      optional: true,
    },
    {
      id: 'gov-rent',
      name: 'Government Housing Rent',
      sub: 'HM Gov Gibraltar — pay-rent eService (gov.gi)',
      emoji: '🏠',
      amount: 120.00,
      dueDay: 1,
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
    return !!(s && s.paidAt);
  }

  function hasDirectDebit(id) {
    var s = billerState(id);
    return !!(s && s.directDebit);
  }

  function isHidden(id) {
    var s = billerState(id);
    return !!(s && s.hidden);
  }

  // Format a timestamp as a short date string e.g. "29 May"
  function shortDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  // Next due date for a biller (dueDay of current or next month)
  function nextDueDate(dueDay) {
    var now = new Date();
    var d   = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (d <= now) {
      // already past this month's due date — next month
      d = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  // ---- biller card ----
  function billerCard(b) {
    var paid  = isPaid(b.id);
    var dd    = hasDirectDebit(b.id);
    var state = billerState(b.id);

    // ---- Breakdown lines (nested, with left accent) ----
    var breakdownHtml = b.breakdown.map(function (item) {
      return (
        '<div class="kv" style="font-size:13px;color:var(--ash)">' +
          '<span>' + esc(item.label) + '</span>' +
          '<span class="num">' + esc(money(item.amount)) + '</span>' +
        '</div>'
      );
    }).join('');

    // ---- Status pill ----
    var statusPill;
    if (paid) {
      statusPill = '<span class="pill-status ok">✓ Paid ' + esc(shortDate(state.paidAt)) + '</span>';
    } else if (dd) {
      statusPill = '<span class="pill-status info">↻ Direct Debit</span>';
    } else {
      statusPill = '<span class="pill-status warn">Due ' + esc(nextDueDate(b.dueDay)) + '</span>';
    }

    // ---- Pay button ----
    var payBtn;
    if (paid) {
      payBtn = '<button class="btn sm ghost" disabled style="opacity:0.4;cursor:not-allowed;pointer-events:none">✓ Paid</button>';
    } else {
      payBtn = (
        '<button class="btn sm sea" data-act="billsPay"' +
          ' data-id="' + esc(b.id) + '"' +
          ' data-amount="' + b.amount + '"' +
          ' data-name="' + esc(b.name) + '">' +
          'Pay <span class="num">' + esc(money(b.amount)) + '</span>' +
        '</button>'
      );
    }

    // ---- Direct Debit toggle ----
    var ddBtn;
    if (dd) {
      ddBtn = (
        '<button class="btn sm ghost" data-act="billsDirectDebitOff"' +
          ' data-id="' + esc(b.id) + '"' +
          ' data-name="' + esc(b.name) + '"' +
          ' style="color:var(--sea);border-color:var(--sea)">' +
          '↻ DD on' +
        '</button>'
      );
    } else {
      ddBtn = (
        '<button class="btn sm ghost" data-act="billsDirectDebitOn"' +
          ' data-id="' + esc(b.id) + '"' +
          ' data-name="' + esc(b.name) + '">' +
          'Set up DD' +
        '</button>'
      );
    }

    // ---- Optional hide button ----
    var optionalBtn = b.optional
      ? (
          '<button class="btn sm ghost" data-act="billsToggleOptional"' +
            ' data-id="' + esc(b.id) + '"' +
            ' data-name="' + esc(b.name) + '"' +
            ' style="font-size:11px;color:var(--ash)">' +
            'Hide' +
          '</button>'
        )
      : '';

    // ---- View details button ----
    var viewBtn = (
      '<button class="btn sm ghost" data-act="billsView"' +
        ' data-id="' + esc(b.id) + '"' +
        ' style="color:var(--ash)">' +
        'Details' +
      '</button>'
    );

    // ---- Card chrome: paid cards are visually quieter ----
    var cardBorderStyle = paid
      ? 'border-left:3px solid var(--green);'
      : 'border-left:3px solid transparent;';
    var cardOpacity = paid ? 'opacity:0.78;' : '';
    var cardStyle = 'style="margin-bottom:12px;' + cardBorderStyle + cardOpacity + '"';

    return (
      '<div class="card" ' + cardStyle + '>' +

        // ---- Header row: emoji logo, name/sub, status pill ----
        '<div style="display:flex;align-items:center;gap:12px;padding-bottom:10px">' +
          '<div style="width:46px;height:46px;border-radius:14px;background:var(--cloud);display:grid;place-items:center;font-size:24px;flex:0 0 auto">' +
            b.emoji +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:14.5px">' + esc(b.name) + '</div>' +
            '<div style="font-size:12px;color:var(--ash);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(b.sub) + '</div>' +
          '</div>' +
          '<div style="flex:0 0 auto">' + statusPill + '</div>' +
        '</div>' +

        // ---- Breakdown: left accent bar, nested items, total ----
        '<div style="border-left:3px solid var(--mist);margin-left:4px;padding-left:12px;border-top:1px solid var(--mist);padding-top:8px;margin-bottom:4px">' +
          breakdownHtml +
          '<div class="kv total"><span>Total</span><span class="num">' + esc(money(b.amount)) + '</span></div>' +
        '</div>' +

        // ---- Authentic note ----
        '<div style="padding:6px 0 4px">' +
          '<div style="font-size:11px;color:var(--ash);line-height:1.45">' + esc(b.note) + '</div>' +
          '<div style="font-size:11px;color:var(--fog);margin-top:3px">📞 ' + esc(b.contact) + '</div>' +
        '</div>' +

        // ---- Action bar ----
        '<div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--mist);padding-top:10px;margin-top:4px">' +
          payBtn + ddBtn + viewBtn + optionalBtn +
        '</div>' +

      '</div>'
    );
  }

  // ---- Hidden optional biller row ----
  function hiddenRow(b) {
    return RW.ui.row({
      lead: b.emoji,
      leadBg: 'var(--cloud)',
      name: b.name,
      sub: 'Optional — hidden',
      trail: (
        '<button class="btn sm ghost" data-act="billsToggleOptional"' +
          ' data-id="' + esc(b.id) + '"' +
          ' data-name="' + esc(b.name) + '"' +
          ' style="font-size:11px">Show</button>'
      ),
    });
  }

  // ---- render ----
  function render() {
    RW.S.bills = RW.S.bills || {};

    var visibleBillers = BILLERS.filter(function (b) { return !b.optional || !isHidden(b.id); });
    var hiddenBillers  = BILLERS.filter(function (b) { return b.optional && isHidden(b.id); });
    var paidCount      = visibleBillers.filter(function (b) { return isPaid(b.id); }).length;
    var unpaidBillers  = visibleBillers.filter(function (b) { return !isPaid(b.id); });
    var totalDue       = unpaidBillers.reduce(function (acc, b) { return acc + b.amount; }, 0);
    var totalAll       = visibleBillers.reduce(function (acc, b) { return acc + b.amount; }, 0);
    var allPaid        = unpaidBillers.length === 0 && visibleBillers.length > 0;
    var ddCount        = visibleBillers.filter(function (b) { return hasDirectDebit(b.id); }).length;

    // ---- Summary stats strip: three .stat tiles in a grid ----
    // For three stats we use a custom 3-col grid inline
    var statsHtml = (
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">' +

        '<div class="stat">' +
          '<div class="n num" style="color:' + (totalDue > 0 ? 'var(--brand)' : 'var(--green)') + ';font-size:20px">' +
            esc(money(totalDue)) +
          '</div>' +
          '<div class="l">Total due</div>' +
        '</div>' +

        '<div class="stat" style="text-align:center">' +
          '<div class="n" style="font-size:20px">' +
            paidCount +
            '<span style="font-size:13px;font-weight:600;color:var(--ash)"> / ' + visibleBillers.length + '</span>' +
          '</div>' +
          '<div class="l">Paid</div>' +
        '</div>' +

        '<div class="stat" style="text-align:right">' +
          '<div class="n" style="font-size:20px;color:' + (ddCount > 0 ? 'var(--sea)' : 'var(--ash)') + '">' +
            ddCount +
          '</div>' +
          '<div class="l">Direct Debits</div>' +
        '</div>' +

      '</div>'
    );

    // ---- Optional DD info banner ----
    var ddInfoHtml = ddCount > 0
      ? (
          '<div style="background:var(--sea-soft);color:var(--sea);border-radius:10px;padding:9px 13px;font-size:12px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:6px">' +
            '<span>↻</span>' +
            '<span>' + ddCount + ' Direct Debit' + (ddCount > 1 ? 's' : '') + ' active — collected automatically each month</span>' +
          '</div>'
        )
      : '';

    // ---- All-paid celebratory state ----
    var allPaidBanner = allPaid
      ? RW.ui.empty('✅', '¡Todo pagao! All bills settled for this cycle.')
      : '';

    // ---- Bill cards (always rendered; quieted when paid) ----
    var billCardsHtml = visibleBillers.map(billerCard).join('');

    // ---- Hidden billers section ----
    var hiddenSectionHtml = hiddenBillers.length
      ? (
          RW.ui.sectionTitle('Optional (hidden)') +
          '<div class="card" style="padding:0 12px">' +
            hiddenBillers.map(hiddenRow).join('') +
          '</div>'
        )
      : '';

    var body = (
      statsHtml +
      ddInfoHtml +
      (allPaid ? allPaidBanner : '') +
      RW.ui.sectionTitle('Your Bills') +
      billCardsHtml +
      hiddenSectionHtml +
      '<div style="text-align:center;font-size:11px;color:var(--fog);margin-top:20px;line-height:1.6">' +
        'Gibraltar pound (GIP) · pegged 1:1 to GBP<br>' +
        'All amounts debited from your Rockway Wallet' +
      '</div>'
    );

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
      var name   = biller ? biller.name : id;
      if (entry.paidAt) {
        items.push({
          t: entry.paidAt,
          html: (
            '<div class="card row">' +
              '<div class="lead">🧾</div>' +
              '<div class="body">' +
                '<div class="name">' + esc(name) + ' bill paid</div>' +
                '<div class="sub">' +
                  '<span class="num">' + esc(money(entry.amount || 0)) + '</span>' +
                  ' · ' + esc(fmtTime(entry.paidAt)) +
                '</div>' +
              '</div>' +
              '<div class="trail"><span class="pill-status ok">Paid</span></div>' +
            '</div>'
          ),
        });
      }
      if (entry.directDebit && entry.directDebitSetAt) {
        items.push({
          t: entry.directDebitSetAt,
          html: (
            '<div class="card row">' +
              '<div class="lead">↻</div>' +
              '<div class="body">' +
                '<div class="name">' + esc(name) + ' — Direct Debit active</div>' +
                '<div class="sub">' + esc(fmtTime(entry.directDebitSetAt)) + '</div>' +
              '</div>' +
              '<div class="trail"><span class="pill-status info">DD Active</span></div>' +
            '</div>'
          ),
        });
      }
    });
    return items;
  });

  // ---- Register ----
  RW.register({
    id: 'bills',
    title: 'Bills',
    emoji: '🧾',
    tileBg: '#fde7ea',
    section: 'money',
    order: 30,
    render: render,
    actions: {

      // Pay a bill — debits wallet, records paidAt + amount
      billsPay: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id     = el.dataset.id;
        var name   = el.dataset.name;
        var amount = parseFloat(el.dataset.amount);
        if (!id || !name || isNaN(amount) || amount <= 0) {
          RW.toast('Invalid bill data.');
          return;
        }
        if (isPaid(id)) {
          RW.toast(esc(name) + ' already paid this cycle.');
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
        RW.toast('✓ ' + name + ' — ' + money(amount) + ' paid & debited from wallet.');
        RW.render();
      },

      // Enable Direct Debit mandate for a biller
      billsDirectDebitOn: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id   = el.dataset.id;
        var name = el.dataset.name;
        if (!id || !name) return;
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          directDebit: true,
          directDebitSetAt: Date.now(),
        });
        RW.store.save();
        RW.toast('↻ Direct Debit set up for ' + name + '. Mandate registered — collected automatically.');
        RW.render();
      },

      // Cancel Direct Debit mandate for a biller
      billsDirectDebitOff: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id   = el.dataset.id;
        var name = el.dataset.name;
        if (!id || !name) return;
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          directDebit: false,
          directDebitSetAt: null,
        });
        RW.store.save();
        RW.toast('Direct Debit cancelled for ' + name + '. Pay manually each month.');
        RW.render();
      },

      // Toggle visibility of optional billers
      billsToggleOptional: function (el) {
        RW.S.bills = RW.S.bills || {};
        var id      = el.dataset.id;
        var name    = el.dataset.name;
        if (!id || !name) return;
        var current = isHidden(id);
        RW.S.bills[id] = Object.assign(RW.S.bills[id] || {}, {
          hidden: !current,
        });
        RW.store.save();
        RW.toast(current ? 'Showing ' + name + '.' : name + ' hidden — tap Show to restore.');
        RW.render();
      },

      // View biller details (contact, note) as a toast
      billsView: function (el) {
        var id     = el.dataset.id;
        var biller = BILLERS.filter(function (b) { return b.id === id; })[0];
        if (!biller) return;
        RW.toast(biller.name + ' · ' + money(biller.amount) + ' · ' + biller.contact);
      },

    },
  });
})(window.RW);
