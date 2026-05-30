/* Rockway feature — Wallet (balance, transactions, top-up, QR pay). */
(function (RW) {
  'use strict';
  const { esc, money, fmtTime, fmtDate } = RW.util;

  // Category metadata: maps keyword fragments → {icon, label}
  var CATS = [
    { keys: ['top-up', 'topup', 'visa', 'mastercard', 'added'], icon: '💳', label: 'Top-up' },
    { keys: ['food', 'café', 'cafe', 'plaice', 'restaurant', 'bar', 'eat', 'burger', 'pizza', 'fish'], icon: '🍽️', label: 'Food & Drink' },
    { keys: ['park', 'parking'], icon: '🅿️', label: 'Parking' },
    { keys: ['taxi', 'bus', 'ferry', 'transport', 'travel'], icon: '🚌', label: 'Transport' },
    { keys: ['aquagib', 'electric', 'water', 'gea', 'utility', 'bill', 'rate'], icon: '⚡', label: 'Utilities' },
    { keys: ['gibtelecom', 'u-mee', 'mobile', 'esim', 'data'], icon: '📱', label: 'Mobile' },
    { keys: ['supermarket', 'shop', 'market', 'grocery', 'store'], icon: '🛒', label: 'Shopping' },
    { keys: ['reward', 'cashback', 'point', 'bonus'], icon: '🎁', label: 'Rewards' },
    { keys: ['send', 'transfer', 'request', 'split', 'pay '], icon: '↔️', label: 'Transfer' },
    { keys: ['ticket', 'event', 'concert', 'cinema'], icon: '🎟️', label: 'Events' },
  ];

  function txnCategory(label) {
    var l = (label || '').toLowerCase();
    for (var i = 0; i < CATS.length; i++) {
      for (var j = 0; j < CATS[i].keys.length; j++) {
        if (l.indexOf(CATS[i].keys[j]) !== -1) return CATS[i];
      }
    }
    return { icon: '💸', label: 'Other' };
  }

  // Group transactions by calendar day (most recent first)
  function groupByDay(txns) {
    var groups = [];
    var map = {};
    for (var i = 0; i < txns.length; i++) {
      var t = txns[i];
      var d = new Date(t.t);
      var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      if (!map[key]) {
        map[key] = { key: key, ts: t.t, items: [] };
        groups.push(map[key]);
      }
      map[key].items.push(t);
    }
    return groups;
  }

  // Friendly day label: Today / Yesterday / date
  function dayLabel(ts) {
    var d = new Date(ts);
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // Quick stats: this-month spend, points balance, total saved (top-ups minus spend)
  function monthStats() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var spend = 0;
    var txns = RW.S.txns || [];
    for (var i = 0; i < txns.length; i++) {
      var d = new Date(txns[i].t);
      if (d.getFullYear() === y && d.getMonth() === m && txns[i].kind === 'out') {
        spend += Math.abs(txns[i].amt);
      }
    }
    return { spend: spend, points: RW.S.points || 0 };
  }

  // Build the top-up amount chooser chips
  function topupChooser() {
    var amounts = [10, 25, 50, 100];
    var sel = RW.S._walletTopupAmt || 25;
    var chips = amounts.map(function (a) {
      var on = (a === sel) ? ' on' : '';
      return '<span class="chip tap' + on + '" data-act="walletChooseTopup" data-amt="' + a + '">£' + a + '</span>';
    }).join('');
    return (
      '<div class="chips" style="margin-bottom:10px">' + chips + '</div>' +
      '<button class="btn gold" data-act="topupWallet">＋ Add <span class="num">£' + sel + '</span> to wallet</button>'
    );
  }

  function render() {
    var txns = (RW.S.txns || []).slice().reverse();
    var stats = monthStats();

    // ---- Balance card ----
    var balanceCard = (
      '<div class="balance-card">' +
        '<div class="lbl">Rockway Wallet</div>' +
        '<div class="amt num">' + money(RW.S.wallet) + '</div>' +
        '<div style="opacity:.75;font-size:12px;margin-top:6px;display:flex;align-items:center;gap:8px">' +
          '<span class="pill-status ok" style="padding:3px 8px;font-size:11px">GIP · pegged 1:1 to GBP</span>' +
        '</div>' +
        '<div style="opacity:.8;font-size:12px;margin-top:8px">🔑 ' + esc(RW.S.name) + ' · Gibraltar</div>' +
      '</div>'
    );

    // ---- Quick stats ----
    var quickStats = (
      '<div class="grid2" style="margin-top:12px">' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--brand)">' + money(stats.spend) + '</div>' +
          '<div class="l">This month spend</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--gold)">' + stats.points + ' pts</div>' +
          '<div class="l">Rewards points</div>' +
        '</div>' +
      '</div>'
    );

    // ---- Action buttons ----
    var actions = (
      '<div style="margin-top:14px">' +
        RW.ui.sectionTitle('Top up') +
        '<div class="card">' +
          topupChooser() +
          '<div style="margin-top:10px">' +
          '<button class="btn dark" data-act="payqr" style="margin-top:0">📷 Pay / Scan QR</button>' +
          '</div>' +
          '<div style="margin-top:10px;text-align:center;font-size:11.5px;color:var(--ash)">' +
            'Contactless &amp; Apple/Google Pay accepted · Visa · Mastercard' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    // ---- Transactions ----
    var txnHtml;
    if (txns.length === 0) {
      txnHtml = RW.ui.empty('💳', 'No transactions yet.\nMake your first payment or top up your wallet.');
    } else {
      var groups = groupByDay(txns.slice(0, 30));
      var rows = groups.map(function (g) {
        var dayRows = g.items.map(function (t) {
          var cat = txnCategory(t.label);
          var isIn = t.kind === 'in';
          var amtStr = (isIn ? '+' : '−') + money(Math.abs(t.amt));
          var amtColor = isIn ? 'color:var(--green)' : 'color:var(--ink)';
          return (
            '<div class="row">' +
              '<div class="lead" style="background:' + (isIn ? 'var(--green-soft)' : 'var(--cloud)') + ';font-size:20px">' + cat.icon + '</div>' +
              '<div class="body">' +
                '<div class="name">' + esc(t.label) + '</div>' +
                '<div class="sub">' + esc(cat.label) + ' · ' + fmtTime(t.t) + '</div>' +
              '</div>' +
              '<div class="trail num" style="' + amtColor + '">' + amtStr + '</div>' +
            '</div>'
          );
        }).join('');
        return (
          '<div style="font-size:11.5px;font-weight:700;color:var(--ash);letter-spacing:.2px;text-transform:uppercase;padding:10px 0 2px;border-top:1px solid var(--mist)">' +
            dayLabel(g.ts) +
          '</div>' +
          dayRows
        );
      }).join('');

      txnHtml = '<div class="card" style="padding:0 14px">' + rows + '</div>';
    }

    var body = (
      balanceCard +
      quickStats +
      actions +
      RW.ui.sectionTitle('Transactions') +
      txnHtml
    );

    return RW.ui.screen({ title: 'Wallet', plain: true, tab: 'wallet', body: body, fab: false });
  }

  RW.register({
    id: 'wallet',
    title: 'Wallet',
    emoji: '💳',
    tileBg: '#e7e9ee',
    section: 'money',
    order: 10,
    render: render,
    actions: {
      // Kept exactly as before — external callers depend on these names
      topupWallet: function () {
        var amt = RW.S._walletTopupAmt || 25;
        RW.store.credit(amt, 'Top-up · Visa ••42');
        RW.toast('£' + amt.toFixed(2) + ' added to wallet');
        RW.render();
      },
      payqr: function () {
        RW.toast('📷 Point at a Rockway QR to pay');
      },
      // Select a top-up amount (wallet-prefixed, safe to add)
      walletChooseTopup: function (el) {
        var amt = parseFloat(el.dataset.amt);
        if (!amt || isNaN(amt)) return;
        RW.S._walletTopupAmt = amt;
        RW.store.save();
        RW.render();
      },
    },
  });
})(window.RW);
