/* Rockway core — "The Rock, now": a generative, time- and state-aware SVG
 * illustration of Gibraltar. This is the signature surface — the home screen is
 * built around it rather than around an icon grid. It reflects live territory
 * state: time of day, the Levanter cloud, the frontier queue, the runway
 * crossing, the cable car, ships in the bay and the Europa lighthouse.
 *
 * RW.rock(state?) -> SVG string. State is auto-derived from RW.api when omitted:
 *   { hour, levanter:bool, frontierLevel:'green'|'amber'|'red', runwayClosed:bool } */
(function (RW) {
  'use strict';

  function phase(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 18) return 'day';
    if (h >= 18 && h < 21) return 'dusk';
    return 'night';
  }
  const SKY = {
    dawn:  ['#f9d7b0', '#f4a9a0'],
    day:   ['#bfe1f2', '#eaf5fb'],
    dusk:  ['#f6b15c', '#b8567f'],
    night: ['#0c1f38', '#1d3c5f'],
  };
  const ROCKFILL = { dawn: ['#9a8f86', '#5f574f'], day: ['#b9b1a6', '#6f675d'], dusk: ['#7d6f74', '#3f3742'], night: ['#243a55', '#0f2138'] };
  const SEA = { dawn: '#7fa9c4', day: '#5fa8d6', dusk: '#6b6f9c', night: '#0e2a47' };
  const HAZE = { dawn: 0.5, day: 0.28, dusk: 0.55, night: 0.6 };

  function derive() {
    const w = (RW.api && RW.api.weather && RW.api.weather()) || { windDir: 'E' };
    const levanter = /e/i.test(w.windDir || '') && /levant|^e/i.test(w.windDir || 'E');
    let level = 'amber';
    if (RW.api && RW.api.frontier) { level = RW.api.frontier.community('in-car').level; }
    return { hour: new Date().getHours(), levanter: /levant/i.test(w.condition || '') || /E/.test(w.windDir || ''), frontierLevel: level, runwayClosed: false };
  }

  function rock(state) {
    state = Object.assign(derive(), state || {});
    const ph = phase(state.hour);
    const sky = SKY[ph], rf = ROCKFILL[ph], sea = SEA[ph], haze = HAZE[ph];
    const night = ph === 'night';
    const dotColor = state.frontierLevel === 'green' ? '#38e08a' : state.frontierLevel === 'red' ? '#ff5a5a' : '#ffc24b';

    // celestial body
    const sunY = ph === 'day' ? 46 : ph === 'night' ? 50 : 92;
    const sunX = ph === 'dawn' ? 322 : ph === 'dusk' ? 78 : 312;
    const sun = night
      ? '<circle cx="312" cy="50" r="15" fill="#eef2f6"/><circle cx="318" cy="46" r="13" fill="' + sky[1] + '"/>'
      : '<circle cx="' + sunX + '" cy="' + sunY + '" r="17" fill="' + (ph === 'day' ? '#fff3c4' : '#ffd9a0') + '"/>';
    const stars = night ? Array.from({ length: 22 }).map((_, i) => {
      const x = (i * 53 % 380) + 8, y = (i * 29 % 90) + 8, r = (i % 3) ? 0.7 : 1.2;
      return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity="' + (0.4 + (i % 4) * 0.15) + '"/>';
    }).join('') : '';

    // the Rock silhouette — north face (steep, left/frontier) sloping south to Europa (right)
    const rockPath = 'M52,196 L58,150 L90,66 C118,52 140,58 166,74 C202,92 238,116 286,152 L346,180 L360,184 L360,196 Z';
    // a lighter ridge highlight
    const ridge = 'M90,66 C118,52 140,58 166,74 C202,92 238,116 286,152';

    const ships = [[150, 184, 0], [205, 188, 1.2], [96, 190, 0.6]].map((s) =>
      '<g transform="translate(' + s[0] + ',' + s[1] + ')"><g class="rk-ship" style="animation-delay:' + s[2] + 's">' +
      '<rect x="-7" y="-2" width="14" height="3.4" rx="1" fill="' + (night ? '#22405f' : '#3c3a38') + '"/>' +
      '<rect x="-2" y="-5" width="4" height="3" fill="' + (night ? '#2c4a6b' : '#55524e') + '"/></g></g>').join('');

    const levanterCloud = state.levanter
      ? '<g class="rk-levanter" opacity="0.92"><ellipse cx="150" cy="60" rx="78" ry="17" fill="#f4f6f8"/>' +
        '<ellipse cx="120" cy="66" rx="46" ry="13" fill="#e9edf1"/><ellipse cx="186" cy="64" rx="40" ry="12" fill="#eef1f4"/></g>'
      : '';

    // cable car line from town (south) up toward the summit, with a cabin
    const cable = '<line x1="208" y1="196" x2="172" y2="86" stroke="' + (night ? '#3a506f' : '#8a8178') + '" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>' +
      '<g class="rk-cabin"><rect x="188" y="138" width="7" height="5" rx="1.4" fill="#d4112a"/></g>';

    // Europa lighthouse (south tip) with blinking lamp
    const lighthouse = '<g transform="translate(351,168)"><rect x="-3" y="0" width="6" height="14" rx="1" fill="#f4efe4"/>' +
      '<rect x="-3" y="3" width="6" height="3" fill="#d4112a"/><circle class="rk-lamp" cx="0" cy="-2" r="2.6" fill="#f3b21b"/></g>';

    // frontier artery at the isthmus (left base) + runway line
    const runway = '<line x1="0" y1="189" x2="56" y2="189" stroke="' + (state.runwayClosed ? '#ff5a5a' : (night ? '#33506f' : '#cfc8bd')) + '" stroke-width="2.5"' +
      (state.runwayClosed ? ' class="rk-runway"' : '') + '/>';
    const frontier = '<g transform="translate(40,189)"><circle class="rk-pulse" cx="0" cy="0" r="5" fill="' + dotColor + '"/>' +
      '<circle cx="0" cy="0" r="2.6" fill="' + dotColor + '"/></g>';

    return '' +
      '<svg class="rock-svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Live view of the Rock of Gibraltar">' +
      '<defs>' +
      '<linearGradient id="rkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient>' +
      '<linearGradient id="rkRock" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="' + rf[0] + '"/><stop offset="1" stop-color="' + rf[1] + '"/></linearGradient>' +
      '<radialGradient id="rkGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="' + (night ? '#9fb6d6' : '#fff3c4') + '" stop-opacity="' + (night ? 0.25 : 0.7) + '"/><stop offset="1" stop-color="' + (night ? '#9fb6d6' : '#fff3c4') + '" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="400" height="220" fill="url(#rkSky)"/>' +
      '<circle cx="' + sunX + '" cy="' + sunY + '" r="60" fill="url(#rkGlow)"/>' + // sun/moon glow
      stars + sun +
      '<rect x="0" y="150" width="400" height="20" fill="#fff" opacity="' + haze + '"/>' + // distance haze band
      levanterCloud +
      '<rect x="0" y="186" width="400" height="40" fill="' + sea + '"/>' +
      '<path d="M0,190 H400" stroke="#fff" stroke-opacity="0.12" stroke-width="6"/>' +
      '<rect x="' + (sunX - 9) + '" y="190" width="18" height="30" fill="#fff" opacity="' + (night ? 0.06 : 0.16) + '"/>' + // water shimmer under sun
      ships +
      '<path d="' + rockPath + '" fill="url(#rkRock)"/>' +
      // limestone strata following the slope
      '<path d="M74,118 C150,92 230,128 332,168" fill="none" stroke="#000" stroke-opacity="0.05" stroke-width="2"/>' +
      '<path d="M88,150 C170,128 250,150 316,176" fill="none" stroke="#000" stroke-opacity="0.045" stroke-width="2"/>' +
      '<path d="' + ridge + '" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="2"/>' +
      cable + lighthouse + runway + frontier +
      '</svg>';
  }

  RW.rock = rock;
  RW.rockPhase = () => phase(new Date().getHours());
})(window.RW);
