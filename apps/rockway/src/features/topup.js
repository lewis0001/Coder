/* Rockway feature — Top-up (mobile credit, data bundles, eSIM for Gibraltar PAYG). */
(function (RW) {
  'use strict';
  const { esc, money, uid, fmtTime } = RW.util;

  // ---- Gibraltar telecoms providers ----
  const PROVIDERS = [
    {
      id: 'Gibtelecom',
      label: 'Gibtelecom',
      sub: 'GibFibre · 5G · government-owned',
      emoji: '📡',
      accent: '#0057a8',
      bg: '#e8f0fb',
      badge: 'Dominant network',
    },
    {
      id: 'u-mee',
      label: 'u-mee',
      sub: 'Broadband · TV · mobile',
      emoji: '📶',
      accent: '#e05c00',
      bg: '#fdf0e8',
      badge: 'Challenger',
    },
  ];

  // Real Gibtelecom scratchcard denominations (£10 & £25)
  const CREDIT_AMOUNTS = [
    { label: '£10 scratchcard', value: '10' },
    { label: '£25 scratchcard', value: '25' },
  ];

  const BUNDLES = [
    {
      id: 'b5',
      label: '5 GB',
      price: 8,
      desc: '30-day data bundle',
      detail: 'Light browsing & messaging',
      emoji: '📱',
      per: '£1.60/GB',
    },
    {
      id: 'b20',
      label: '20 GB',
      price: 18,
      desc: '30-day data bundle',
      detail: 'Streaming & social media',
      emoji: '🎬',
      per: '£0.90/GB',
    },
    {
      id: 'bun',
      label: 'Unlimited',
      price: 30,
      desc: '30-day unlimited data',
      detail: 'Full speed, no throttling',
      emoji: '♾️',
      per: 'Best value',
    },
  ];

  // ---- helpers ----
  function topups() { return (RW.S.topups = RW.S.topups || []); }

  function kindLabel(item) {
    if (item.kind === 'esim')   return 'eSIM';
    if (item.kind === 'bundle') return item.bundleLabel + ' bundle';
    return 'Credit top-up';
  }

  function kindEmoji(kind) {
    if (kind === 'esim')   return '📲';
    if (kind === 'bundle') return '📶';
    return '📱';
  }

  function kindPill(item) {
    if (item.kind === 'esim')   return item.free ? 'ok'   : 'info';
    if (item.kind === 'bundle') return 'info';
    return 'ok';
  }

  function kindPillLabel(item) {
    if (item.kind === 'esim')   return item.free ? 'Free eSIM' : 'eSIM';
    if (item.kind === 'bundle') return 'Bundle';
    return 'Credit';
  }

  function kindLeadBg(kind) {
    if (kind === 'esim')   return '#e8ecff';
    if (kind === 'bundle') return '#fff4d6';
    return '#e8f4e8';
  }

  // ---- generate a plausible fake eSIM activation code (LPA format) ----
  function genEsimCode() {
    function hex4() { return Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0'); }
    return 'LPA:1$esim.gibtele.com$' + hex4() + '-' + hex4() + '-' + hex4() + '-' + hex4();
  }

  // ---- provider segment cards ----
  function providerCards(activeProv) {
    return '<div class="grid2" style="margin-bottom:16px">' +
      PROVIDERS.map(function (p) {
        var isOn   = activeProv === p.id;
        var border = isOn ? '2px solid ' + p.accent : '2px solid transparent';
        var shadow = isOn ? '0 0 0 3px ' + p.accent + '33' : '';
        var checkChip = isOn
          ? '<span class="chip on" style="background:' + p.accent + ';color:#fff;font-size:10px;margin-top:8px;display:inline-block">✓ Selected</span>'
          : '<span class="chip" style="font-size:10px;margin-top:8px;display:inline-block;color:var(--ash)">' + esc(p.badge) + '</span>';
        return '<div class="card" style="cursor:pointer;padding:14px 12px;border:' + border + ';box-shadow:' + shadow + ';margin-bottom:0;text-align:center" data-act="topupSelect" data-provider="' + esc(p.id) + '">' +
          '<div style="font-size:30px;margin-bottom:6px">' + p.emoji + '</div>' +
          '<div style="font-weight:800;font-size:14px;color:var(--ink)">' + esc(p.label) + '</div>' +
          '<div style="font-size:11px;color:var(--ash);margin-top:2px;line-height:1.4">' + esc(p.sub) + '</div>' +
          checkChip +
          '</div>';
      }).join('') +
      '</div>';
  }

  // ---- render ----
  function render() {
    var list       = topups();
    var activeProv = RW.S._topupProvider || PROVIDERS[0].id;
    var activeAmt  = RW.S._topupAmt != null ? String(RW.S._topupAmt) : '';
    var customAmt  = RW.S._topupCustom != null ? String(RW.S._topupCustom) : '';

    // -- Hero --
    var heroHtml = RW.ui.hero({
      emoji: '📱',
      title: 'Mobile Top-up',
      sub: 'Gibtelecom & u-mee · PAYG scratchcards, data bundles & eSIM',
      accent: '#0057a8',
      chips: ['+350 PAYG', 'eSIM', 'Data Bundles', '*101# balance'],
    });

    // -- Provider selection --
    var provSection =
      RW.ui.sectionTitle('Choose Provider') +
      providerCards(activeProv);

    // -- Credit amount chips --
    var amtChips = RW.ui.chips(CREDIT_AMOUNTS, activeAmt, 'topupSelect', true);

    var creditCard =
      '<div class="card">' +
        '<label class="fld" style="margin-top:0">+350 Mobile number</label>' +
        '<input class="input" id="tu-number" placeholder="+350 5XXXXXXX" value="' + esc(RW.S._topupNumber || '') + '">' +
        '<label class="fld">Amount</label>' +
        amtChips +
        '<input class="input" id="tu-custom" type="number" min="1" max="100" placeholder="Or enter a custom amount (£)" value="' + esc(customAmt) + '" style="margin-top:4px">' +
        '<div style="background:var(--sea-soft);border-radius:10px;padding:10px 12px;margin:10px 0 14px;font-size:12px;color:var(--sea);line-height:1.6">' +
          '<strong>How to redeem:</strong> Dial <strong>*101*</strong> and enter your scratchcard code. ' +
          'Check remaining balance anytime by dialling <strong>*101#</strong>. ' +
          'Top up online with card or PayPal at gibtele.com.' +
        '</div>' +
        '<button class="btn" data-act="topupBuy">Top up now</button>' +
      '</div>';

    // -- Data bundle cards --
    var bundleCards =
      '<div class="grid2" style="margin-bottom:8px">' +
        BUNDLES.map(function (b) {
          return '<div class="card" style="padding:14px;margin-bottom:0">' +
            '<div style="font-size:28px;margin-bottom:6px">' + b.emoji + '</div>' +
            '<div style="font-weight:900;font-size:16px;letter-spacing:-.3px">' + esc(b.label) + '</div>' +
            '<div style="font-size:11px;color:var(--ash);margin-top:3px;line-height:1.4">' + esc(b.detail) + '</div>' +
            '<div class="kv" style="padding:6px 0;border-top:1px solid var(--mist);margin-top:8px;align-items:baseline">' +
              '<span style="font-size:10.5px;color:var(--ash)">' + esc(b.per) + '</span>' +
              '<span class="num" style="font-weight:900;font-size:16px">' + esc(money(b.price)) + '</span>' +
            '</div>' +
            '<div style="font-size:10.5px;color:var(--ash);margin-bottom:8px">' + esc(b.desc) + '</div>' +
            '<button class="btn sm sea" style="width:100%" data-act="topupBundle" data-bundle-id="' + esc(b.id) + '" data-provider="' + esc(activeProv) + '" data-price="' + b.price + '" data-label="' + esc(b.label) + '">Buy</button>' +
          '</div>';
        }).join('') +
      '</div>';

    // -- eSIM card --
    var existingEsims = list.filter(function (i) { return i.kind === 'esim'; });
    var isFreeEsim    = existingEsims.length === 0;
    var esimPrice     = isFreeEsim ? 0 : 5;

    var provObj = PROVIDERS.find(function (p) { return p.id === activeProv; }) || PROVIDERS[0];
    var esimCard =
      '<div class="card">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
          '<div class="lead" style="background:#e8ecff;flex-shrink:0;width:50px;height:50px;border-radius:14px;display:grid;place-items:center;font-size:24px">📲</div>' +
          '<div>' +
            '<div style="font-weight:800;font-size:15px">Rockway / ' + esc(provObj.label) + ' eSIM</div>' +
            '<div style="font-size:12px;color:var(--ash);margin-top:2px">Instant activation · ' + esc(activeProv) + ' network</div>' +
          '</div>' +
        '</div>' +
        '<div class="kv">' +
          '<span style="font-size:13px">Price</span>' +
          (isFreeEsim
            ? '<span class="num"><s style="opacity:.4;font-size:13px">£5.00</s> <strong style="color:var(--green);font-size:14px">Free</strong> <span style="font-size:11px;color:var(--ash)">— first eSIM</span></span>'
            : '<span class="num" style="font-size:14px;font-weight:800">' + esc(money(esimPrice)) + '</span>') +
        '</div>' +
        '<div class="kv" style="margin-bottom:4px">' +
          '<span style="font-size:13px">SIM-to-eSIM switch</span>' +
          '<span class="pill-status ok" style="font-size:11px;padding:3px 8px">Free</span>' +
        '</div>' +
        '<div class="kv" style="margin-bottom:12px">' +
          '<span style="font-size:13px">Compatible devices</span>' +
          '<span style="font-size:12px;color:var(--ash)">iPhone XS+ · Android eSIM</span>' +
        '</div>' +
        '<button class="btn dark" style="width:100%" data-act="topupEsim" data-provider="' + esc(activeProv) + '">Get eSIM →</button>' +
      '</div>';

    // -- Last eSIM activation code (show most recent) --
    var lastEsim = list.slice().reverse().find(function (i) { return i.kind === 'esim'; });
    var esimCodeBlock = '';
    if (lastEsim && lastEsim.esimCode) {
      esimCodeBlock =
        '<div class="card" style="background:var(--cloud);border:1.5px solid var(--sea-soft);margin-top:10px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
            '<span style="font-size:18px">📲</span>' +
            '<span style="font-weight:800;font-size:13px">eSIM Activation Code</span>' +
            '<span class="pill-status ok" style="font-size:10px;padding:2px 7px;margin-left:auto">Active</span>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--ash);margin-bottom:8px">' + esc(lastEsim.provider) + ' · provisioned ' + esc(fmtTime(lastEsim.t)) + '</div>' +
          '<code style="display:block;font-size:10.5px;word-break:break-all;background:#fff;padding:10px 12px;border-radius:10px;border:1px solid var(--mist);font-family:monospace;line-height:1.6">' + esc(lastEsim.esimCode) + '</code>' +
          '<p style="font-size:11px;color:var(--ash);margin:8px 0 0;line-height:1.5">Scan this LPA code in your device’s eSIM settings · <strong>Settings → Mobile Data → Add eSIM</strong></p>' +
        '</div>';
    }

    // -- Recent top-ups --
    var recentSection = '';
    if (list.length === 0) {
      recentSection =
        RW.ui.sectionTitle('Recent Top-ups') +
        RW.ui.empty('📵', 'No top-ups yet — buy credit or a data bundle above');
    } else {
      var rows = list.slice().reverse().slice(0, 10).map(function (item) {
        var emoji    = kindEmoji(item.kind);
        var name     = kindLabel(item);
        var pill     = '<span class="pill-status ' + kindPill(item) + '" style="font-size:11px;padding:3px 8px">' + esc(kindPillLabel(item)) + '</span>';
        var trailAmt = (item.kind === 'esim' && item.free)
          ? '<span class="pill-status ok" style="font-size:11px;padding:3px 8px">Free</span>'
          : '<span class="num" style="font-weight:800;font-size:14px">' + esc(money(item.amount)) + '</span>';
        var trailHtml = '<div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">' + pill + trailAmt + '</div>';

        var subParts = [esc(item.provider)];
        if (item.number) subParts.push(esc(item.number));
        if (item.kind === 'bundle') subParts.push(esc(item.bundleLabel));
        subParts.push(esc(fmtTime(item.t)));

        return RW.ui.row({
          lead:   emoji,
          leadBg: kindLeadBg(item.kind),
          name:   name,
          sub:    subParts.join(' · '),
          trail:  trailHtml,
        });
      }).join('');
      recentSection =
        RW.ui.sectionTitle('Recent Top-ups') +
        '<div class="card" style="padding:0 14px">' + rows + '</div>';
    }

    var body =
      provSection +
      RW.ui.sectionTitle('Mobile Credit') +
      creditCard +
      RW.ui.sectionTitle('Data Bundles') +
      bundleCards +
      RW.ui.sectionTitle('eSIM') +
      esimCard +
      (esimCodeBlock ? esimCodeBlock : '') +
      recentSection;

    return RW.ui.screen({ title: 'Top-up', hero: heroHtml, body: body });
  }

  // ---- actions ----
  RW.register({
    id: 'topup',
    title: 'Top-up',
    emoji: '📱',
    tileBg: '#fff4d6',
    section: 'money',
    order: 40,
    render: render,
    actions: {

      // Select provider or credit amount (chips use data-v; provider cards use data-provider)
      topupSelect: function (el) {
        if (el.dataset.provider) {
          RW.S._topupProvider = el.dataset.provider;
        }
        if (el.dataset.v) {
          var parsed = parseFloat(el.dataset.v);
          if (!isNaN(parsed) && parsed > 0) {
            RW.S._topupAmt    = parsed;
            RW.S._topupCustom = '';
          }
        }
        RW.store.save();
        RW.render();
      },

      // Buy mobile credit top-up
      topupBuy: function () {
        var numberEl = document.getElementById('tu-number');
        var customEl = document.getElementById('tu-custom');

        var number  = numberEl ? numberEl.value.trim() : '';
        var customV = customEl ? customEl.value.trim()  : '';

        var provider = RW.S._topupProvider || PROVIDERS[0].id;
        var amount   = 0;

        if (customV && parseFloat(customV) > 0) {
          amount = parseFloat(customV);
        } else if (RW.S._topupAmt && RW.S._topupAmt > 0) {
          amount = RW.S._topupAmt;
        }

        if (!number) { RW.toast('Enter a +350 mobile number'); return; }
        if (!amount || amount <= 0 || isNaN(amount)) { RW.toast('Choose or enter a top-up amount'); return; }

        if (!RW.store.debit(amount, provider + ' top-up ' + number)) {
          RW.toast('Insufficient wallet balance — please add funds first');
          return;
        }

        var item = {
          id:       uid(),
          t:        Date.now(),
          kind:     'credit',
          provider: provider,
          number:   number,
          amount:   amount,
        };
        topups().push(item);
        RW.store.save();

        RW.S._topupProvider = provider;
        RW.S._topupNumber   = number;
        RW.S._topupAmt      = null;
        RW.S._topupCustom   = '';

        RW.toast('Credit applied — dial *101# to check balance');
        RW.render();
      },

      // Buy data bundle
      topupBundle: function (el) {
        var provider    = el.dataset.provider || RW.S._topupProvider || PROVIDERS[0].id;
        var price       = parseFloat(el.dataset.price);
        var bundleId    = el.dataset.bundleId;
        var bundleLabel = el.dataset.label;

        if (isNaN(price) || price <= 0) { RW.toast('Invalid bundle price'); return; }

        if (!RW.store.debit(price, provider + ' ' + bundleLabel + ' data bundle')) {
          RW.toast('Insufficient wallet balance — please add funds first');
          return;
        }

        var item = {
          id:          uid(),
          t:           Date.now(),
          kind:        'bundle',
          provider:    provider,
          bundleId:    bundleId,
          bundleLabel: bundleLabel,
          amount:      price,
        };
        topups().push(item);
        RW.store.save();

        RW.toast(bundleLabel + ' data bundle activated on ' + provider);
        RW.render();
      },

      // Get eSIM
      topupEsim: function (el) {
        var provider      = el.dataset.provider || 'Gibtelecom';
        var esimCode      = genEsimCode();
        var existingEsims = topups().filter(function (i) { return i.kind === 'esim'; });
        var isFree        = existingEsims.length === 0;
        var price         = isFree ? 0 : 5;
        var label         = provider + ' eSIM' + (isFree ? ' (first eSIM free)' : '');

        if (!isFree) {
          if (!RW.store.debit(price, label)) {
            RW.toast('Insufficient wallet balance — please add funds first');
            return;
          }
        }

        var item = {
          id:       uid(),
          t:        Date.now(),
          kind:     'esim',
          provider: provider,
          amount:   price,
          esimCode: esimCode,
          free:     isFree,
        };
        topups().push(item);
        RW.store.save();

        RW.toast(isFree ? 'eSIM provisioned free — activation code shown below' : 'eSIM provisioned — activation code shown below');
        RW.render();
      },

    },
  });

  // ---- surface to Activity ----
  RW.registerActivity(function () {
    return (RW.S.topups || []).map(function (item) {
      var emoji = kindEmoji(item.kind);
      var name  = kindLabel(item);
      var subParts = [esc(item.provider)];
      if (item.number) subParts.push(esc(item.number));
      if (item.kind === 'bundle') subParts.push(esc(item.bundleLabel));
      subParts.push(esc(fmtTime(item.t)));
      var sub = subParts.join(' · ');
      var trail = (item.kind === 'esim' && item.free)
        ? '<span class="pill-status ok">Free</span>'
        : '<span class="num">' + esc(money(item.amount)) + '</span>';
      return {
        t:    item.t,
        html: '<div class="card row">' +
          '<div class="lead" style="background:' + kindLeadBg(item.kind) + '">' + emoji + '</div>' +
          '<div class="body"><div class="name">' + esc(name) + '</div>' +
          '<div class="sub">' + sub + '</div></div>' +
          '<div class="trail">' + trail + '</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
