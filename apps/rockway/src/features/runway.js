/* Rockway feature — Runway (runway-crossing countdown for people on foot & bikes).
 * Since the Kingsway tunnel opened (31 March 2023) road traffic no longer
 * crosses the runway — the historic Winston Churchill Avenue level crossing
 * now serves PEDESTRIANS and CYCLISTS, and it still closes around every
 * aircraft movement. Rockway turns the airport’s published schedule into
 * estimated closed windows (movement −10 min … +5 min, merged when they
 * overlap) and exposes RW.api.runway for the Rock hero.
 * Live source: RW.live.get('flights') ← gibraltarairport.gi (7–8 day schedule).
 * Research: docs/review/live-data.md §2 · docs/research/transport.md */
(function (RW) {
  'use strict';
  const { esc, fmtDate } = RW.util;

  /* ---------------- Gibraltar clock helpers ---------------- */
  function gibToday() {
    try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Gibraltar' }); }
    catch (e) { return new Date().toLocaleDateString('sv-SE'); }
  }
  function gibTomorrow() {
    const p = gibToday().split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1, 12)).toISOString().slice(0, 10);
  }
  function gibNowMin() {
    try {
      const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Gibraltar', hour12: false });
      const p = t.split(':');
      return (parseInt(p[0], 10) % 24) * 60 + parseInt(p[1], 10);
    } catch (e) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  }
  function parseHM(s) {
    const m = /(\d{1,2}):(\d{2})/.exec(String(s || ''));
    return m ? (parseInt(m[1], 10) % 24) * 60 + parseInt(m[2], 10) : null;
  }
  function hhmm(min) {
    min = Math.max(0, Math.min(1439, Math.round(min)));
    const h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /* ---------------- closure model (estimate) ----------------
   * The crossing closes around each movement: best-known time (Expected over
   * Sched) minus CLOSE_BEFORE to plus CLOSE_AFTER minutes. Cancelled flights
   * are skipped; overlapping windows merge. Labelled an estimate in the UI. */
  const CLOSE_BEFORE = 10, CLOSE_AFTER = 5;

  function norm(r, kind) {
    const tExp = parseHM(r.expected), tSched = parseHM(r.sched);
    return {
      kind,
      flight: r.flight || '', place: r.place || '',
      sched: r.sched || '', expected: r.expected || '', status: r.status || '',
      cancelled: /cancel/i.test(r.status || ''),
      t: tExp != null ? tExp : tSched,
      tSched,
    };
  }
  function movementsFor(day) {
    if (!day) return [];
    const out = [];
    (day.arrivals || []).forEach((r) => out.push(norm(r, 'arrival')));
    (day.departures || []).forEach((r) => out.push(norm(r, 'departure')));
    out.sort((a, b) => (a.t == null ? 1441 : a.t) - (b.t == null ? 1441 : b.t));
    return out;
  }
  function windowsFor(movements) {
    const wins = [];
    movements
      .filter((m) => !m.cancelled && m.t != null)
      .slice().sort((a, b) => a.t - b.t)
      .forEach((m) => {
        const s = m.t - CLOSE_BEFORE, e = m.t + CLOSE_AFTER;
        const last = wins[wins.length - 1];
        if (last && s <= last.end) { last.end = Math.max(last.end, e); last.moves.push(m); }
        else { wins.push({ start: s, end: e, moves: [m] }); }
      });
    return wins;
  }

  function liveDay(date) {
    const f = RW.live.get('flights');
    if (!f || !f.days) return null;
    return f.days.find((d) => d.date === date) || null;
  }
  // null → no live data at all; [] → live, but nothing scheduled today
  function todayWindows() {
    const f = RW.live.get('flights');
    if (!f || !f.days) return null;
    return windowsFor(movementsFor(liveDay(gibToday())));
  }

  /* -------- public API — the Rock hero SVG consumes closedNow() -------- */
  function closedNow() {
    const wins = todayWindows();
    if (!wins) return false;
    const n = gibNowMin();
    return wins.some((w) => w.start <= n && n <= w.end);
  }
  function next() {
    const wins = todayWindows();
    if (!wins) return null;
    const n = gibNowMin();
    const w = wins.find((x) => x.start > n);
    if (!w) return null;
    const m = w.moves[0];
    return { start: hhmm(w.start), flight: m.flight, place: m.place, kind: m.kind, minsUntil: w.start - n };
  }
  RW.api = RW.api || {};
  RW.api.runway = { closedNow, next };

  /* ---------------- example schedule (offline fallback) ----------------
   * A real typical day at GIB (~8 movements; verified in live-data review). */
  const EXAMPLE_DAY = {
    date: 'example',
    arrivals: [
      { place: 'Manchester', flight: 'EZY2267', sched: '10:10', status: 'Scheduled', expected: '' },
      { place: 'London Heathrow', flight: 'BA490', sched: '11:10', status: 'Scheduled', expected: '' },
      { place: 'London Heathrow', flight: 'BA492', sched: '14:55', status: 'Scheduled', expected: '' },
      { place: 'London Gatwick', flight: 'EZY8793', sched: '20:30', status: 'Scheduled', expected: '' },
    ],
    departures: [
      { place: 'Manchester', flight: 'EZY2268', sched: '10:50', status: 'Scheduled', expected: '' },
      { place: 'London Heathrow', flight: 'BA491', sched: '12:05', status: 'Scheduled', expected: '' },
      { place: 'London Heathrow', flight: 'BA493', sched: '15:45', status: 'Scheduled', expected: '' },
      { place: 'London Gatwick', flight: 'EZY8794', sched: '21:05', status: 'Scheduled', expected: '' },
    ],
  };

  /* ---------------- view helpers ---------------- */
  let tomorrowOpen = false; // session-only collapse state for the preview

  const flightLine = (m) =>
    m.flight + (m.kind === 'arrival' ? ' arriving from ' : ' departing to ') + m.place;

  function pillClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.indexOf('cancel') > -1) return 'danger';
    if (s.indexOf('delay') > -1) return 'warn';
    if (s.indexOf('land') > -1 || s.indexOf('depart') > -1 || s.indexOf('airborne') > -1) return 'ok';
    return 'neutral';
  }

  function signalHead(color, badge) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div style="display:flex;align-items:center;gap:7px">' +
      '<span class="dot" style="background:' + color + '"></span>' +
      '<span class="tiny" style="font-weight:800;letter-spacing:.07em;color:var(--ash)">PEDESTRIAN &amp; CYCLE CROSSING</span></div>' +
      (badge || '') + '</div>';
  }

  // Status hero: closed → CROSSING CLOSED + reopen time; open → countdown.
  function heroCard(wins) {
    const n = gibNowMin();
    const cur = wins.find((w) => w.start <= n && n <= w.end);
    if (cur) {
      const m = cur.moves[0];
      return '<div class="card">' + signalHead('var(--brand)') +
        '<div class="display" style="font-size:26px;font-weight:600;letter-spacing:.045em;color:var(--brand);margin:7px 0 6px">CROSSING CLOSED</div>' +
        '<div style="font-size:13.5px;color:var(--slate);line-height:1.5">Reopens ~<b class="num">' + hhmm(cur.end) + '</b> · ' + esc(flightLine(m)) + '</div>' +
        '</div>';
    }
    const w = wins.find((x) => x.start > n);
    if (w) {
      const m = w.moves[0];
      return '<div class="card">' + signalHead('var(--green)') +
        '<div class="display" style="font-size:26px;font-weight:600;margin:7px 0 6px">Crossing open</div>' +
        '<div style="font-size:13.5px;color:var(--slate);line-height:1.55">Next closure in ' +
        '<span class="num display" style="font-size:21px;font-weight:600;color:var(--ink)">~' + (w.start - n) + ' min</span>' +
        ' · <b class="num">' + hhmm(w.start) + '</b> — ' + esc(flightLine(m)) + '</div></div>';
    }
    return '<div class="card">' + signalHead('var(--green)') +
      '<div class="display" style="font-size:26px;font-weight:600;margin:7px 0 6px">Crossing open</div>' +
      '<div style="font-size:13.5px;color:var(--slate)">Open for the rest of today — no further aircraft movements scheduled.</div></div>';
  }

  function exampleHero() {
    return '<div class="card">' +
      signalHead('var(--fog)', '<span class="pill-status warn">Example — offline</span>') +
      '<div class="display" style="font-size:26px;font-weight:600;margin:7px 0 6px">No live signal</div>' +
      '<div style="font-size:13.5px;color:var(--slate);line-height:1.5">The live schedule from gibraltarairport.gi is unreachable, so this screen shows a typical day at Gibraltar International — not today’s flights.</div></div>';
  }

  /* Day strip: a precise 06:00–23:00 timeline — hairline base, hour ticks,
   * red closure bands, a now-marker and staggered flight-code labels. */
  function stripSVG(wins, nowMin) {
    const W = 360, H = 60, L = 12, R = 12, T0 = 6 * 60, T1 = 23 * 60;
    const X = (m) => L + (Math.max(T0, Math.min(T1, m)) - T0) * (W - L - R) / (T1 - T0);
    let s = '';
    // hour ticks + axis labels (every 3 h, plus the 23:00 end)
    for (let h = 6; h <= 23; h++) {
      const x = X(h * 60).toFixed(1);
      s += '<line x1="' + x + '" y1="14" x2="' + x + '" y2="18" stroke="var(--mist)" stroke-width="1"/>';
      if (h % 3 === 0 || h === 23) {
        s += '<text x="' + x + '" y="9.5" text-anchor="middle" font-size="6.5" class="num" fill="var(--fog)">' +
          (h < 10 ? '0' + h : h) + ':00</text>';
      }
    }
    // hairline base
    s += '<line x1="' + L + '" y1="21" x2="' + (W - R) + '" y2="21" stroke="var(--mist)" stroke-width="1"/>';
    // closure bands + flight codes beneath (3 staggered label rows)
    wins.forEach((w, i) => {
      const x0 = X(w.start), bw = Math.max(2.5, X(w.end) - x0);
      s += '<rect x="' + x0.toFixed(1) + '" y="17.5" width="' + bw.toFixed(1) + '" height="7" rx="2" fill="var(--brand)"/>';
      const cx = x0 + bw / 2;
      const ly = [37, 46, 55][i % 3];
      const lx = Math.max(L + 16, Math.min(W - R - 16, cx));
      s += '<line x1="' + cx.toFixed(1) + '" y1="24.5" x2="' + lx.toFixed(1) + '" y2="' + (ly - 6.5) + '" stroke="var(--mist)" stroke-width="0.75"/>';
      const label = (w.moves[0].flight || '—') + (w.moves.length > 1 ? ' +' + (w.moves.length - 1) : '');
      s += '<text x="' + lx.toFixed(1) + '" y="' + ly + '" text-anchor="middle" font-size="7" font-weight="700" fill="var(--slate)">' + esc(label) + '</text>';
    });
    // now-marker
    if (nowMin != null && nowMin >= T0 && nowMin <= T1) {
      const nx = X(nowMin).toFixed(1);
      s += '<line x1="' + nx + '" y1="12.5" x2="' + nx + '" y2="56" stroke="var(--sea)" stroke-width="1.4"/>' +
        '<circle cx="' + nx + '" cy="12.5" r="2.1" fill="var(--sea)"/>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block" role="img" ' +
      'aria-label="Runway crossing closures between 06:00 and 23:00">' + s + '</svg>';
  }

  function stripCard(wins, isExample) {
    const legend =
      '<div class="muted tiny" style="margin-top:8px;display:flex;gap:14px;align-items:center">' +
      '<span><span style="display:inline-block;width:11px;height:5px;border-radius:2px;background:var(--brand);margin-right:5px;vertical-align:1px"></span>closed (estimate)</span>' +
      '<span><span style="display:inline-block;width:2px;height:10px;background:var(--sea);margin-right:5px;vertical-align:-1px"></span>now</span>' +
      '<span style="margin-left:auto;font-weight:700">' + (isExample ? 'Example day' : 'Gibraltar time') + '</span></div>';
    const none = (!wins.length && !isExample)
      ? '<div class="muted tiny" style="margin-top:6px">No closures expected today — nothing in the schedule.</div>' : '';
    return '<div class="card">' + stripSVG(wins, gibNowMin()) + legend + none + '</div>';
  }

  function moveRow(m, n) {
    const past = m.t != null && m.t + CLOSE_AFTER < n;
    const expDiff = !m.cancelled && parseHM(m.expected) != null && parseHM(m.expected) !== m.tSched;
    return '<div class="row"' + ((past || m.cancelled) ? ' style="opacity:.55"' : '') + '>' +
      '<div class="lead" style="background:var(--gold-soft);font-size:20px">' + (m.kind === 'arrival' ? '🛬' : '🛫') + '</div>' +
      '<div class="body"><div class="name"><span class="num">' + esc(m.sched) + '</span> · ' + esc(m.flight) + '</div>' +
      '<div class="sub">' + (m.kind === 'arrival' ? 'Arriving from ' : 'Departing to ') + esc(m.place) +
      (expDiff ? ' · expected <span class="num" style="color:var(--amber);font-weight:700">' + esc(m.expected) + '</span>' : '') +
      '</div></div>' +
      '<div class="trail"><span class="pill-status ' + pillClass(m.status) + '">' + esc(m.status || 'Scheduled') + '</span></div></div>';
  }

  // Tomorrow preview — collapsed by default, expands in place.
  function tomorrowCard(day) {
    if (!day) return '';
    const mvs = movementsFor(day);
    if (!mvs.length) return '';
    const wins = windowsFor(mvs);
    const first = mvs.find((m) => m.t != null);
    const head = '<div style="display:flex;align-items:center;gap:8px;cursor:pointer" data-act="runwayTomorrow">' +
      '<div style="flex:1"><div style="font-weight:800;font-size:14px">Tomorrow · ' + esc(fmtDate(day.date)) + '</div>' +
      '<div class="muted tiny"><span class="num">' + mvs.length + '</span> movements · <span class="num">' + wins.length + '</span> est. closures' +
      (first ? ' · first ~<span class="num">' + hhmm(first.t - CLOSE_BEFORE) + '</span>' : '') + '</div></div>' +
      '<div class="muted" style="font-size:16px">' + (tomorrowOpen ? '▾' : '▸') + '</div></div>';
    const rows = tomorrowOpen
      ? '<div style="margin-top:10px;border-top:1px solid var(--mist)">' + mvs.map((m) =>
          '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--mist);font-size:13px">' +
          '<span class="num" style="font-weight:700;width:42px">' + esc(m.sched) + '</span>' +
          '<span>' + (m.kind === 'arrival' ? '🛬' : '🛫') + '</span>' +
          '<span style="font-weight:700">' + esc(m.flight) + '</span>' +
          '<span class="muted" style="flex:1;text-align:right">' + esc(m.place) + '</span></div>').join('') + '</div>'
      : '';
    return RW.ui.sectionTitle('Tomorrow') + '<div class="card">' + head + rows + '</div>';
  }

  function contextCard(mode) {
    const age = RW.live.ageMin('flights');
    const src = mode === 'live'
      ? 'Live schedule · gibraltarairport.gi' + (age != null ? ' · <span class="num">' + age + 'm</span> ago' : '')
      : 'Example schedule — offline · gibraltarairport.gi unavailable';
    return '<div class="card">' +
      '<div class="row" style="padding:9px 0"><div class="lead" style="background:var(--sea-soft)">🚶</div>' +
      '<div class="body"><div class="sub" style="color:var(--slate);font-size:13px">Winston Churchill Avenue traffic uses the Kingsway tunnel — this crossing is for people on foot and bikes.</div></div></div>' +
      '<div class="row" style="padding:9px 0"><div class="lead" style="background:var(--sea-soft)">⏱️</div>' +
      '<div class="body"><div class="sub" style="color:var(--slate);font-size:13px">Closed windows are Rockway estimates — roughly <span class="num">' + CLOSE_BEFORE + '</span> minutes before to <span class="num">' + CLOSE_AFTER + '</span> minutes after each movement. Always follow the barriers and signals at the crossing.</div></div></div>' +
      '<div class="muted tiny" style="margin-top:8px">' + src + '</div></div>';
  }

  function skeletons() {
    const rowSkel = '<div class="row"><div class="lead skel"></div><div class="body">' +
      '<div class="skel" style="height:13px;width:52%;margin-bottom:7px"></div>' +
      '<div class="skel" style="height:11px;width:74%"></div></div>' +
      '<div class="skel" style="height:22px;width:70px;border-radius:999px"></div></div>';
    return '<div class="card">' +
      '<div class="skel" style="height:10px;width:46%;margin-bottom:12px"></div>' +
      '<div class="skel" style="height:28px;width:62%;margin-bottom:9px"></div>' +
      '<div class="skel" style="height:13px;width:84%"></div></div>' +
      RW.ui.sectionTitle('Today at the crossing') +
      '<div class="card"><div class="skel" style="height:60px"></div>' +
      '<div class="skel" style="height:10px;width:42%;margin-top:9px"></div></div>' +
      RW.ui.sectionTitle('Today’s movements') +
      '<div class="card">' + rowSkel + rowSkel + rowSkel + '</div>';
  }

  /* ---------------- screen ---------------- */
  function render() {
    const f = RW.live.get('flights');
    const intro = '<div class="muted tiny" style="margin-bottom:10px">Winston Churchill Avenue level crossing · on foot &amp; by bike · Gibraltar International (GIB)</div>';

    if (!f && RW.live.status('flights') === 'loading') {
      return RW.ui.screen({ title: 'Runway', body: intro + skeletons() });
    }

    let body;
    if (f && f.days) {
      const n = gibNowMin();
      const mvs = movementsFor(liveDay(gibToday()));
      const wins = windowsFor(mvs);
      body = intro + heroCard(wins) +
        RW.ui.sectionTitle('Today at the crossing') + stripCard(wins, false) +
        RW.ui.sectionTitle('Today’s movements') +
        (mvs.length
          ? '<div class="card">' + mvs.map((m) => moveRow(m, n)).join('') + '</div>'
          : RW.ui.empty('🛫', 'No scheduled movements today — the crossing stays open.')) +
        tomorrowCard(liveDay(gibTomorrow())) +
        RW.ui.sectionTitle('Good to know') + contextCard('live');
    } else {
      const n = gibNowMin();
      const mvs = movementsFor(EXAMPLE_DAY);
      const wins = windowsFor(mvs);
      body = intro + exampleHero() +
        RW.ui.sectionTitle('A typical day at the crossing') + stripCard(wins, true) +
        RW.ui.sectionTitle('Example movements') +
        '<div class="card">' + mvs.map((m) => moveRow(m, n)).join('') + '</div>' +
        RW.ui.sectionTitle('Good to know') + contextCard('example');
    }
    return RW.ui.screen({ title: 'Runway', body });
  }

  /* ---------------- home card (live data only, ≤90 min out) ---------------- */
  function homeCard() {
    const wins = todayWindows();
    if (!wins || !wins.length) return '';
    const n = gibNowMin();
    const cur = wins.find((w) => w.start <= n && n <= w.end);
    if (cur) {
      const m = cur.moves[0];
      return '<div class="card row" data-act="nav" data-route="#/runway" style="cursor:pointer">' +
        '<div class="lead" style="background:var(--gold-soft)">🛬</div>' +
        '<div class="body"><div class="name">Runway crossing closed · reopens ~<span class="num">' + hhmm(cur.end) + '</span></div>' +
        '<div class="sub">' + esc(flightLine(m)) + ' · foot &amp; bike crossing</div></div>' +
        '<div class="trail"><span class="pill-status danger">Closed</span></div></div>';
    }
    const w = wins.find((x) => x.start > n);
    if (!w || w.start - n > 90) return '';
    const m = w.moves[0];
    return '<div class="card row" data-act="nav" data-route="#/runway" style="cursor:pointer">' +
      '<div class="lead" style="background:var(--gold-soft)">🛬</div>' +
      '<div class="body"><div class="name">Runway crossing closes ~<span class="num">' + hhmm(w.start) + '</span></div>' +
      '<div class="sub">' + esc(m.flight) + (m.kind === 'arrival' ? ' arriving from ' : ' departing to ') + esc(m.place) +
      ' · in ~<span class="num">' + (w.start - n) + '</span> min</div></div>' +
      '<div class="trail muted">›</div></div>';
  }

  RW.register({
    id: 'runway',
    title: 'Runway',
    emoji: '🛬',
    tileBg: '#fff4d6',
    section: 'daily',
    order: 25,
    render,
    homeCard,
    homeOrder: 8,
    tick: 30000, // keep the countdown honest while the screen is open
    actions: {
      runwayTomorrow: () => { tomorrowOpen = !tomorrowOpen; RW.render(); },
    },
  });
})(window.RW);
