/* Rockway feature — Home hub. Sectioned app grid built from the registry. */
(function (RW) {
  'use strict';
  const { esc, money, dayPart, shade } = RW.util;

  function grid() {
    const tiles = RW.tiles();
    return RW.SECTIONS.map((sec) => {
      const items = tiles.filter((t) => t.section === sec.id);
      if (!items.length) return '';
      return '<div class="section-title" style="margin-top:22px">' + esc(sec.label) + '</div>' +
        '<div class="app-grid">' + items.map((a) =>
          '<button class="app-tile" data-act="nav" data-route="' + (a.route || '#/' + a.id) + '">' +
          '<div class="app-icon" style="background:' + (a.tileBg || '#eef0f5') + '">' + a.emoji + '</div>' +
          '<div class="app-label">' + esc(a.title) + '</div></button>').join('') + '</div>';
    }).join('');
  }

  function render() {
    const F = RW.api.frontier;
    const inCar = F.wait(F.lanes[0]);
    const promos = RW.api.promos().map((p) =>
      '<div class="promo" style="background:linear-gradient(135deg,' + p.accent + ',' + shade(p.accent) + ')">' +
      '<div class="pe">' + p.emoji + '</div><div><h4>' + esc(p.title) + '</h4><p>' + esc(p.sub) + '</p></div></div>').join('');
    const cards = RW.homeCards().map((f) => { try { return f.homeCard() || ''; } catch (e) { return ''; } }).join('');

    const body =
      '<div style="margin:6px 0 2px"><div style="font-size:15px;color:var(--ash);font-weight:600">Good ' + dayPart() + ',</div>' +
      '<div style="font-size:24px;font-weight:900;letter-spacing:-.6px;margin-top:2px">Welcome to Rockway 🇬🇮</div></div>' +

      '<div class="frontier-banner" data-act="nav" data-route="#/frontier" style="margin-top:14px">' +
      '<div style="font-size:30px">🛂</div>' +
      '<div style="flex:1"><div style="font-weight:800;font-size:14px">Frontier — entering Gibraltar</div>' +
      '<div style="font-size:12.5px;opacity:.85;margin-top:2px"><span class="dot ' + F.level(inCar) + '"></span> ' + F.word(inCar) + ' by car · updated just now</div></div>' +
      '<div style="text-align:right"><div class="big">' + inCar + '</div><div style="font-size:11px;opacity:.85">min wait</div></div></div>' +

      grid() +

      '<div class="section-title" style="margin-top:24px">Offers for you</div>' +
      '<div class="carousel">' + promos + '</div>' +

      '<div class="section-title">On the Rock right now</div>' +
      weatherCard() +

      cards;

    return RW.ui.screen({ brand: true, tab: 'home', body });
  }

  function weatherCard() {
    const W = RW.api.weather();
    return '<div class="card weather-card">' +
      '<div style="font-size:40px">' + W.emoji + '</div>' +
      '<div style="flex:1"><div class="t">' + W.tempC + '°</div>' +
      '<div class="muted tiny" style="font-weight:600">' + esc(W.condition) + '</div>' +
      '<div class="chips"><span class="chip">💨 ' + W.windKt + 'kt ' + esc(W.windDir) + '</span>' +
      '<span class="chip">🌊 Sea ' + esc(W.seaState) + '</span>' +
      '<span class="chip">↑' + W.high + '° ↓' + W.low + '°</span></div></div></div>';
  }

  RW.register({ id: 'home', title: 'Home', emoji: '🏠', showTile: false, render });
})(window.RW);
