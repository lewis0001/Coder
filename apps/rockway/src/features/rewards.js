/* Rockway feature — Rewards (Rockway Keys loyalty programme). */
(function (RW) {
  'use strict';
  const { esc, money, uid, fmtTime } = RW.util;

  // ---- tier definitions (themed on Gibraltar's gold Key to the Mediterranean) ----
  const TIERS = [
    { name: 'Bronze Key',  min: 0,    max: 250,  color: '#cd7f32', bg: '#fdf4ec', next: 'Silver Key' },
    { name: 'Silver Key',  min: 250,  max: 750,  color: '#a8a9ad', bg: '#f4f4f5', next: 'Gold Key'   },
    { name: 'Gold Key',    min: 750,  max: 1500, color: '#cfb53b', bg: '#fdf8e3', next: 'Rock Elite'  },
    { name: 'Rock Elite',  min: 1500, max: Infinity, color: '#8b0000', bg: '#fde7ea', next: null      },
  ];

  // ---- reward catalogue ----
  const CATALOGUE = [
    { id: 'r_free_delivery', name: 'Free Delivery Voucher',          cost: 150, value: 0,    kind: 'voucher', emoji: '\u{1F69A}' },
    { id: 'r_wallet_2',      name: '£2 Wallet Credit',          cost: 200, value: 2,    kind: 'cash',    emoji: '\u{1F4B3}' },
    { id: 'r_dolphin',       name: 'Dolphin Safari Discount',        cost: 350, value: 0,    kind: 'voucher', emoji: '\u{1F42C}' },
    { id: 'r_wallet_5',      name: '£5 Wallet Credit',          cost: 450, value: 5,    kind: 'cash',    emoji: '\u{1F4B3}' },
    { id: 'r_cable_car',     name: 'Cable Car Priority Pass (2027)', cost: 500, value: 0,    kind: 'voucher', emoji: '\u{1F6A1}' },
  ];

  // ---- earn explainer rows ----
  var EARN_ROWS = [
    { emoji: '\u{1F6D2}', bg: '#e7f3ec', name: 'Shop & Eat',       sub: '1 Key per £1 spent at any Rockway partner' },
    { emoji: '\u{1F68C}', bg: '#e7ecf3', name: 'Move',             sub: 'Keys on bus, taxi & bike rides' },
    { emoji: '\u{1F4E6}', bg: '#f3ece7', name: 'Send & Deliver',   sub: 'Earn Keys on every parcel or delivery' },
    { emoji: '\u{1F4F2}', bg: '#f0ecf8', name: 'Pay Bills',        sub: 'Keys when you pay utilities via Rockway' },
  ];

  function getTier(pts) {
    var i;
    for (i = TIERS.length - 1; i >= 0; i--) {
      if (pts >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[0];
  }

  // ---- hero: striking gold-accent card with progress bar ----
  function renderHero(pts) {
    var tier = getTier(pts);
    var isTop = tier.next === null;
    var ptsToNext = isTop ? 0 : (tier.max - pts);
    var progressPct = isTop
      ? 100
      : Math.min(100, Math.max(0, Math.round((pts - tier.min) / (tier.max - tier.min) * 100)));

    // Use RW.ui.hero for the outer shell; inject custom progress + tier detail via sub + chips
    var tierChip = esc(tier.name);
    var nextLabel = isTop
      ? 'Top tier — Key to the Mediterranean!'
      : (ptsToNext + ' Keys to ' + esc(tier.next));

    // Inner progress bar HTML (injected below the hero via a card)
    var progressBar =
      '<div style="background:rgba(255,255,255,0.25);border-radius:8px;height:10px;margin:14px 0 6px;overflow:hidden">' +
        '<div style="background:#fff;width:' + progressPct + '%;height:10px;border-radius:8px;transition:width .5s ease"></div>' +
      '</div>';

    var ptsDisplay =
      '<div style="font-size:3rem;font-weight:900;letter-spacing:-1.5px;line-height:1;margin:8px 0 2px" class="num">' +
        esc(String(pts)) + ' <span style="font-size:1.6rem">🔑</span>' +
      '</div>';

    var tierBadge =
      '<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.22);' +
      'padding:5px 12px;border-radius:999px;font-size:12.5px;font-weight:800;margin-bottom:4px">' +
        '<span style="color:' + esc(tier.color) + ';font-size:15px">⬤</span> ' + tierChip +
      '</div>';

    var nextHint =
      '<div style="font-size:12px;opacity:.85;margin-top:4px">' + nextLabel + '</div>';

    // gold accent gradient for the hero block
    var accentA = '#b8860b';
    var accentB = '#7b5000';

    return (
      '<div class="hero" style="background:linear-gradient(135deg,' + accentA + ' 0%,' + accentB + ' 100%);border-radius:0 0 26px 26px;margin-bottom:4px">' +
        '<div style="font-size:13px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.6px">Your Rockway Keys</div>' +
        ptsDisplay +
        tierBadge +
        progressBar +
        nextHint +
      '</div>'
    );
  }

  // ---- catalogue: clean cards with cost + value, disabled state ----
  function renderCatalogue(pts) {
    var items = CATALOGUE.map(function (item) {
      var canAfford = pts >= item.cost;
      var valueLabel = item.kind === 'cash' && item.value > 0
        ? '<span style="font-size:11.5px;font-weight:700;color:var(--green)">+ ' + esc(money(item.value)) + ' to wallet</span>'
        : '';
      var disabledAttr = canAfford ? '' : ' disabled';
      var btnClass = canAfford ? 'btn gold sm' : 'btn ghost sm';

      return (
        '<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px;opacity:' + (canAfford ? '1' : '.65') + '">' +
          '<div style="width:46px;height:46px;border-radius:14px;background:' + (canAfford ? '#fff8e1' : 'var(--cloud)') +
            ';display:grid;place-items:center;font-size:22px;flex:0 0 auto">' +
            item.emoji +
          '</div>' +
          '<div style="flex:1 1 auto;min-width:0">' +
            '<div style="font-weight:700;font-size:14.5px">' + esc(item.name) + '</div>' +
            '<div style="font-size:12.5px;color:var(--ash);margin-top:2px">' +
              '<span class="num" style="font-weight:700;color:var(--amber)">' + esc(String(item.cost)) + '</span> Keys' +
              (valueLabel ? ' · ' + valueLabel : '') +
            '</div>' +
          '</div>' +
          '<button class="' + btnClass + '"' + disabledAttr +
            ' data-act="rewardsRedeem" data-rid="' + esc(item.id) + '">' +
            (canAfford ? 'Redeem' : '<span class="num">' + esc(String(item.cost)) + '</span> needed') +
          '</button>' +
        '</div>'
      );
    }).join('');

    return '<div style="display:flex;flex-direction:column;gap:8px">' + items + '</div>';
  }

  // ---- earn explainer ----
  function renderEarn() {
    var rows = EARN_ROWS.map(function (r) {
      return RW.ui.row({ lead: r.emoji, leadBg: r.bg, name: r.name, sub: r.sub });
    }).join('');
    return (
      '<div class="card">' +
        rows +
        '<div style="font-size:12px;color:var(--ash);margin-top:8px;padding-top:8px;border-top:1px solid var(--mist)">' +
          '🔑 Keys never expire. Keep spending on the Rock!' +
        '</div>' +
      '</div>'
    );
  }

  // ---- redemption history with pill-status + timestamps ----
  function renderHistory() {
    var redemptions = RW.S.redemptions || [];
    if (!redemptions.length) {
      return RW.ui.empty(
        '🔑',
        'No redemptions yet.\nEarn Keys by shopping, travelling, and paying with Rockway.'
      );
    }

    var rows = redemptions.slice().reverse().slice(0, 20).map(function (r) {
      var statusClass = r.kind === 'cash' ? 'ok' : 'info';
      var statusLabel = r.kind === 'cash' ? 'Wallet credit' : 'Voucher';
      var valueHint = r.kind === 'cash' && r.value > 0
        ? ' · ' + esc(money(r.value)) + ' credited'
        : '';
      return (
        '<div class="row">' +
          '<div class="lead" style="background:#fff8e1;font-size:20px">🎁</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(r.name) + '</div>' +
            '<div class="sub">' + esc(fmtTime(r.t)) + valueHint + '</div>' +
          '</div>' +
          '<div class="trail" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            '<span class="num" style="color:var(--amber);font-weight:800;font-size:13px">−' + esc(String(r.cost)) + ' 🔑</span>' +
            '<span class="pill-status ' + statusClass + '">' + statusLabel + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return '<div class="card">' + rows + '</div>';
  }

  function render() {
    RW.S.redemptions = RW.S.redemptions || [];
    var pts = typeof RW.S.points === 'number' ? RW.S.points : 0;

    var body =
      renderCatalogue(pts) +
      RW.ui.sectionTitle('How to Earn 🔑') +
      renderEarn() +
      RW.ui.sectionTitle('Redemption History') +
      renderHistory();

    return RW.ui.screen({
      title: 'Rockway Keys',
      hero: renderHero(pts),
      body: body,
    });
  }

  RW.register({
    id: 'rewards',
    title: 'Rewards',
    emoji: '🎁',
    tileBg: '#ffe9c7',
    section: 'money',
    order: 50,
    render: render,

    actions: {
      rewardsRedeem: function (el) {
        RW.S.redemptions = RW.S.redemptions || [];
        var rid = el.dataset.rid;
        var item = CATALOGUE.filter(function (c) { return c.id === rid; })[0];
        if (!item) return;

        var pts = typeof RW.S.points === 'number' ? RW.S.points : 0;
        if (pts < item.cost) {
          RW.toast('Not enough Keys — you need ' + item.cost + ' 🔑');
          return;
        }

        // Deduct points
        RW.S.points = pts - item.cost;

        // Credit wallet for cash rewards via RW.store.credit only
        if (item.kind === 'cash' && item.value > 0) {
          RW.store.credit(item.value, 'Rewards: ' + item.name);
        }

        // Record redemption
        RW.S.redemptions.push({
          id: uid(),
          t: Date.now(),
          name: item.name,
          cost: item.cost,
          value: item.value,
          kind: item.kind,
        });

        RW.store.save();
        RW.toast('Redeemed: ' + item.name + '  🔑');
        RW.render();
      },
    },
  });

  // Surface redemptions to Activity tab
  RW.registerActivity(function () {
    return (RW.S.redemptions || []).map(function (r) {
      var valueNote = r.kind === 'cash' && r.value > 0
        ? ' · ' + esc(money(r.value)) + ' added to wallet'
        : '';
      return {
        t: r.t,
        html:
          '<div class="card row">' +
            '<div class="lead" style="background:#ffe9c7">🎁</div>' +
            '<div class="body">' +
              '<div class="name">Keys redeemed: ' + esc(r.name) + '</div>' +
              '<div class="sub">' + esc(fmtTime(r.t)) + valueNote + '</div>' +
            '</div>' +
            '<div class="trail" style="color:var(--amber);font-weight:800">−' + esc(String(r.cost)) + ' 🔑</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
