/* Rockway feature — Home: "The Rock, now".
 * A living, state-aware view of the territory (the Rock illustration + the
 * community frontier signal), with the local-business marketplace below. */
(function (RW) {
  'use strict';
  const { esc, dayPart, shade } = RW.util;

  function hero() {
    const W = RW.api.weather();
    const F = RW.api.frontier;
    const c = F.community('in-car');
    const dotColor = c.level === 'green' ? '#38e08a' : c.level === 'red' ? '#ff5a5a' : '#ffc24b';
    const levanter = /levant/i.test(W.condition) || /E/.test(W.windDir);
    const svg = RW.rock ? RW.rock({ frontierLevel: c.level }) : '';
    const sub = c.fresh
      ? c.count + ' recent report' + (c.count === 1 ? '' : 's') + ' · tap for cameras'
      : 'No fresh reports · typical for now · tap to help';
    return '<div class="rock-hero">' + svg +
      '<div class="hero-top"><div class="g"><div class="lg">' + ({ morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' }[dayPart()] || 'Buenas') + ' 🇬🇮</div>' +
      '<div class="sm">Gibraltar · ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + (levanter ? ' · Levanter over the Rock' : '') + '</div></div>' +
      '<div class="hero-wx">' + W.emoji + ' ' + W.tempC + '°</div></div>' +
      '<div class="hero-foot" data-act="nav" data-route="#/frontier">' +
      '<div class="focona"><div class="lbl">La Focona · into Gibraltar</div>' +
      '<div class="v">' + esc(c.word) + '</div>' +
      '<div class="st"><span class="dot" style="background:' + dotColor + '"></span>' + esc(sub) + '</div></div>' +
      '<div class="hero-cta">Frontier ›</div></div></div>';
  }

  function nowStack() {
    const cards = [];
    const now = Date.now();
    // upcoming bookings
    (RW.S.bookings || []).filter((b) => b.status !== 'Cancelled').slice(-2).reverse().forEach((b) => {
      cards.push('<div class="card row" data-act="nav" data-route="#/activity" style="cursor:pointer">' +
        '<div class="lead" style="background:var(--green-soft)">📅</div><div class="body"><div class="name">' + esc(b.service) + ' · ' + esc(b.bizName) + '</div>' +
        '<div class="sub">' + esc(b.when) + ' · ' + esc(b.ref) + '</div></div><div class="trail"><span class="pill-status ok">' + esc(b.status || 'Booked') + '</span></div></div>');
    });
    // feature-contributed home cards (News headline, What's On)
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
    const offers = RW.api.offers().map((p) =>
      '<div class="promo" data-act="nav" data-route="' + (p.route || '#/') + '" style="cursor:pointer;background:linear-gradient(135deg,' + p.accent + ',' + shade(p.accent) + ')">' +
      '<div class="pe">' + p.emoji + '</div><div><h4>' + esc(p.title) + '</h4><p>' + esc(p.sub) + '</p></div></div>').join('');

    const now = nowStack();
    const body =
      // primary CTA into the marketplace
      '<button class="btn" style="margin-top:14px" data-act="nav" data-route="#/discover">🔎 Find &amp; book a local business</button>' +
      (now ? '<div class="section-title" style="margin-top:20px">Your Rockway</div>' + now : '') +
      '<div class="section-title" style="margin-top:20px">Explore Gibraltar</div>' +
      grid() +
      '<div class="section-title" style="margin-top:22px">For you</div>' +
      '<div class="carousel">' + offers + '</div>';

    // No top bar — the living Rock hero is the header.
    return '<div class="screen fade-in">' + hero() + '<div class="pad">' + body + '<div style="height:24px"></div></div></div>' +
      RW.ui.tabbar('home');
  }

  RW.register({ id: 'home', title: 'Home', emoji: '🏠', showTile: false, render });
})(window.RW);
