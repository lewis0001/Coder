/* Rockway feature — Home: "The Rock, now".
 * Not an icon launcher. A living, state-aware view of the territory (the Rock
 * illustration + live signals), with the full catalogue demoted below. */
(function (RW) {
  'use strict';
  const { esc, money, dayPart, shade, fmtTime } = RW.util;

  function hero() {
    const W = RW.api.weather();
    const F = RW.api.frontier;
    const inCar = F.wait(F.lanes[0]);
    const lvl = F.level(inCar);
    const dotColor = lvl === 'green' ? '#38e08a' : lvl === 'red' ? '#ff5a5a' : '#ffc24b';
    const levanter = /levant/i.test(W.condition) || /E/.test(W.windDir);
    const svg = RW.rock ? RW.rock({ frontierLevel: lvl }) : '';
    return '<div class="rock-hero">' + svg +
      '<div class="hero-top"><div class="g"><div class="lg">Buenas, ' + dayPart() + ' 🇬🇮</div>' +
      '<div class="sm">Gibraltar · ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + (levanter ? ' · Levanter over the Rock' : '') + '</div></div>' +
      '<div class="hero-wx">' + W.emoji + ' ' + W.tempC + '°</div></div>' +
      '<div class="hero-foot" data-act="nav" data-route="#/frontier">' +
      '<div class="focona"><div class="lbl">La focona · entering by car</div>' +
      '<div class="v">' + inCar + ' <small>min</small></div>' +
      '<div class="st"><span class="dot ' + lvl + '" style="background:' + dotColor + '"></span>' + F.word(inCar) + ' · tap for live border</div></div>' +
      '<div class="hero-cta">Frontier ›</div></div></div>';
  }

  function nowStack() {
    const cards = [];
    // live order in progress
    const o = RW.S.orders.slice().reverse().find((x) => (Date.now() - x.t) < 60 * 60000);
    if (o) {
      cards.push('<div class="card row" data-act="nav" data-route="#/order/' + o.id + '" style="cursor:pointer">' +
        '<div class="lead" style="background:var(--green-soft)">🛵</div><div class="body"><div class="name">Order on the way · ' + esc(o.vendorName) + '</div>' +
        '<div class="sub">Arriving ' + esc(o.eta) + ' · ' + o.ref + '</div></div><div class="trail"><span class="pill-status ok">Track</span></div></div>');
    }
    // feature-contributed home cards (e.g. What's On)
    RW.homeCards().forEach((f) => { try { const h = f.homeCard(); if (h) cards.push(h); } catch (e) {} });
    return cards.join('');
  }

  function grid() {
    const tiles = RW.tiles();
    return RW.SECTIONS.map((sec) => {
      const items = tiles.filter((t) => t.section === sec.id);
      if (!items.length) return '';
      return '<div class="section-title" style="margin-top:20px">' + esc(sec.label) + '</div>' +
        '<div class="app-grid">' + items.map((a) =>
          '<button class="app-tile" data-act="nav" data-route="' + (a.route || '#/' + a.id) + '">' +
          '<div class="app-icon" style="background:' + (a.tileBg || '#eef0f5') + '">' + a.emoji + '</div>' +
          '<div class="app-label">' + esc(a.title) + '</div></button>').join('') + '</div>';
    }).join('');
  }

  function render() {
    const promos = RW.api.promos().map((p) =>
      '<div class="promo" style="background:linear-gradient(135deg,' + p.accent + ',' + shade(p.accent) + ')">' +
      '<div class="pe">' + p.emoji + '</div><div><h4>' + esc(p.title) + '</h4><p>' + esc(p.sub) + '</p></div></div>').join('');

    const now = nowStack();
    const body =
      (now ? '<div class="section-title" style="margin-top:14px">Now on the Rock</div>' + now : '') +
      '<div class="section-title" style="margin-top:20px">Everything, in one app</div>' +
      grid() +
      '<div class="section-title" style="margin-top:22px">Offers for you</div>' +
      '<div class="carousel">' + promos + '</div>';

    // No top bar — the living Rock hero is the header.
    return '<div class="screen fade-in">' + hero() + '<div class="pad">' + body + '<div style="height:24px"></div></div></div>' +
      RW.ui.cartFab() + RW.ui.tabbar('home');
  }

  RW.register({ id: 'home', title: 'Home', emoji: '🏠', showTile: false, render });
})(window.RW);
