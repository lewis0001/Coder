/* Rockway feature — Home: "The Rock, now".
 * The living Rock hero, then a Careem-style service launchpad — every section
 * one tap away, with live territory data baked into the tiles themselves —
 * then the day's content (briefing, bookings, news, events). */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  function gibHour() {
    try { return parseInt(new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Gibraltar', hour12: false, hour: '2-digit' }), 10); }
    catch (e) { return new Date().getHours(); }
  }

  function hero() {
    const W = RW.api.weather();
    const F = RW.api.frontier;
    const c = F.community('in-car');
    const dotColor = c.level === 'green' ? '#38e08a' : c.level === 'red' ? '#ff5a5a' : '#ffc24b';
    const levanter = /levant/i.test(W.condition) || /^E/i.test(W.windDir || '');
    const svg = RW.rock ? RW.rock({ frontierLevel: c.level }) : '';
    const sub = c.fresh
      ? c.count + ' recent report' + (c.count === 1 ? '' : 's') + ' · tap for cameras'
      : 'No fresh reports · typical for now · tap to help';
    return '<div class="rock-hero">' + svg +
      '<div class="hero-top"><div class="g"><div class="lg">' + (gibHour() < 12 ? 'Buenos días' : gibHour() < 18 ? 'Buenas tardes' : 'Buenas noches') + ' 🇬🇮</div>' +
      '<div class="sm">Gibraltar · ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Gibraltar' }) + (levanter ? ' · Levanter over the Rock' : '') + '</div></div>' +
      '<div class="hero-wx">' + W.emoji + ' ' + W.tempC + '°</div></div>' +
      '<div class="hero-foot" data-act="nav" data-route="#/frontier">' +
      '<div class="focona"><div class="lbl">La Focona · into Gibraltar</div>' +
      '<div class="v">' + esc(c.word) + '</div>' +
      '<div class="st"><span class="dot" style="background:' + dotColor + '"></span>' + esc(sub) + '</div></div>' +
      '<div class="hero-cta">Frontier ›</div></div></div>';
  }

  /* ---- live hints shown inside the service tiles (all guarded) ---- */
  function hints() {
    const h = {};
    try { h.frontier = { text: RW.api.frontier.community('in-car').word, live: true }; } catch (e) {}
    try { const W = RW.api.weather(); if (W) h.weather = { text: W.tempC + '° now', live: !!(RW.live && RW.live.status('weather') === 'ok') }; } catch (e) {}
    try {
      const r = RW.api.runway;
      if (r && r.closedNow && r.closedNow()) h.runway = { text: 'Closed now', live: true };
      else if (r && r.next) { const n = r.next(); h.runway = { text: n ? 'Next ' + n.start : 'Open today', live: !!n }; }
    } catch (e) {}
    try {
      const e = RW.api.nextEvent && RW.api.nextEvent();
      if (e) h.events = { text: new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), live: false };
    } catch (e) {}
    try { if (RW.live && RW.live.status('news') === 'ok') h.news = { text: 'Live now', live: true }; } catch (e) {}
    try { h.today = { text: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'Europe/Gibraltar' }), live: false }; } catch (e) {}
    return h;
  }

  /* ---- the launchpad ---- */
  const TILES = [
    { id: 'frontier', label: 'Frontier' },
    { id: 'carpool', label: 'Car-pool' },
    { id: 'weather', label: 'Weather & Sea' },
    { id: 'runway', label: 'Runway' },
    { id: 'today', label: 'Today', route: '#/today' },
    { id: 'events', label: 'What’s On' },
    { id: 'explore', label: 'Explore' },
    { id: 'news', label: 'News' },
    { id: 'marketplace', label: 'Buy & Sell' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'property', label: 'Property' },
    { id: 'lostfound', label: 'Lost & Found' },
    { id: 'chat', label: 'Chat' },
    { id: 'business', label: 'For Business', route: '#/business' },
  ];

  function launchpad() {
    const F = RW.FICON || {};
    const h = hints();
    const heroTile =
      '<button class="svc-hero" data-act="nav" data-route="#/discover" style="margin-bottom:9px">' +
      (F.key || '') +
      '<span><span class="t">Book local services</span><br>' +
      '<span class="s">Groomers · barbers · trades · tables — across the Rock</span></span>' +
      '<span class="go">›</span></button>';
    const tiles = TILES.map((t) => {
      const hint = h[t.id];
      return '<button class="svc" data-act="nav" data-route="' + (t.route || '#/' + t.id) + '">' +
        (F[t.id] || F.key || '') +
        '<span class="l">' + esc(t.label) + '</span>' +
        (hint ? '<span class="h' + (hint.live ? ' live' : '') + '">' + esc(hint.text) + '</span>' : '') +
        '</button>';
    }).join('');
    return heroTile + '<div class="svc-grid">' + tiles + '</div>';
  }

  function yourRockway() {
    const cards = [];
    (RW.S.bookings || []).filter((b) => b.status !== 'Cancelled').slice(-2).reverse().forEach((b) => {
      cards.push('<div class="card row" data-act="nav" data-route="#/activity" style="cursor:pointer">' +
        '<div class="lead" style="background:var(--green-soft)">📅</div><div class="body"><div class="name">' + esc(b.service) + ' · ' + esc(b.bizName) + '</div>' +
        '<div class="sub">' + esc(b.when) + ' · ' + esc(b.ref) + '</div></div><div class="trail"><span class="pill-status ok">' + esc(b.status || 'Requested') + '</span></div></div>');
    });
    return cards.join('');
  }

  function render() {
    const F = RW.FICON || {};
    const mine = yourRockway();
    // feature-contributed home cards (Today briefing first, then runway/news/events by homeOrder)
    const featureCards = RW.homeCards().map((f) => { try { return f.homeCard() || ''; } catch (e) { return ''; } }).join('');

    const body =
      '<button class="search-cta" style="margin-top:14px" data-act="nav" data-route="#/ask">' +
      '<span>✨</span><span>Ask Rockway anything…</span><span class="go">Ask</span></button>' +
      '<div style="margin-top:12px">' + launchpad() + '</div>' +
      (mine ? '<div class="section-title">Your Rockway</div>' + mine : '') +
      (featureCards ? '<div class="section-title">On the Rock today</div>' + featureCards : '') +
      '<button class="banner" style="margin-top:22px" data-act="nav" data-route="#/business">' +
      (F.business || '') +
      '<span><span class="t">Own a business on the Rock?</span><br>' +
      '<span class="s">List it free — take bookings in minutes</span></span>' +
      '<span class="go">›</span></button>';

    // No top bar — the living Rock hero is the header.
    return '<div class="screen fade-in">' + hero() + '<div class="pad">' + body + '<div style="height:24px"></div></div></div>' +
      RW.ui.tabbar('home');
  }

  RW.register({ id: 'home', title: 'Home', emoji: '🏠', showTile: false, render });
})(window.RW);
