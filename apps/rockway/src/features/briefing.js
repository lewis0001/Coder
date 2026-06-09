/* Rockway feature — Today on the Rock (composed morning briefing).
 * One editorial home card + #/today screen: date & weather, GI/ES holidays,
 * duty pharmacy tonight, runway crossing, matchday, next event, Chronicle
 * headlines. Every source is optional — sections that fail simply vanish. */
(function (RW) {
  'use strict';
  const { esc, fmtDate } = RW.util;

  // ---------- safe RW.live access (core may be absent in odd harnesses) ----------
  function live(name) { try { return RW.live ? RW.live.get(name) : null; } catch (e) { return null; } }
  function liveSt(name) { try { return RW.live ? RW.live.status(name) : 'fail'; } catch (e) { return 'fail'; } }
  function liveAge(name) { try { return RW.live && RW.live.ageMin ? RW.live.ageMin(name) : null; } catch (e) { return null; } }

  // ---------- Gibraltar-local date helpers ----------
  function gibToday() {
    try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Gibraltar' }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function gibDisplayDate() {
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    try { return new Date().toLocaleDateString('en-GB', Object.assign({ timeZone: 'Europe/Gibraltar' }, opts)); }
    catch (e) { return new Date().toLocaleDateString('en-GB', opts); }
  }
  function gibWeekday() {
    try { return new Date().toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/Gibraltar' }); }
    catch (e) { return new Date().toLocaleDateString('en-GB', { weekday: 'short' }); }
  }
  function addDaysIso(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysFromToday(iso) {
    return Math.round((new Date(iso + 'T12:00:00') - new Date(gibToday() + 'T12:00:00')) / 86400000);
  }
  function niceDate(iso) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? fmtDate(iso) : String(iso || '');
  }
  function fmtAge(min) {
    if (min == null) return '';
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    return Math.round(min / 60) + 'h ago';
  }
  function relNews(dstr) {
    if (!dstr) return '';
    const ms = Date.parse(dstr);
    if (isNaN(ms)) return '';
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : d + 'd ago';
  }
  function safeHref(u) {
    u = String(u || '');
    return /^https?:\/\//i.test(u) ? u : '';
  }

  // ---------- source accessors (every one may be missing/null) ----------
  function wx() {
    let w = null;
    try { w = RW.api && RW.api.weather ? RW.api.weather() : null; } catch (e) {}
    return w || {};
  }

  function holidays() {
    const p = live('holidays');
    const out = { st: liveSt('holidays'), giToday: null, giTomorrow: null, esToday: null, nextGi: null };
    if (!p || !p.ok) return out;
    const today = gibToday(), tomorrow = addDaysIso(today, 1);
    const gi = Array.isArray(p.gi) ? p.gi : [];
    const es = Array.isArray(p.es) ? p.es : [];
    const at = (list, d) => list.find((h) => h && h.date === d) || null;
    out.giToday = at(gi, today);
    out.giTomorrow = at(gi, tomorrow);
    out.esToday = at(es, today);
    out.nextGi = gi.filter((h) => h && typeof h.date === 'string' && h.date > today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
    return out;
  }

  function pharmacy(isGiHoliday) {
    const p = live('pharmacy');
    const st = liveSt('pharmacy');
    if (!p || !p.ok || !p.name) return { st, p: null, tonight: '' };
    const wd = gibWeekday();
    const weekend = wd === 'Sat' || wd === 'Sun' || !!isGiHoliday;
    const tonight = (weekend ? p.hoursWeekend : p.hoursWeekday) || p.hoursWeekday || p.hoursWeekend || '';
    return { st, p, tonight };
  }

  // RW.api.runway is another module's (optional) API — normalise defensively.
  function runwayState() {
    const R = RW.api && RW.api.runway;
    if (!R) return null;
    let closed = false, nx = null;
    try { if (typeof R.closedNow === 'function') closed = !!R.closedNow(); } catch (e) {}
    try { if (typeof R.next === 'function') nx = R.next(); } catch (e) {}
    let ms = null, timeStr = '', flight = '';
    if (nx && typeof nx === 'object') {
      const msKeys = ['t', 'at', 'ts', 'start', 'when', 'closeAt', 'time'];
      for (let i = 0; i < msKeys.length; i++) {
        const v = nx[msKeys[i]];
        if (typeof v === 'number' && v > 1e12) { ms = v; break; }
      }
      const strKeys = ['time', 'sched', 'at', 'label'];
      for (let i = 0; i < strKeys.length; i++) {
        const v = nx[strKeys[i]];
        if (typeof v === 'string' && /\d{1,2}:\d{2}/.test(v)) { timeStr = (v.match(/\d{1,2}:\d{2}/) || [''])[0]; break; }
      }
      flight = String(nx.flight || nx.flightNo || nx.callsign || nx.title || nx.name || '');
      if (ms && !timeStr) {
        try { timeStr = new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Gibraltar' }); }
        catch (e) { timeStr = new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
      }
    }
    const mins = ms != null ? Math.round((ms - Date.now()) / 60000) : null;
    if (!closed && !timeStr && mins == null) return null;
    return { closed, mins, time: timeStr, flight };
  }

  function fixtureSoon() {
    const p = live('fixtures');
    const st = liveSt('fixtures');
    if (!p || !p.ok || !Array.isArray(p.events) || !p.events.length) return { st, match: null };
    const today = gibToday(), limit = addDaysIso(today, 7);
    const match = p.events
      .filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && e.date >= today && e.date <= limit)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
    return { st, match };
  }

  function eventSoon() {
    try {
      if (!RW.api || typeof RW.api.nextEvent !== 'function') return null;
      const e = RW.api.nextEvent();
      if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) return null;
      const today = gibToday();
      if (e.date < today || e.date > addDaysIso(today, 3)) return null;
      return e;
    } catch (e) { return null; }
  }

  function chronicle() {
    const p = live('news');
    const st = liveSt('news');
    const items = p && p.ok && Array.isArray(p.items) ? p.items.filter((i) => i && i.title).slice(0, 3) : [];
    return { st, items: items.length ? items : null };
  }

  // ---------- shared HTML bits ----------
  // Tight briefing row: hairline separator above, never a nested card.
  function brfRow(glyph, html) {
    return '<div style="display:flex;align-items:center;gap:9px;margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">' +
      '<span style="font-size:15px;line-height:1;flex:0 0 auto">' + glyph + '</span>' +
      '<span style="flex:1;min-width:0;font-size:13px;line-height:1.4;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + html + '</span></div>';
  }

  // Detail row for the #/today screen (reuses .row hairline styling).
  function dRow(lead, nameHtml, subHtml, route, trail) {
    return '<div class="row"' + (route ? ' data-act="nav" data-route="' + route + '" style="cursor:pointer"' : '') + '>' +
      '<div class="lead">' + lead + '</div>' +
      '<div class="body"><div class="name">' + nameHtml + '</div>' +
      (subHtml ? '<div class="sub">' + subHtml + '</div>' : '') + '</div>' +
      (trail ? '<div class="trail" style="color:var(--fog)">' + trail + '</div>' : '') + '</div>';
  }

  // Source + freshness footnote ("Holidays · Nager.Date · 2h ago").
  function foot(label, liveName, cachedNote) {
    const age = liveName ? liveAge(liveName) : null;
    const fresh = age != null ? fmtAge(age) : (cachedNote || '');
    return '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:11px;color:var(--fog)">' +
      esc(label + (fresh ? ' · ' + fresh : '')) + '</div>';
  }

  function skelSection(title, lines) {
    let inner = '';
    for (let i = 0; i < lines; i++) {
      inner += '<div class="skel" style="height:13px;margin:' + (i ? '12px' : '4px') + ' 0 4px;width:' + (i % 2 ? 52 : 78) + '%">&nbsp;</div>';
    }
    return RW.ui.sectionTitle(title) + '<div class="card">' + inner + '</div>';
  }

  // ---------- home card: THE composed editorial surface ----------
  function homeCard() {
    const w = wx();
    const H = holidays();
    const PH = pharmacy(!!H.giToday);
    const RWY = runwayState();
    const FX = fixtureSoon();
    const EV = eventSoon();

    const rows = [];
    if (H.giToday) {
      rows.push(brfRow('🇬🇮', '<b>' + esc(H.giToday.name) + '</b> — banks closed'));
    } else if (H.giTomorrow) {
      rows.push(brfRow('🇬🇮', '<b>' + esc(H.giTomorrow.name) + '</b> tomorrow — banks closed'));
    }
    if (H.esToday) {
      rows.push(brfRow('🇪🇸', 'Holiday across the border — quieter exit queues, busier beaches'));
    }
    if (PH.p) {
      rows.push(brfRow('💊', 'Tonight ' + (PH.tonight ? '<span class="num">' + esc(PH.tonight) + '</span> · ' : '') +
        '<b>' + esc(PH.p.name) + '</b>' + (PH.p.address ? ', ' + esc(PH.p.address) : '')));
    }
    // Runway: defer to the runway feature's own home card when it has one.
    const runwayFeat = RW.getFeature && RW.getFeature('runway');
    if (RWY && !(runwayFeat && typeof runwayFeat.homeCard === 'function')) {
      if (RWY.closed) {
        rows.push(brfRow('✈️', '<span style="color:var(--brand);font-weight:800">Crossing closed now</span> — aircraft movement'));
      } else if (RWY.mins != null && RWY.mins >= 0 && RWY.mins <= 120) {
        rows.push(brfRow('✈️', 'Runway crossing closes ' +
          (RWY.time ? '~<span class="num">' + esc(RWY.time) + '</span>' : 'in ~<span class="num">' + RWY.mins + '</span> min') +
          (RWY.flight ? ' · ' + esc(RWY.flight) : '')));
      }
    }
    if (FX.match) {
      const m = FX.match;
      const title = m.home && m.away ? m.home + ' vs ' + m.away : (m.name || 'Gibraltar matchday');
      rows.push(brfRow('⚽', '<b>' + esc(title) + '</b> · <span class="num">' + esc(niceDate(m.date)) + '</span>' +
        (m.venue ? ' · ' + esc(m.venue) : '')));
    }
    if (EV) {
      rows.push(brfRow(EV.emoji || '🎉', '<b>' + esc(EV.name) + '</b> · <span class="num">' + esc(niceDate(EV.date)) + '</span>' +
        (EV.venue ? ' · ' + esc(EV.venue) : '')));
    }

    const anyLoading = H.st === 'loading' || PH.st === 'loading' || FX.st === 'loading';
    let bodyRows;
    if (rows.length) {
      bodyRows = rows.slice(0, 4).join('');
    } else if (anyLoading) {
      bodyRows = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">' +
        '<div class="skel" style="height:13px;width:72%">&nbsp;</div></div>';
    } else {
      bodyRows = brfRow('🪨', '<span style="color:var(--ash)">All calm on the Rock today.</span>');
    }

    const temp = w.tempC != null ? esc(String(w.tempC)) + '°' : '';
    return '<div class="card" data-act="nav" data-route="#/today" style="cursor:pointer">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
      '<span style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ash)">Today on the Rock</span>' +
      '<span style="font-size:13px;font-weight:700;color:var(--fog)">›</span></div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding-bottom:8px">' +
      '<div class="display" style="font-size:20px;font-weight:600;line-height:1.15">' + esc(gibDisplayDate()) + '</div>' +
      '<div style="flex:0 0 auto;font-size:13.5px;font-weight:700;white-space:nowrap">' + (w.emoji || '🌥️') +
      (temp ? ' <span class="num">' + temp + '</span>' : '') + '</div></div>' +
      bodyRows + '</div>';
  }

  // ---------- #/today screen ----------
  function headerCard(w) {
    const temp = w.tempC != null ? esc(String(w.tempC)) : '–';
    const cond = w.condition ? esc(String(w.condition)) : '';
    const hl = w.high != null && w.low != null
      ? 'H <span class="num">' + esc(String(w.high)) + '°</span> · L <span class="num">' + esc(String(w.low)) + '°</span>' : '';
    const wind = w.windKt != null
      ? 'Wind <span class="num">' + esc(String(w.windKt)) + ' kt</span>' + (w.windDir ? ' ' + esc(String(w.windDir)) : '') : '';
    const right = [hl, wind].filter(Boolean).join('<br>');
    const hasWeatherFeature = !!(RW.getFeature && RW.getFeature('weather'));
    const wFoot = hasWeatherFeature
      ? foot('Weather · Open-Meteo', 'weather', 'updates every 15 min')
      : foot('Weather · typical Rock conditions — live feed offline', null, '');
    return '<div class="card" style="margin-top:14px">' +
      '<div class="display" style="font-size:24px;font-weight:600;line-height:1.15">' + esc(gibDisplayDate()) + '</div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-top:12px">' +
      '<div style="font-size:34px;line-height:1">' + (w.emoji || '🌥️') + '</div>' +
      '<div style="min-width:0"><div style="font-size:20px;font-weight:800"><span class="num">' + temp + '°C</span></div>' +
      (cond ? '<div style="font-size:12.5px;color:var(--ash)">' + cond + '</div>' : '') + '</div>' +
      (right ? '<div style="margin-left:auto;text-align:right;font-size:12px;color:var(--ash);line-height:1.7;flex:0 0 auto">' + right + '</div>' : '') +
      '</div>' + wFoot + '</div>';
  }

  function render() {
    const w = wx();
    const H = holidays();
    const PH = pharmacy(!!H.giToday);
    const RWY = runwayState();
    const FX = fixtureSoon();
    const EV = eventSoon();
    const NEWS = chronicle();

    let body = headerCard(w);

    // Quiet day — say so once, honestly.
    const anything = H.giToday || H.giTomorrow || H.esToday || PH.p || RWY || FX.match || EV;
    const anyLoading = H.st === 'loading' || PH.st === 'loading' || FX.st === 'loading';
    if (!anything && !anyLoading) {
      body += '<div class="card" style="margin-top:12px">' +
        dRow('🪨', 'All calm on the Rock today', 'No holidays, closures or matchdays on the radar') + '</div>';
    }

    // On the calendar — GI/ES holidays, else the next one coming up.
    if (H.st === 'loading') {
      body += skelSection('On the calendar', 2);
    } else if (H.giToday || H.giTomorrow || H.esToday || H.nextGi) {
      let rows = '';
      if (H.giToday) {
        rows += dRow('🇬🇮', esc(H.giToday.name), 'Public holiday in Gibraltar today — banks & Government offices closed');
      }
      if (H.giTomorrow) {
        rows += dRow('🇬🇮', esc(H.giTomorrow.name), 'Public holiday in Gibraltar tomorrow — banks closed');
      }
      if (H.esToday) {
        const local = H.esToday.local && H.esToday.local !== H.esToday.name ? esc(H.esToday.local) + ' · ' : '';
        rows += dRow('🇪🇸', esc(H.esToday.name),
          local + 'Holiday across the border (Spain/Andalucía) — quieter exit queues, busier beaches');
      }
      if (!H.giToday && !H.giTomorrow && !H.esToday && H.nextGi) {
        rows += dRow('🗓️', 'Next: ' + esc(H.nextGi.name),
          '<span class="num">' + esc(niceDate(H.nextGi.date)) + '</span> · in <span class="num">' +
          daysFromToday(H.nextGi.date) + '</span> days');
      }
      body += RW.ui.sectionTitle('On the calendar') + '<div class="card">' + rows +
        foot('Holidays · Nager.Date', 'holidays', 'cached 24 h') + '</div>';
    }

    // Duty pharmacy tonight.
    if (PH.st === 'loading') {
      body += skelSection('Duty pharmacy', 2);
    } else if (PH.p) {
      const p = PH.p;
      let kv = '';
      if (PH.tonight) kv += '<div class="kv" style="font-weight:700"><span>Tonight</span><span class="num">' + esc(PH.tonight) + '</span></div>';
      if (p.hoursWeekday) kv += '<div class="kv"><span>Mon–Fri</span><span class="num">' + esc(p.hoursWeekday) + '</span></div>';
      if (p.hoursWeekend) kv += '<div class="kv"><span>Weekends & holidays</span><span class="num">' + esc(p.hoursWeekend) + '</span></div>';
      if (p.tel) {
        const digits = String(p.tel).replace(/[^\d+]/g, '');
        const telHtml = digits.length >= 5
          ? '<a href="tel:' + esc(digits) + '" class="num" style="color:var(--ink);font-weight:700;text-decoration:none">' + esc(p.tel) + '</a>'
          : '<span class="num">' + esc(p.tel) + '</span>';
        kv += '<div class="kv"><span>Phone</span>' + telHtml + '</div>';
      }
      body += RW.ui.sectionTitle('Duty pharmacy') + '<div class="card">' +
        dRow('💊', esc(p.name), p.address ? esc(p.address) : '') + kv +
        foot('Pharmacy · dutypharmacy.gi', 'pharmacy', 'cached 12 h') + '</div>';
    }

    // Runway crossing (only if the runway module is installed).
    if (RWY) {
      const headline = RWY.closed
        ? '<span style="color:var(--brand);font-weight:800">Closed now</span> — aircraft movement'
        : 'Next closure ' + (RWY.time ? '~<span class="num">' + esc(RWY.time) + '</span>' : 'soon') +
          (RWY.flight ? ' · ' + esc(RWY.flight) : '');
      const sub = (!RWY.closed && RWY.mins != null && RWY.mins >= 0 ? 'In ~<span class="num">' + RWY.mins + '</span> min · ' : '') +
        'Pedestrians & cyclists at the level crossing — cars use the Kingsway tunnel';
      body += RW.ui.sectionTitle('Runway crossing') + '<div class="card">' +
        dRow('✈️', headline, sub, '#/runway', '›') +
        foot('Runway · gibraltarairport.gi', 'flights', 'schedule · cached 30 min') + '</div>';
    }

    // Matchday within the week.
    if (FX.st === 'loading') {
      body += skelSection('Matchday', 1);
    } else if (FX.match) {
      const m = FX.match;
      const title = m.home && m.away ? m.home + ' vs ' + m.away : (m.name || 'Gibraltar matchday');
      const sub = '<span class="num">' + esc(niceDate(m.date)) +
        (m.time && m.time !== '00:00' ? ' · ' + esc(m.time) : '') + '</span>' +
        (m.venue ? ' · ' + esc(m.venue) : '') + (m.league ? ' · ' + esc(m.league) : '');
      body += RW.ui.sectionTitle('Matchday') + '<div class="card">' + dRow('⚽', esc(title), sub) +
        foot('Fixtures · TheSportsDB', 'fixtures', 'cached 12 h') + '</div>';
    }

    // Local event in the next 3 days.
    if (EV) {
      body += RW.ui.sectionTitle('Coming up', 'What’s On', '#/events') + '<div class="card">' +
        dRow(EV.emoji || '🎉', esc(EV.name),
          '<span class="num">' + esc(niceDate(EV.date)) + '</span>' + (EV.venue ? ' · ' + esc(EV.venue) : ''),
          '#/events', '›') + '</div>';
    }

    // Top 3 live Chronicle headlines (links out; nothing rendered on fail).
    if (NEWS.st === 'loading') {
      body += skelSection('From the Chronicle', 3);
    } else if (NEWS.items) {
      const rows = NEWS.items.map((a) => {
        const href = safeHref(a.link);
        const t = relNews(a.date);
        const inner = '<div class="body"><div style="font-weight:700;font-size:13.5px;line-height:1.4;color:var(--ink)">' +
          esc(a.title) + '</div></div>' +
          (t ? '<div class="trail num" style="font-size:11px;font-weight:600;color:var(--fog)">' + esc(t) + '</div>' : '');
        return href
          ? '<a class="row" href="' + esc(href) + '" target="_blank" rel="noopener" style="text-decoration:none;cursor:pointer">' + inner + '</a>'
          : '<div class="row">' + inner + '</div>';
      }).join('');
      body += RW.ui.sectionTitle('From the Chronicle') + '<div class="card">' +
        '<div style="padding:2px 0 4px"><span class="live-dot">Live</span></div>' + rows +
        foot('News · Gibraltar Chronicle · chronicle.gi', 'news', null) + '</div>';
    }

    return RW.ui.screen({ title: 'Today', body });
  }

  RW.register({
    id: 'today',
    title: 'Today',
    emoji: '🗞️',
    showTile: false,        // lives as the first home card + #/today screen
    section: 'daily',
    order: 5,
    homeOrder: 5,
    render,
    homeCard,
    tick: 60000,            // keep runway minutes/freshness honest while open
  });
})(window.RW);
