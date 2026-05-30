/* Rockway feature — Frontier (live Gibraltar–La Línea border wait times).
 * The single most-checked number in Gibraltar daily life. */
(function (RW) {
  'use strict';
  const { esc } = RW.util;
  const F = RW.api.frontier;

  function render() {
    const lanes = F.lanes.map((l) => {
      const w = F.wait(l); const lvl = F.level(w);
      return '<div class="card" style="display:flex;align-items:center;gap:12px">' +
        '<div class="venue-emoji">' + l.emoji + '</div>' +
        '<div style="flex:1"><div style="font-weight:700;font-size:14px">' + esc(l.label) + '</div>' +
        '<div class="pill-status ' + (lvl === 'green' ? 'ok' : 'warn') + '" style="margin-top:6px"><span class="dot ' + lvl + '"></span>' + F.word(w) + '</div></div>' +
        '<div style="text-align:right"><div style="font-size:26px;font-weight:900">' + w + '<span style="font-size:13px;font-weight:700"> min</span></div></div></div>';
    }).join('');
    const now = new Date();
    const bars = [];
    for (let i = 11; i >= 0; i--) {
      const hh = (now.getHours() - i + 24) % 24;
      const peak = Math.exp(-Math.pow(hh - 8, 2) / 3) + Math.exp(-Math.pow(hh - 18, 2) / 4);
      bars.push('<div class="bar' + (i === 0 ? ' now' : '') + '" style="height:' + Math.round(18 + peak * 50) + '%" title="' + hh + ':00"></div>');
    }
    const tips = F.tips.map((t) => '<div class="row" style="padding:9px 0"><div class="lead" style="background:var(--sea-soft)">💡</div><div class="body"><div class="sub" style="color:var(--slate);font-size:13px">' + esc(t) + '</div></div></div>').join('');
    const body =
      '<div class="muted tiny" style="margin-bottom:10px">Gibraltar–La Línea border · estimates refresh live <span class="dot green" style="animation:pulse 1.4s infinite"></span></div>' +
      lanes +
      RW.ui.sectionTitle('Typical wait · last 12 hours') +
      '<div class="card"><div class="bars">' + bars.join('') + '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ash);margin-top:6px"><span>12h ago</span><span>Now</span></div></div>' +
      RW.ui.sectionTitle('Crossing tips') + '<div class="card">' + tips + '</div>';
    return RW.ui.screen({ title: 'Frontier — live', body });
  }

  RW.register({
    id: 'frontier', title: 'Frontier', emoji: '🛂', tileBg: '#e6effc', section: 'daily', order: 40,
    tick: 5000, render,
  });
})(window.RW);
