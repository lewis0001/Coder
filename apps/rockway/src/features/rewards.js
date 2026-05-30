/* Rockway feature — Rewards (Rockway Keys loyalty programme). */
(function (RW) {
  'use strict';
  const { esc, money, uid, fmtTime } = RW.util;

  // ---- tier definitions (themed on Gibraltar's gold Key to the Mediterranean) ----
  const TIERS = [
    { name: 'Bronze Key',  min: 0,    max: 250,  color: '#cd7f32', next: 'Silver Key' },
    { name: 'Silver Key',  min: 250,  max: 750,  color: '#a8a9ad', next: 'Gold Key'   },
    { name: 'Gold Key',    min: 750,  max: 1500, color: '#cfb53b', next: 'Rock Elite' },
    { name: 'Rock Elite',  min: 1500, max: Infinity, color: '#8b0000', next: null    },
  ];

  // ---- reward catalogue ----
  const CATALOGUE = [
    { id: 'r_free_delivery', name: 'Free delivery voucher',           cost: 150, value: 0,    kind: 'voucher', emoji: '🚚' },
    { id: 'r_wallet_2',     name: '£2 wallet credit',                cost: 200, value: 2,    kind: 'cash',    emoji: '💳' },
    { id: 'r_dolphin',      name: 'Dolphin tour discount',           cost: 350, value: 0,    kind: 'voucher', emoji: '🐬' },
    { id: 'r_wallet_5',     name: '£5 wallet credit',                cost: 450, value: 5,    kind: 'cash',    emoji: '💳' },
    { id: 'r_cable_car',    name: 'Cable Car priority pass (2027)',  cost: 500, value: 0,    kind: 'voucher', emoji: '🚡' },
  ];

  function getTier(pts) {
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (pts >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[0];
  }

  function renderHero(pts) {
    var tier = getTier(pts);
    var isTop = tier.next === null;
    var progressPct = isTop ? 100
      : Math.min(100, Math.round((pts - tier.min) / (tier.max - tier.min) * 100));
    var ptsToNext = isTop ? 0 : (tier.max - pts);

    var progressBar =
      '<div style="background:#e5e5e5;border-radius:6px;height:8px;margin:10px 0 4px">' +
      '<div style="background:' + esc(tier.color) + ';width:' + progressPct + '%;height:8px;border-radius:6px;transition:width .4s"></div>' +
      '</div>';

    var nextLine = isTop
      ? '<div style="font-size:12px;opacity:.75;margin-top:2px">Top tier — Rock Elite. ¡Ole!</div>'
      : '<div style="font-size:12px;opacity:.75;margin-top:2px">' + ptsToNext + ' more Keys to ' + esc(tier.next) + '</div>';

    return '<div class="balance-card" style="background:linear-gradient(135deg,#7b1a1a 0%,#c0392b 100%)">' +
      '<div class="lbl" style="color:#ffe9c7">Your Rockway Keys</div>' +
      '<div class="amt" style="color:#ffe9c7;font-size:2.4rem">' + pts + ' 🔑</div>' +
      '<div style="color:#ffe9c7;font-size:14px;font-weight:600;margin-top:6px">' + esc(tier.name) + '</div>' +
      progressBar + nextLine +
      '</div>';
  }

  function renderCatalogue(pts) {
    var rows = CATALOGUE.map(function (item) {
      var canAfford = pts >= item.cost;
      var btnClass = canAfford ? 'btn gold sm' : 'btn ghost sm';
      return '<div class="row" style="padding:10px 0;border-bottom:1px solid #f0e8d8">' +
        '<div class="lead" style="background:#ffe9c7;font-size:1.4rem">' + item.emoji + '</div>' +
        '<div class="body">' +
        '<div class="name">' + esc(item.name) + '</div>' +
        '<div class="sub">' + item.cost + ' Keys</div>' +
        '</div>' +
        '<button class="' + btnClass + '" data-act="rewardsRedeem" ' +
        'data-rid="' + esc(item.id) + '">' +
        (canAfford ? 'Redeem' : item.cost + ' pts') +
        '</button>' +
        '</div>';
    }).join('');
    return '<div class="card" style="padding:0 12px">' + rows + '</div>';
  }

  function renderHistory() {
    var redemptions = RW.S.redemptions || [];
    if (!redemptions.length) {
      return RW.ui.empty('🔑', 'No redemptions yet.<br>Earn Keys by spending in Rockway.');
    }
    var rows = redemptions.slice().reverse().slice(0, 20).map(function (r) {
      return '<div class="row">' +
        '<div class="lead" style="background:#ffe9c7">🎁</div>' +
        '<div class="body">' +
        '<div class="name">' + esc(r.name) + '</div>' +
        '<div class="sub">' + fmtTime(r.t) + ' · ' + r.cost + ' Keys</div>' +
        '</div>' +
        '<div class="trail" style="color:var(--gold);font-weight:600">−' + r.cost + ' 🔑</div>' +
        '</div>';
    }).join('');
    return '<div class="card">' + rows + '</div>';
  }

  function renderEarn() {
    return '<div class="card" style="padding:14px 16px">' +
      '<div style="font-weight:600;margin-bottom:8px">How to earn Rockway Keys 🔑</div>' +
      '<div class="row" style="padding:6px 0">' +
        '<div class="lead" style="background:#e7f3ec">🛒</div>' +
        '<div class="body"><div class="name">Shop &amp; Eat</div>' +
        '<div class="sub">1 Key per £1 spent at any Rockway partner</div></div>' +
      '</div>' +
      '<div class="row" style="padding:6px 0">' +
        '<div class="lead" style="background:#e7ecf3">🚌</div>' +
        '<div class="body"><div class="name">Move</div>' +
        '<div class="sub">Keys on bus, taxi &amp; bike rides</div></div>' +
      '</div>' +
      '<div class="row" style="padding:6px 0">' +
        '<div class="lead" style="background:#f3ece7">📦</div>' +
        '<div class="body"><div class="name">Send &amp; Deliver</div>' +
        '<div class="sub">Earn Keys on every parcel or delivery</div></div>' +
      '</div>' +
      '<div style="font-size:12px;opacity:.65;margin-top:8px">Keys never expire. Keep spending on the Rock!</div>' +
      '</div>';
  }

  function render() {
    RW.S.redemptions = RW.S.redemptions || [];
    var pts = typeof RW.S.points === 'number' ? RW.S.points : 0;

    var body =
      renderHero(pts) +
      RW.ui.sectionTitle('Redeem Keys') +
      renderCatalogue(pts) +
      RW.ui.sectionTitle('How to Earn') +
      renderEarn() +
      RW.ui.sectionTitle('Redemption History') +
      renderHistory();

    return RW.ui.screen({ title: 'Rewards', body });
  }

  RW.register({
    id: 'rewards',
    title: 'Rewards',
    emoji: '🎁',
    tileBg: '#ffe9c7',
    section: 'money',
    order: 50,
    render,

    actions: {
      rewardsRedeem: function (el) {
        RW.S.redemptions = RW.S.redemptions || [];
        var rid = el.dataset.rid;
        var item = CATALOGUE.filter(function (c) { return c.id === rid; })[0];
        if (!item) return;

        var pts = typeof RW.S.points === 'number' ? RW.S.points : 0;
        if (pts < item.cost) {
          RW.toast('Not enough Keys yet — you need ' + item.cost + ' 🔑');
          return;
        }

        // Subtract points
        RW.S.points = pts - item.cost;

        // Credit wallet for cash rewards
        if (item.kind === 'cash' && item.value > 0) {
          RW.store.credit(item.value, 'Rewards redemption: ' + item.name);
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
        RW.toast('Redeemed: ' + item.name + ' 🔑');
        RW.render();
      },
    },
  });

  // Surface redemptions to Activity tab
  RW.registerActivity(function () {
    return (RW.S.redemptions || []).map(function (r) {
      return {
        t: r.t,
        html: '<div class="card row">' +
          '<div class="lead" style="background:#ffe9c7">🎁</div>' +
          '<div class="body">' +
          '<div class="name">Rewards: ' + esc(r.name) + '</div>' +
          '<div class="sub">' + fmtTime(r.t) + ' · ' + r.cost + ' Keys redeemed</div>' +
          '</div>' +
          '<div class="trail" style="color:var(--gold);font-weight:600">−' + r.cost + ' 🔑</div>' +
          '</div>',
      };
    });
  });

})(window.RW);
