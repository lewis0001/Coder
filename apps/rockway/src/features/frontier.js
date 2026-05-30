/* Rockway feature — Frontier (Gibraltar–La Línea border).
 * Honest model: Gibraltar has NO official wait-time feed, only live cameras.
 * So Rockway shows official camera link-outs + community crowd-reports.
 * Research: docs/research/frontier.md */
(function (RW) {
  'use strict';
  const { esc, uid, ref } = RW.util;
  const F = RW.api.frontier;

  // selection state for the report composer (session-only)
  let selLane = 'in-car';
  let selLevel = 'green';

  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60); return h + 'h ago';
  }
  const levelColor = (l) => (l === 'green' ? '#0a9d4a' : l === 'red' ? '#d4112a' : '#e08a00');
  const levelEmoji = (l) => (l === 'green' ? '🟢' : l === 'red' ? '🔴' : '🟠');

  function statusCard() {
    const c = F.community('in-car');
    const co = F.community('out-car');
    function block(label, cm) {
      return '<div style="flex:1"><div class="muted tiny" style="font-weight:700">' + esc(label) + '</div>' +
        '<div style="font-size:22px;font-weight:900;color:' + levelColor(cm.level) + '">' + esc(cm.word) + '</div>' +
        '<div class="muted tiny">' + (cm.fresh ? cm.count + ' report' + (cm.count === 1 ? '' : 's') + ' · ' + ago(cm.t) : 'typical for now') + '</div></div>';
    }
    return '<div class="card" style="display:flex;gap:14px;align-items:flex-start">' + block('Into Gibraltar', c) + '<div style="width:1px;background:var(--mist);align-self:stretch"></div>' + block('To Spain', co) + '</div>';
  }

  function composer() {
    const laneChips = F.lanes.map((l) =>
      '<span class="chip tap' + (selLane === l.id ? ' on brand' : '') + '" data-act="frontierLane" data-v="' + l.id + '">' + l.emoji + ' ' + esc(l.label) + '</span>').join('');
    const levels = [['green', 'Flowing'], ['amber', 'Busy'], ['red', 'Heavy']];
    const levelBtns = levels.map((lv) =>
      '<button class="btn sm" data-act="frontierLevel" data-v="' + lv[0] + '" style="flex:1;background:' + (selLevel === lv[0] ? levelColor(lv[0]) : '#fff') + ';color:' + (selLevel === lv[0] ? '#fff' : 'var(--ink)') + ';box-shadow:inset 0 0 0 1.5px ' + levelColor(lv[0]) + '">' + levelEmoji(lv[0]) + ' ' + lv[1] + '</button>').join('');
    return '<div class="card">' +
      '<div style="font-weight:800;font-size:14px;margin-bottom:8px">How’s the queue right now?</div>' +
      '<div class="chips" style="margin-bottom:10px">' + laneChips + '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' + levelBtns + '</div>' +
      '<input class="input" id="fr-note" placeholder="Optional note (e.g. ‘all lanes open’)" maxlength="80">' +
      '<button class="btn" style="margin-top:10px" data-act="frontierReport">📣 Share report with the Rock</button>' +
      '<div class="muted tiny" style="margin-top:8px">Community-powered. There’s no official live wait-time feed — your report helps everyone.</div></div>';
  }

  function cameras() {
    return '<div class="card">' + F.cameras.map((cam) =>
      '<a class="row" href="' + esc(cam.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;cursor:pointer">' +
      '<div class="lead" style="background:var(--sea-soft)">📷</div><div class="body"><div class="name">' + esc(cam.label) + '</div>' +
      '<div class="sub">Open live camera ↗</div></div><div class="trail muted">›</div></a>').join('') + '</div>';
  }

  function reportsFeed() {
    const reports = (RW.S.frontierReports || []).slice().sort((a, b) => b.t - a.t).slice(0, 8);
    if (!reports.length) return RW.ui.empty('🗣️', 'No community reports yet today.<br>Be the first to share how the Focona is looking.');
    const laneLabel = (id) => { const l = F.lanes.find((x) => x.id === id); return l ? l.label : 'Border'; };
    return '<div class="card">' + reports.map((r) =>
      '<div class="row"><div class="lead" style="background:#fff;font-size:20px">' + levelEmoji(r.level) + '</div>' +
      '<div class="body"><div class="name">' + esc(F.word(r.level)) + ' · ' + esc(laneLabel(r.lane)) + '</div>' +
      '<div class="sub">' + esc(ago(r.t)) + (r.note ? ' · ' + esc(r.note) : '') + '</div></div></div>').join('') + '</div>';
  }

  function chartCard() {
    const now = new Date();
    const bars = [];
    for (let i = 11; i >= 0; i--) {
      const hh = (now.getHours() - i + 24) % 24;
      const lvl = F.typical(hh);
      const h = lvl === 'red' ? 90 : lvl === 'amber' ? 55 : 25;
      bars.push('<div class="bar' + (i === 0 ? ' now' : '') + '" style="height:' + h + '%;background:' + (i === 0 ? 'var(--sea)' : levelColor(lvl) + '55') + '" title="' + hh + ':00"></div>');
    }
    return '<div class="card"><div class="bars">' + bars.join('') + '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ash);margin-top:6px"><span>12h ago</span><span>Now</span></div>' +
      '<div class="muted tiny" style="margin-top:6px">Typical pattern for the time of day — not a live measurement.</div></div>';
  }

  function render() {
    const tips = F.tips.map((t) => '<div class="row" style="padding:9px 0"><div class="lead" style="background:var(--sea-soft)">💡</div><div class="body"><div class="sub" style="color:var(--slate);font-size:13px">' + esc(t) + '</div></div></div>').join('');
    const body =
      '<div class="muted tiny" style="margin-bottom:10px">La Focona · Gibraltar–La Línea · cameras + community reports</div>' +
      statusCard() +
      RW.ui.sectionTitle('Report the queue') + composer() +
      RW.ui.sectionTitle('Live cameras') + cameras() +
      RW.ui.sectionTitle('Recent community reports') + reportsFeed() +
      RW.ui.sectionTitle('Typical by hour') + chartCard() +
      RW.ui.sectionTitle('Crossing tips') + '<div class="card">' + tips + '</div>';
    return RW.ui.screen({ title: 'Frontier — la Focona', body });
  }

  RW.register({
    id: 'frontier', title: 'Frontier', emoji: '🛂', tileBg: '#e6effc', section: 'daily', order: 20,
    tick: 30000, render,
    actions: {
      frontierLane: (el) => { selLane = el.dataset.v; RW.render(); },
      frontierLevel: (el) => { selLevel = el.dataset.v; RW.render(); },
      frontierReport: () => {
        const noteEl = document.getElementById('fr-note');
        const note = noteEl ? noteEl.value.trim().slice(0, 80) : '';
        RW.S.frontierReports = RW.S.frontierReports || [];
        RW.S.frontierReports.push({ id: uid(), t: Date.now(), lane: selLane, level: selLevel, note });
        RW.store.save();
        RW.toast('Thanks — report shared with the Rock 🙌');
        RW.render();
      },
    },
  });
})(window.RW);
