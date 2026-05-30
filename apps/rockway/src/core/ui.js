/* Rockway core — shared UI builders used by every feature module.
 * Keeps look & feel consistent and lets features stay tiny. */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;
  const ICON = RW.ICON;

  // Top bar: either the branded home header, or a titled back-bar.
  function topbar(opts) {
    opts = opts || {};
    if (opts.brand) {
      const W = RW.api && RW.api.weather ? RW.api.weather() : { emoji: '🌥️', tempC: 21 };
      return (
        '<div class="topbar"><div class="topbar-row">' +
        '<div class="loc">' + ICON.pin + '<div>Gibraltar <small>GX11 1AA · The Rock</small></div></div>' +
        '<div class="weather-pill">' + W.emoji + ' ' + W.tempC + '°C</div>' +
        '</div></div>'
      );
    }
    const plain = opts.plain ? ' plain' : '';
    return (
      '<div class="topbar' + plain + '"><div class="topbar-row">' +
      '<button class="back-btn" data-act="back">' + ICON.back + '</button>' +
      '<h1>' + esc(opts.title || '') + '</h1>' +
      '<div style="width:40px;text-align:right">' + (opts.right || '') + '</div>' +
      '</div></div>'
    );
  }

  function tabbar(active) {
    const tabs = [
      { id: 'home', label: 'Home', route: '#/', icon: ICON.home },
      { id: 'activity', label: 'Activity', route: '#/activity', icon: ICON.activity },
      { id: 'wallet', label: 'Wallet', route: '#/wallet', icon: ICON.wallet },
      { id: 'account', label: 'Account', route: '#/account', icon: ICON.user },
    ];
    return '<div class="tabbar">' + tabs.map((t) =>
      '<button class="tab' + (t.id === active ? ' active' : '') + '" data-act="nav" data-route="' + t.route + '">' +
      t.icon + '<span>' + t.label + '</span></button>').join('') + '</div>';
  }

  function cartFab() {
    if (!RW.store.cartCount()) return '';
    return '<button class="cart-fab" data-act="nav" data-route="#/cart">🧺 Basket ' +
      '<span class="badge">' + RW.store.cartCount() + '</span> · ' + money(RW.store.cartTotal()) + '</button>';
  }

  // Compose a full screen. body = inner HTML (without topbar/tabbar).
  // opts: {title, brand, plain, tab, fab(bool), hero, sticky}
  function screen(opts) {
    opts = opts || {};
    const top = topbar(opts.brand ? { brand: true } : { title: opts.title, plain: opts.plain, right: opts.right });
    const fab = opts.fab === false ? '' : cartFab();
    return top +
      '<div class="screen fade-in">' + (opts.hero || '') + '<div class="pad">' + (opts.body || '') + '<div style="height:24px"></div></div></div>' +
      (opts.sticky || '') + fab + tabbar(opts.tab || 'home');
  }

  // Small reusable row.
  function row(o) {
    return '<div class="row"' + (o.route ? ' data-act="nav" data-route="' + o.route + '" style="cursor:pointer"' : '') + '>' +
      '<div class="lead"' + (o.leadBg ? ' style="background:' + o.leadBg + '"' : '') + '>' + (o.lead || '') + '</div>' +
      '<div class="body"><div class="name">' + esc(o.name) + '</div>' +
      (o.sub ? '<div class="sub">' + esc(o.sub) + '</div>' : '') + '</div>' +
      (o.trail != null ? '<div class="trail">' + o.trail + '</div>' : '') + '</div>';
  }

  function sectionTitle(label, linkText, linkRoute) {
    return '<div class="section-title">' + esc(label) +
      (linkText ? '<span class="link" data-act="nav" data-route="' + linkRoute + '">' + esc(linkText) + '</span>' : '') + '</div>';
  }

  function empty(emoji, text, btnLabel, btnRoute) {
    return '<div class="empty"><div class="e">' + emoji + '</div><p>' + text + '</p>' +
      (btnLabel ? '<button class="btn" style="max-width:220px;margin:14px auto 0" data-act="nav" data-route="' + btnRoute + '">' + esc(btnLabel) + '</button>' : '') +
      '</div>';
  }

  // Tinted gradient hero for feature detail screens.
  // opts: { emoji, title, sub, accent (hex), chips:[strings] }
  function hero(opts) {
    opts = opts || {};
    const a = opts.accent || '#d4112a';
    const a2 = RW.util.shade(a, -28);
    const chips = (opts.chips || []).map((c) => '<span class="chip">' + esc(c) + '</span>').join('');
    return '<div class="hero" style="background:linear-gradient(135deg,' + a + ',' + a2 + ')">' +
      (opts.emoji ? '<div class="hero-emoji">' + opts.emoji + '</div>' : '') +
      '<div class="hero-title">' + esc(opts.title || '') + '</div>' +
      (opts.sub ? '<div class="hero-sub">' + esc(opts.sub) + '</div>' : '') +
      (chips ? '<div class="chips" style="margin-top:10px">' + chips + '</div>' : '') + '</div>';
  }

  // Interactive filter chip row. items:[{label,value}], current value, action name.
  function chips(items, current, act, brand) {
    return '<div class="chips" style="margin-bottom:12px">' + items.map((it) => {
      const on = it.value === current ? ' on' + (brand ? ' brand' : '') : '';
      return '<span class="chip tap' + on + '" data-act="' + act + '" data-v="' + esc(it.value) + '">' + esc(it.label) + '</span>';
    }).join('') + '</div>';
  }

  RW.ui = { topbar, tabbar, cartFab, screen, row, sectionTitle, empty, hero, chips };
})(window.RW);
