/* Rockway feature — Top-up (mobile credit, data bundles, eSIM for Gibraltar PAYG). */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref, fmtTime } = RW.util;

  // ---- Gibraltar telecoms providers ----
  const PROVIDERS = ['Gibtelecom', 'u-mee'];

  const CREDIT_AMOUNTS = [
    { label: '£10', value: 10 },
    { label: '£25', value: 25 },
  ];

  const BUNDLES = [
    { id: 'b5',  label: '5 GB',       price: 8,  desc: '30-day data bundle' },
    { id: 'b20', label: '20 GB',      price: 18, desc: '30-day data bundle' },
    { id: 'bun', label: 'Unlimited',  price: 30, desc: '30-day unlimited data' },
  ];

  // ---- helpers ----
  function topups() { return RW.S.topups = RW.S.topups || []; }

  function kindLabel(item) {
    if (item.kind === 'esim')   return 'eSIM';
    if (item.kind === 'bundle') return item.bundleLabel + ' bundle';
    return 'Credit top-up';
  }

  function kindEmoji(kind) {
    if (kind === 'esim')   return '🪪';
    if (kind === 'bundle') return '📶';
    return '📱';
  }

  // ---- generate a plausible fake eSIM activation code ----
  function genEsimCode() {
    var hex = () => Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
    return 'LPA:1$esim.gibtele.com$' + hex() + '-' + hex() + '-' + hex() + '-' + hex();
  }

  // ---- render ----
  function render() {
    var list = topups();

    // Provider selector
    var providerOpts = PROVIDERS.map(function (p) {
      var on = (RW.S._topupProvider === p) ? ' class="on"' : '';
      return '<button' + on + ' data-act="topupSelect" data-provider="' + esc(p) + '">' + esc(p) + '</button>';
    }).join('');
    var activeProv = RW.S._topupProvider || PROVIDERS[0];

    // Credit amount buttons
    var amtBtns = CREDIT_AMOUNTS.map(function (a) {
      var on = (RW.S._topupAmt === a.value) ? ' class="on"' : '';
      return '<button' + on + ' data-act="topupSelect" data-amt="' + a.value + '">' + esc(a.label) + ' scratchcard</button>';
    }).join('');
    var customAmt = (RW.S._topupCustom != null) ? RW.S._topupCustom : '';

    // Bundle rows
    var bundleRows = BUNDLES.map(function (b) {
      return '<div class="row">' +
        '<div class="lead" style="background:#e8f4e8">📶</div>' +
        '<div class="body"><div class="name">' + esc(b.label) + ' — ' + money(b.price) + '</div>' +
        '<div class="sub">' + esc(b.desc) + ' · ' + esc(activeProv) + '</div></div>' +
        '<button class="btn sm sea" data-act="topupBundle" data-bundle-id="' + esc(b.id) + '" data-provider="' + esc(activeProv) + '" data-price="' + b.price + '" data-label="' + esc(b.label) + '">Buy</button>' +
        '</div>';
    }).join('');

    // Recent top-ups
    var recent = list.slice().reverse().slice(0, 10).map(function (item) {
      var emoji = kindEmoji(item.kind);
      var name = kindLabel(item);
      var sub = esc(item.provider);
      if (item.number)      sub += ' · ' + esc(item.number);
      if (item.kind === 'bundle') sub += ' · ' + esc(item.bundleLabel);
      sub += ' · ' + fmtTime(item.t);
      var trail = item.kind === 'esim' ? '<span class="pill-status ok">Active</span>' : money(item.amount);
      return '<div class="row">' +
        '<div class="lead" style="background:#fff4d6">' + emoji + '</div>' +
        '<div class="body"><div class="name">' + esc(name) + '</div><div class="sub">' + sub + '</div></div>' +
        '<div class="trail">' + trail + '</div>' +
        (item.kind === 'esim' && item.esimCode
          ? '</div><div style="padding:6px 16px 10px;font-size:11px;color:var(--ink);word-break:break-all"><strong>Activation code:</strong> <code>' + esc(item.esimCode) + '</code>'
          : '') +
        '</div>';
    }).join('');

    var body =
      // -- Mobile Credit Top-up --
      RW.ui.sectionTitle('Mobile Credit Top-up') +
      '<div class="card">' +
        '<label class="fld" style="margin-top:0">Provider</label>' +
        '<div class="seg" id="tu-provider">' + providerOpts + '</div>' +
        '<label class="fld">+350 Mobile number</label>' +
        '<input class="input" id="tu-number" placeholder="+350 5XXXXXXX" value="' + esc(RW.S._topupNumber || '') + '">' +
        '<label class="fld">Amount</label>' +
        '<div class="seg" id="tu-amt">' + amtBtns + '</div>' +
        '<div style="margin-top:8px">' +
        '<input class="input" id="tu-custom" type="number" min="1" max="100" placeholder="Or enter custom amount (£)" value="' + esc(customAmt) + '">' +
        '</div>' +
        '<p class="sub" style="margin:6px 0 10px;font-size:12px">Real scratchcards: £10 &amp; £25 — redeem by dialling <strong>*101*</strong> + code</p>' +
        '<button class="btn" data-act="topupBuy">Top up</button>' +
      '</div>' +

      // -- Data Bundles --
      RW.ui.sectionTitle('Data Bundles') +
      '<div class="card">' + bundleRows + '</div>' +

      // -- eSIM --
      RW.ui.sectionTitle('eSIM') +
      '<div class="card">' +
        '<div class="row">' +
          '<div class="lead" style="background:#e8ecff">🪪</div>' +
          '<div class="body"><div class="name">Rockway / Gibtelecom eSIM</div>' +
          '<div class="sub">First eSIM free with a plan · instant activation</div></div>' +
          '<button class="btn sm dark" data-act="topupEsim" data-provider="Gibtelecom">Get eSIM</button>' +
        '</div>' +
      '</div>' +

      // -- Recent --
      (list.length
        ? RW.ui.sectionTitle('Recent top-ups') + '<div class="card">' + recent + '</div>'
        : '');

    return RW.ui.screen({ title: 'Top-up', body });
  }

  // ---- actions ----
  RW.register({
    id: 'topup',
    title: 'Top-up',
    emoji: '📱',
    tileBg: '#fff4d6',
    section: 'money',
    order: 40,
    render,
    actions: {

      // Select provider or credit amount
      topupSelect: function (el) {
        if (el.dataset.provider) {
          RW.S._topupProvider = el.dataset.provider;
        }
        if (el.dataset.amt) {
          RW.S._topupAmt = parseFloat(el.dataset.amt);
          RW.S._topupCustom = '';
        }
        RW.render();
      },

      // Buy mobile credit top-up
      topupBuy: function () {
        var numberEl  = document.getElementById('tu-number');
        var customEl  = document.getElementById('tu-custom');
        var amtSeg    = document.getElementById('tu-amt');
        var provSeg   = document.getElementById('tu-provider');

        var number   = (numberEl  ? numberEl.value  : '').trim();
        var customV  = (customEl  ? customEl.value   : '').trim();
        var provBtn  = provSeg  ? provSeg.querySelector('button.on')  : null;
        var amtBtn   = amtSeg   ? amtSeg.querySelector('button.on')   : null;

        var provider = provBtn ? provBtn.dataset.provider : (RW.S._topupProvider || PROVIDERS[0]);
        var amount   = 0;

        if (customV && parseFloat(customV) > 0) {
          amount = parseFloat(customV);
        } else if (amtBtn) {
          amount = parseFloat(amtBtn.dataset.amt);
        } else if (RW.S._topupAmt) {
          amount = RW.S._topupAmt;
        }

        if (!number) { RW.toast('Enter a +350 mobile number'); return; }
        if (!amount || amount <= 0 || isNaN(amount)) { RW.toast('Choose or enter a top-up amount'); return; }

        var label = esc(provider) + ' top-up ' + esc(number);
        if (!RW.store.debit(amount, provider + ' top-up ' + number)) {
          RW.toast('Insufficient wallet balance — please top up your wallet first');
          return;
        }

        var item = {
          id: uid(),
          t: Date.now(),
          kind: 'credit',
          provider: provider,
          number: number,
          amount: amount,
        };
        topups().push(item);
        RW.store.save();

        // Persist UI selections for next time
        RW.S._topupProvider = provider;
        RW.S._topupNumber   = number;
        RW.S._topupAmt      = null;
        RW.S._topupCustom   = '';

        RW.toast('Credit applied — dial *101* to check balance');
        RW.render();
      },

      // Buy data bundle
      topupBundle: function (el) {
        var provider    = el.dataset.provider || (RW.S._topupProvider || PROVIDERS[0]);
        var price       = parseFloat(el.dataset.price);
        var bundleId    = el.dataset.bundleId;
        var bundleLabel = el.dataset.label;

        if (isNaN(price) || price <= 0) { RW.toast('Invalid bundle price'); return; }

        if (!RW.store.debit(price, provider + ' ' + bundleLabel + ' data bundle')) {
          RW.toast('Insufficient wallet balance — please top up your wallet first');
          return;
        }

        var item = {
          id: uid(),
          t: Date.now(),
          kind: 'bundle',
          provider: provider,
          bundleId: bundleId,
          bundleLabel: bundleLabel,
          amount: price,
        };
        topups().push(item);
        RW.store.save();

        RW.toast(bundleLabel + ' data bundle activated on ' + provider);
        RW.render();
      },

      // Buy eSIM
      topupEsim: function (el) {
        var provider = el.dataset.provider || 'Gibtelecom';
        var esimCode = genEsimCode();

        // First eSIM is free — check if user already has one
        var existingEsims = topups().filter(function (i) { return i.kind === 'esim'; });
        var isFree = existingEsims.length === 0;
        var price = isFree ? 0 : 5;
        var label = provider + ' eSIM' + (isFree ? ' (first eSIM free)' : '');

        if (!isFree) {
          if (!RW.store.debit(price, label)) {
            RW.toast('Insufficient wallet balance — please top up your wallet first');
            return;
          }
        }

        var item = {
          id: uid(),
          t: Date.now(),
          kind: 'esim',
          provider: provider,
          amount: price,
          esimCode: esimCode,
          free: isFree,
        };
        topups().push(item);
        RW.store.save();

        RW.toast(isFree ? 'eSIM provisioned free — scan or copy activation code below' : 'eSIM provisioned — activation code below');
        RW.render();
      },

    },
  });

  // ---- surface to Activity ----
  RW.registerActivity(function () {
    return (RW.S.topups || []).map(function (item) {
      var emoji = kindEmoji(item.kind);
      var name  = kindLabel(item);
      var sub   = esc(item.provider);
      if (item.number)      sub += ' · ' + esc(item.number);
      if (item.kind === 'bundle') sub += ' · ' + esc(item.bundleLabel);
      sub += ' · ' + fmtTime(item.t);
      var trail = (item.kind === 'esim' && item.free) ? '<span class="pill-status ok">Free</span>' : money(item.amount);
      return {
        t: item.t,
        html: '<div class="card row">' +
          '<div class="lead" style="background:#fff4d6">' + emoji + '</div>' +
          '<div class="body"><div class="name">' + esc(name) + '</div>' +
          '<div class="sub">' + sub + '</div></div>' +
          '<div class="trail">' + trail + '</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
