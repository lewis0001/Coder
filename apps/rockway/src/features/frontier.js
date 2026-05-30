/* Rockway feature — Frontier (live Gibraltar–La Línea border wait times).
 * The single most-checked number in Gibraltar daily life.
 * Research: docs/research/frontier.md */
(function (RW) {
  'use strict';
  const { esc } = RW.util;
  const F = RW.api.frontier;

  // Direction filter state: 'both' | 'to_spain' | 'into_gib'
  function getDir() { return RW.S.frontierDir = RW.S.frontierDir || 'both'; }

  // Return pill-status class from level string ('green'|'amber'|'red')
  function levelClass(lvl) {
    return lvl === 'green' ? 'ok' : lvl === 'amber' ? 'warn' : 'danger';
  }

  // Dot HTML matching level
  function dot(lvl) {
    return '<span class="dot ' + lvl + '"></span>';
  }

  // Seconds since last tick — we refresh every 5 s so max staleness = 5 s
  function staleness() {
    return Math.round((Date.now() - (RW.S._frontierTs || Date.now())) / 1000);
  }

  // Contextual flags based on time-of-day / day-of-week
  function contextFlags() {
    const now = new Date();
    const h = now.getHours();
    const day = now.getDay(); // 0=Sun 5=Fri 6=Sat
    const flags = [];

    // EES rollout — always relevant in 2026
    flags.push({ cls: 'info', label: 'EES biometric checks rolling out' });

    // Morning vehicle peak 07:30–09:00
    if (h === 7 || (h === 8 && now.getMinutes() < 30)) {
      flags.push({ cls: 'warn', label: 'Morning vehicle peak (07:30–09:00)' });
    }
    // Evening peak 17:00–18:30
    if (h === 17 || (h === 18 && now.getMinutes() < 30)) {
      flags.push({ cls: 'warn', label: 'Evening peak (17:00–18:30)' });
    }
    // Friday PM pedestrian backlog
    if (day === 5 && h >= 16) {
      flags.push({ cls: 'danger', label: 'Fri PM: pedestrian queues can hit 1h+' });
    }
    // Weekend leisure traffic
    if (day === 0 || day === 6) {
      flags.push({ cls: 'info', label: 'Weekend: heavier leisure traffic' });
    }

    return flags;
  }

  // "Best time to cross" hint — 12-char scan of the day
  function bestTimeHint() {
    const now = new Date();
    const h = now.getHours();
    if (h >= 9 && h < 12) return 'You\'re in a good window — mid-morning is usually calm.';
    if (h >= 12 && h < 14) return 'Lunchtime is typically quiet for pedestrians.';
    if (h >= 14 && h < 17) return 'Early afternoon is usually light. Leave before 17:00.';
    if (h >= 17 && h < 19) return 'Evening peak now. If you can, wait until after 19:00.';
    if (h >= 19 || h < 6) return 'Off-peak hours — crossings are generally quick.';
    if (h === 6 || h === 7) return 'Pre-rush if before 07:30. After 07:30 expect queues.';
    return 'Crossing before 07:00 or after 19:00 is usually fastest.';
  }

  // Build one lane card with rich layout
  function laneCard(lane) {
    const w = F.wait(lane);
    const lvl = F.level(w);
    const cls = levelClass(lvl);
    const isVehicle = lane.id.indexOf('car') > -1;
    const isMoto = lane.id.indexOf('moto') > -1;
    const modeEmoji = isMoto ? '🏍️' : (isVehicle ? '🚗' : '🚶');
    const modeLabel = isMoto ? 'Motorcycle' : (isVehicle ? 'Vehicle' : 'On foot');
    const dirLabel = lane.id.indexOf('in') === 0 ? 'Into Gibraltar' : 'To Spain';
    const dirColor = lane.id.indexOf('out') === 0 ? 'var(--brand)' : 'var(--sea)';
    // sub-note for on-foot vs vehicle
    const note = isVehicle
      ? 'Spanish checks are the main bottleneck leaving Gib'
      : 'Walking is almost always faster than driving';

    return '<div class="card" style="margin-bottom:10px">' +
      // Header row: emoji + names + wait figure
      '<div style="display:flex;align-items:flex-start;gap:12px">' +
        '<div class="venue-emoji" style="font-size:24px;width:48px;height:48px;border-radius:14px;flex:0 0 auto">' + modeEmoji + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:800;font-size:14.5px;color:var(--ink)">' + esc(modeLabel) + '</div>' +
          '<div style="font-size:11.5px;font-weight:700;color:' + dirColor + ';margin-top:1px">' + esc(dirLabel) + '</div>' +
        '</div>' +
        '<div style="text-align:right;flex:0 0 auto">' +
          '<div style="font-size:30px;font-weight:900;line-height:1"><span class="num">' + w + '</span><span style="font-size:13px;font-weight:700;margin-left:2px">min</span></div>' +
          '<div class="pill-status ' + cls + '" style="margin-top:4px;justify-content:flex-end">' + dot(lvl) + F.word(w) + '</div>' +
        '</div>' +
      '</div>' +
      // Note line
      '<div style="font-size:12px;color:var(--ash);margin-top:8px;padding-top:8px;border-top:1px solid var(--mist)">' +
        esc(note) +
      '</div>' +
    '</div>';
  }

  function render() {
    // Stamp tick time on each render so staleness() works
    RW.S._frontierTs = Date.now();

    const dir = getDir();
    const now = new Date();
    const secsAgo = staleness();
    const secsStr = secsAgo < 5 ? 'just now' : secsAgo + 's ago';

    // --- Direction filter chips ---
    const dirChips = RW.ui.chips(
      [
        { label: '↔ Both directions', value: 'both' },
        { label: '→ Into Gibraltar', value: 'into_gib' },
        { label: '← To Spain', value: 'to_spain' },
      ],
      dir,
      'frontierDir',
      true
    );

    // --- Lane cards filtered by direction ---
    const visibleLanes = F.lanes.filter(function (l) {
      if (dir === 'into_gib') return l.id.indexOf('in') === 0;
      if (dir === 'to_spain') return l.id.indexOf('out') === 0;
      return true;
    });

    const laneCards = visibleLanes.map(laneCard).join('');

    // --- Source & freshness line ---
    const freshness =
      '<div class="muted tiny" style="margin-bottom:14px;display:flex;align-items:center;gap:6px">' +
        '<span class="dot green" style="animation:pulse 1.4s infinite;flex:0 0 auto"></span>' +
        '<span>Estimates · updated ' + esc(secsStr) +
        ' · source: <strong>frontierqueue.gi</strong> live cam · not official figures</span>' +
      '</div>';

    // --- Context flags ---
    const flags = contextFlags();
    const flagPills = flags.map(function (f) {
      return '<span class="pill-status ' + f.cls + '" style="margin-right:6px;margin-bottom:6px">' + esc(f.label) + '</span>';
    }).join('');
    const flagsRow = flagPills
      ? '<div style="display:flex;flex-wrap:wrap;margin-bottom:14px">' + flagPills + '</div>'
      : '';

    // --- Best time insight ---
    const hint = bestTimeHint();
    const insightCard =
      '<div class="card" style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">' +
        '<div style="font-size:22px;flex:0 0 auto">⏱️</div>' +
        '<div>' +
          '<div style="font-weight:800;font-size:13.5px;color:var(--ink);margin-bottom:2px">Best time to cross</div>' +
          '<div style="font-size:13px;color:var(--slate)">' + esc(hint) + '</div>' +
        '</div>' +
      '</div>';

    // --- 12-hour bars chart ---
    const bars = [];
    const peakHours = [7, 8, 17, 18]; // rush-hour hours
    for (let i = 11; i >= 0; i--) {
      const hh = (now.getHours() - i + 24) % 24;
      const peak = Math.exp(-Math.pow(hh - 8, 2) / 3) + Math.exp(-Math.pow(hh - 18, 2) / 4);
      const isPeak = peakHours.indexOf(hh) > -1;
      const isNow = i === 0;
      const barColor = isNow ? 'var(--sea)' : (isPeak ? 'var(--brand-soft)' : 'var(--sea-soft)');
      const h = Math.round(12 + peak * 56);
      bars.push(
        '<div class="bar' + (isNow ? ' now' : '') + '"' +
          ' style="height:' + h + '%;background:' + barColor + '"' +
          ' title="' + hh + ':00 — ' + (isPeak ? 'peak' : 'off-peak') + '">' +
        '</div>'
      );
    }

    const chartCard =
      '<div class="card">' +
        '<div class="bars">' + bars.join('') + '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ash);margin-top:6px">' +
          '<span>12h ago</span><span>Now</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:11.5px;color:var(--ash)">' +
          '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--sea);display:inline-block"></span> Now</span>' +
          '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--brand-soft);display:inline-block"></span> Peak hour</span>' +
          '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--sea-soft);display:inline-block"></span> Off-peak</span>' +
        '</div>' +
      '</div>';

    // --- Tips ---
    const tips = F.tips.map(function (t) {
      return '<div class="row" style="padding:9px 0">' +
        '<div class="lead" style="background:var(--sea-soft);width:40px;height:40px;font-size:18px">💡</div>' +
        '<div class="body"><div class="sub" style="color:var(--slate);font-size:13px;line-height:1.45">' + esc(t) + '</div></div>' +
      '</div>';
    }).join('');

    // --- Camera link ---
    const camCard =
      '<div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer" ' +
          'data-act="nav" data-route="#/frontier/cam">' +
        '<div style="font-size:28px;flex:0 0 auto">📷</div>' +
        '<div style="flex:1">' +
          '<div style="font-weight:800;font-size:14px">Live queue camera</div>' +
          '<div style="font-size:12.5px;color:var(--ash);margin-top:2px">frontierqueue.gi · official GBCA feed</div>' +
        '</div>' +
        '<div style="font-size:20px;color:var(--ash)">›</div>' +
      '</div>';

    // --- Treaty notice ---
    const treatyNote =
      '<div class="card" style="border-left:3px solid var(--sea);padding-left:12px">' +
        '<div style="font-weight:800;font-size:12.5px;color:var(--sea);margin-bottom:4px">🏛 Treaty update · 2026</div>' +
        '<div style="font-size:12.5px;color:var(--slate);line-height:1.45">' +
          'Core terms agreed June 2025; treaty text published Feb 2026. ' +
          'Target: <strong>no land border checks</strong> from ~July 2026. EES biometric lanes rolling out now — ' +
          'Gibraltar residents &amp; frontier workers use dedicated lanes.' +
        '</div>' +
      '</div>';

    const body =
      freshness +
      flagsRow +
      dirChips +
      laneCards +
      insightCard +
      RW.ui.sectionTitle('Typical traffic · last 12 hours') +
      chartCard +
      RW.ui.sectionTitle('Crossing tips') +
      '<div class="card">' + tips + '</div>' +
      RW.ui.sectionTitle('Live camera') +
      camCard +
      RW.ui.sectionTitle('Border updates') +
      treatyNote;

    return RW.ui.screen({ title: 'Frontier — live', body });
  }

  RW.register({
    id: 'frontier',
    title: 'Frontier',
    emoji: '🛂',
    tileBg: '#e6effc',
    section: 'daily',
    order: 40,
    tick: 5000,
    render,
    actions: {
      frontierDir: function (el) {
        RW.S.frontierDir = el.dataset.v || 'both';
        RW.render();
      },
    },
  });
})(window.RW);
