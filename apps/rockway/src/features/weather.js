/* Rockway feature — Weather & Sea (the Rock's microclimate, live).
 * Live source: /api/weather via RW.live (Open-Meteo forecast + marine, all
 * times already Europe/Gibraltar local). Crafted surfaces: Levanter wind dial,
 * 24 h temperature sparkline, model-derived tide ribbon, sea & beaches, UV.
 * Also OVERRIDES RW.api.weather so the Rock hero and topbars go live app-wide,
 * with the _shared.js seed object kept as the honest fallback. */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  // ---- seed fallback (capture the _shared.js object BEFORE overriding) ----
  const SEED = (RW.api && typeof RW.api.weather === 'function' && RW.api.weather()) || {
    tempC: 21, condition: 'Levanter cloud over the Rock', emoji: '🌥️',
    windKt: 14, windDir: 'E (Levante)', seaState: 'Slight', high: 23, low: 17,
  };

  // ------------------------------------------------------------- helpers --
  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  const hm = (iso) => (iso ? String(iso).slice(11, 16) : '--:--');
  const num = (v, dp) => { const n = Number(v); return isFinite(n) ? (dp == null ? Math.round(n) : n.toFixed(dp)) : null; };
  const or = (v, fb) => (v == null ? fb : v);

  function compass(deg) {
    const d = ((Number(deg) % 360) + 360) % 360;
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
  }
  const isLevante = (deg) => deg >= 45 && deg <= 135;
  const isPoniente = (deg) => deg >= 225 && deg <= 315;
  function dirLabel(deg) {
    const c = compass(deg);
    return isLevante(deg) ? c + ' (Levante)' : isPoniente(deg) ? c + ' (Poniente)' : c;
  }

  // WMO weather code → condition + emoji
  function codeInfo(code, isDay) {
    if (code === 0) return { condition: isDay ? 'Clear sky' : 'Clear night', emoji: isDay ? '☀️' : '🌙' };
    if (code === 1 || code === 2) return { condition: 'Partly cloudy', emoji: '⛅' };
    if (code === 3) return { condition: 'Overcast', emoji: '☁️' };
    if (code === 45 || code === 48) return { condition: 'Fog on the Strait', emoji: '🌫️' };
    if (code >= 51 && code <= 67) return { condition: 'Rain', emoji: '🌧️' };
    if (code >= 71 && code <= 77) return { condition: 'Wintry showers', emoji: '🌨️' };
    if (code >= 80 && code <= 82) return { condition: 'Showers', emoji: '🌦️' };
    if (code >= 95) return { condition: 'Thunderstorm', emoji: '⛈️' };
    return { condition: 'Changeable', emoji: '🌤️' };
  }
  // Levanter signature: humid easterly (or fog code) → banner cloud on the Rock
  function conditionOf(cur) {
    const code = Number(cur.weather_code);
    const deg = Number(cur.wind_direction_10m) || 0;
    const rh = Number(cur.relative_humidity_2m) || 0;
    if (isLevante(deg) && (rh >= 75 || code === 45 || code === 48)) return { condition: 'Levanter over the Rock', emoji: '🌥️' };
    return codeInfo(code, Number(cur.is_day) === 1);
  }

  const waveWord = (h) => (h < 0.3 ? 'Calm' : h < 0.8 ? 'Slight' : h < 1.5 ? 'Moderate' : 'Rough');
  const wavePillCls = (w) => (w === 'Calm' ? 'ok' : w === 'Slight' ? 'info' : w === 'Moderate' ? 'warn' : 'danger');

  // index of the current hour in an array of Europe/Gibraltar-local ISO hours
  function nowIdx(times) {
    if (!times || !times.length) return 0;
    let key;
    try { key = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Gibraltar' }).slice(0, 13).replace(' ', 'T'); }
    catch (e) { return 0; }
    const i = times.findIndex((t) => String(t).slice(0, 13) === key);
    return i < 0 ? 0 : i;
  }

  // hourly slice (positions preserved; missing values carried forward)
  function series(arr, from, n) {
    if (!arr) return [];
    const end = Math.min(arr.length, from + n);
    let last = null;
    for (let i = from; i < end; i++) { const v = Number(arr[i]); if (isFinite(v)) { last = v; break; } }
    if (last == null) return [];
    const out = [];
    for (let i = from; i < end; i++) {
      const v = Number(arr[i]);
      if (isFinite(v)) last = v;
      out.push(last);
    }
    return out;
  }

  // Catmull-Rom → cubic bézier for a calm, smooth tide ribbon
  function smoothPath(pts) {
    if (!pts.length) return '';
    let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
        ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
        ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }

  // parabolic refinement of an hourly extremum → '~HH:MM' minute estimate
  function refineTime(iso, a, b, c) {
    const den = a - 2 * b + c;
    let frac = den ? 0.5 * (a - c) / den : 0;
    if (!isFinite(frac)) frac = 0;
    frac = Math.max(-0.5, Math.min(0.5, frac));
    const hh = parseInt(String(iso).slice(11, 13), 10) || 0;
    const mm = parseInt(String(iso).slice(14, 16), 10) || 0;
    const tot = (((hh * 60 + mm + Math.round(frac * 60)) % 1440) + 1440) % 1440;
    return pad2(Math.floor(tot / 60)) + ':' + pad2(tot % 60);
  }

  // next high & next low water by local extrema, in chronological order
  function tideExtremes(times, vals, from) {
    let hi = null, lo = null;
    for (let i = Math.max(1, from); i < vals.length - 1 && (!hi || !lo); i++) {
      const a = Number(vals[i - 1]), b = Number(vals[i]), c = Number(vals[i + 1]);
      if (!isFinite(a) || !isFinite(b) || !isFinite(c)) continue;
      if (!hi && b >= a && b > c) hi = { kind: 'High', i, time: refineTime(times[i], a, b, c) };
      else if (!lo && b <= a && b < c) lo = { kind: 'Low', i, time: refineTime(times[i], a, b, c) };
    }
    return [hi, lo].filter(Boolean).sort((x, y) => x.i - y.i);
  }

  // -------------------------------------- RW.api.weather override (live) --
  function liveSummary(w) {
    const c = w.current;
    const ci = conditionOf(c);
    const d = w.daily || {};
    let sea = SEED.seaState;
    if (w.marine && w.marine.waveHeight) {
      const wh = Number(w.marine.waveHeight[nowIdx(w.marine.time)]);
      if (isFinite(wh)) sea = waveWord(wh);
    }
    return {
      tempC: or(num(c.temperature_2m), SEED.tempC),
      condition: ci.condition,
      emoji: ci.emoji,
      windKt: or(num((Number(c.wind_speed_10m) || 0) * 0.54), SEED.windKt),
      windDir: dirLabel(Number(c.wind_direction_10m) || 0),
      seaState: sea,
      high: or(num(d.temperature_2m_max && d.temperature_2m_max[0]), SEED.high),
      low: or(num(d.temperature_2m_min && d.temperature_2m_min[0]), SEED.low),
    };
  }
  RW.api = RW.api || {};
  RW.api.weather = function () {
    try {
      const w = RW.live && RW.live.get ? RW.live.get('weather') : null;
      if (w && w.current) return liveSummary(w);
    } catch (e) { /* fall through to seed */ }
    return SEED;
  };

  // ------------------------------------------------- Levanter wind dial --
  const DIAL = { cx: 160, cy: 96, r: 70 };
  function dialPt(deg, r) {
    const a = (90 - deg) * Math.PI / 180;
    return [DIAL.cx + r * Math.cos(a), DIAL.cy - r * Math.sin(a)];
  }
  const P = (p) => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  const DIAL_STATIC = (function () {
    // soft red band marks the Levante sector (45–135°) on the east pole
    let s = '<path d="M' + P(dialPt(45, DIAL.r)) + ' A' + DIAL.r + ',' + DIAL.r + ' 0 0 1 ' + P(dialPt(135, DIAL.r)) +
      '" style="fill:none;stroke:var(--brand-soft);stroke-width:7;stroke-linecap:round"/>';
    s += '<circle cx="160" cy="96" r="70" style="fill:none;stroke:var(--mist);stroke-width:1.2"/>';
    [0, 45, 135, 180, 225, 315].forEach((d) => {
      const o = dialPt(d, DIAL.r), i = dialPt(d, DIAL.r - 5);
      s += '<line x1="' + o[0].toFixed(1) + '" y1="' + o[1].toFixed(1) + '" x2="' + i[0].toFixed(1) + '" y2="' + i[1].toFixed(1) +
        '" style="stroke:var(--mist);stroke-width:1.2"/>';
    });
    s += '<circle cx="230" cy="96" r="2.5" style="fill:var(--ink)"/><circle cx="90" cy="96" r="2.5" style="fill:var(--ink)"/>';
    s += '<text x="160" y="17" text-anchor="middle" style="fill:var(--fog);font-size:9px;font-weight:700">N</text>';
    s += '<text x="239" y="99.5" style="fill:var(--slate);font-size:10px;font-weight:700">E · Levante</text>';
    s += '<text x="81" y="99.5" text-anchor="end" style="fill:var(--slate);font-size:10px;font-weight:700">W · Poniente</text>';
    return s;
  })();

  function meterState(deg, kt) {
    if (kt < 3) return { word: 'Calm', line: 'Barely a breath over the Strait right now.' };
    if (isLevante(deg)) return { word: 'Levanter', line: 'The famous easterly that drapes a banner cloud over the Rock.' };
    if (isPoniente(deg)) return { word: 'Poniente', line: 'The dry westerly — clear summit, sharp views across the Strait.' };
    return { word: 'Crosswind', line: 'An unusual direction — the Strait funnels most winds east or west.' };
  }

  function meterCard(deg, kt, gustKt, example) {
    const st = meterState(deg, kt);
    const tip = dialPt(deg, 56);
    const svg = '<svg viewBox="0 0 320 172" style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto" role="img" aria-label="Wind direction dial">' +
      DIAL_STATIC +
      '<line x1="160" y1="96" x2="' + tip[0].toFixed(1) + '" y2="' + tip[1].toFixed(1) + '" style="stroke:var(--brand);stroke-width:1.6"/>' +
      '<circle cx="' + tip[0].toFixed(1) + '" cy="' + tip[1].toFixed(1) + '" r="3.4" style="fill:var(--brand)"/>' +
      '<circle cx="160" cy="96" r="2.6" style="fill:var(--ink)"/></svg>';
    const figures = '<span class="num" style="font-weight:800;color:var(--ink)">' + kt + ' kt</span> from ' + esc(compass(deg)) +
      ' (<span class="num">' + Math.round(deg) + '°</span>)' +
      (gustKt != null ? ' · gusts <span class="num" style="font-weight:700">' + gustKt + ' kt</span>' : '') +
      (example ? ' · Example' : '');
    return '<div class="card">' + svg +
      '<div style="text-align:center;margin-top:4px">' +
      '<div class="display" style="font-size:22px;font-weight:600">' + st.word + '</div>' +
      '<div class="muted tiny" style="margin-top:3px">' + figures + '</div>' +
      '<div class="muted tiny" style="margin-top:2px;font-style:italic">' + st.line + '</div>' +
      '</div></div>';
  }

  // ------------------------------------------- 24 h temperature sparkline --
  function sparkCard(hourly, idx) {
    const vals = series(hourly.temp, idx, 24);
    if (vals.length < 2) return '';
    const W = 320, H = 76, px = 8, pt = 10, pb = 12;
    const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    const span = (max - min) || 1;
    const X = (k) => px + k * (W - 2 * px) / (vals.length - 1);
    const Y = (v) => pt + (max - v) * (H - pt - pb) / span;
    const pts = vals.map((v, k) => X(k).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
    return '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">' +
      '<div style="font-weight:800;font-size:13px">Air temperature</div>' +
      '<div class="muted tiny">high <span class="num" style="font-weight:800;color:var(--ink)">' + Math.round(max) +
      '°</span> · low <span class="num" style="font-weight:800;color:var(--ink)">' + Math.round(min) + '°</span></div></div>' +
      '<svg viewBox="0 0 320 76" style="width:100%;height:auto;display:block">' +
      '<polyline points="' + pts + '" style="fill:none;stroke:var(--ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>' +
      '<circle cx="' + X(0).toFixed(1) + '" cy="' + Y(vals[0]).toFixed(1) + '" r="3.2" style="fill:var(--brand)"/></svg>' +
      '<div class="muted tiny num" style="display:flex;justify-content:space-between;margin-top:4px"><span>now</span><span>+24 h</span></div></div>';
  }

  // ----------------------------------------------------------- tide ribbon --
  function tideCard(m, idx) {
    const vals = series(m.seaLevel, idx, 25);
    if (vals.length < 5) return '';
    const W = 320, H = 96, px = 8, pt = 12, pb = 14;
    const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    const span = (max - min) || 1;
    const X = (k) => px + k * (W - 2 * px) / (vals.length - 1);
    const Y = (v) => pt + (max - v) * (H - pt - pb) / span;
    const pts = vals.map((v, k) => [X(k), Y(v)]);
    const ext = tideExtremes(m.time || [], m.seaLevel || [], idx);
    const exLabel = ext.length
      ? ext.map((e) => e.kind + ' ~<span class="num">' + esc(e.time) + '</span>').join(' · ')
      : 'No turn inside 24 h';
    let marks = '';
    ext.forEach((e) => {
      const rel = e.i - idx;
      if (rel >= 0 && rel < vals.length) {
        marks += '<circle cx="' + X(rel).toFixed(1) + '" cy="' + Y(vals[rel]).toFixed(1) +
          '" r="2.6" style="fill:var(--white);stroke:var(--ink);stroke-width:1.2"/>';
      }
    });
    const zero = (min < 0 && max > 0)
      ? '<line x1="' + px + '" y1="' + Y(0).toFixed(1) + '" x2="' + (W - px) + '" y2="' + Y(0).toFixed(1) +
        '" style="stroke:var(--mist);stroke-width:1;stroke-dasharray:3 4"/>'
      : '';
    return '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;gap:8px">' +
      '<div style="font-weight:800;font-size:13px">Sea level</div>' +
      '<div style="font-weight:800;font-size:13px">' + exLabel + '</div></div>' +
      '<svg viewBox="0 0 320 96" style="width:100%;height:auto;display:block">' + zero +
      '<path d="' + smoothPath(pts) + '" style="fill:none;stroke:var(--sea);stroke-width:1.6;stroke-linecap:round"/>' + marks +
      '<circle cx="' + pts[0][0].toFixed(1) + '" cy="' + pts[0][1].toFixed(1) + '" r="3.2" style="fill:var(--brand)"/></svg>' +
      '<div class="muted tiny num" style="display:flex;justify-content:space-between;margin-top:4px"><span>now</span><span>+24 h</span></div>' +
      '<div class="muted tiny" style="margin-top:6px">Model-derived tide — not official predictions · range <span class="num">' +
      (max - min).toFixed(2) + ' m</span> · Open-Meteo marine</div></div>';
  }

  // -------------------------------------------------------- sea & beaches --
  const BEACHES = [
    { emoji: '🛶', name: 'Catalan Bay', sub: 'The old fishing village — La Caleta to locals' },
    { emoji: '⛱️', name: 'Sandy Bay', sub: 'Restored cove beneath the old water catchments' },
    { emoji: '🏖️', name: 'Eastern Beach', sub: 'The Rock’s longest sand, under the runway approach' },
  ];
  const beachRows = () => BEACHES.map((b) =>
    RW.ui.row({ lead: b.emoji, leadBg: 'var(--sea-soft)', name: b.name, sub: b.sub })).join('');

  function seaCard(m, idx) {
    const st = num(m.seaTemp && m.seaTemp[idx], 1);
    const wh = Number(m.waveHeight && m.waveHeight[idx]);
    const wp = num(m.wavePeriod && m.wavePeriod[idx], 0);
    const word = isFinite(wh) ? waveWord(wh) : SEED.seaState;
    return '<div class="card">' +
      '<div style="display:flex;align-items:flex-start;gap:12px">' +
      '<div><div class="muted tiny" style="font-weight:700">Sea temperature</div>' +
      '<div class="num display" style="font-size:32px;font-weight:600;line-height:1.15">' + (st == null ? '—' : st + '°') + '</div></div>' +
      '<div style="margin-left:auto;text-align:right">' +
      '<span class="pill-status ' + wavePillCls(word) + '">' + esc(word) +
      (isFinite(wh) ? ' · <span class="num">' + wh.toFixed(1) + ' m</span>' : '') + '</span>' +
      (wp != null ? '<div class="muted tiny" style="margin-top:5px">swell every <span class="num">' + wp + ' s</span></div>' : '') +
      '</div></div>' +
      '<div style="border-top:1px solid var(--mist);margin-top:12px"></div>' +
      beachRows() +
      '<div class="muted tiny" style="margin-top:8px">One east-side marine model point serves all three beaches · Open-Meteo</div></div>';
  }

  function seedSeaCard() {
    return '<div class="card">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
      '<div style="font-weight:800;font-size:13px">East-side water</div>' +
      '<div style="margin-left:auto"><span class="pill-status ' + wavePillCls(SEED.seaState) + '">' + esc(SEED.seaState) + '</span></div></div>' +
      '<div style="border-top:1px solid var(--mist);margin-top:10px"></div>' +
      beachRows() +
      '<div class="muted tiny" style="margin-top:8px">Example — the live marine model is unreachable right now.</div></div>';
  }

  // -------------------------------------------------------------- sun & UV --
  function daylightStr(sr, ss) {
    const a = sr.split(':'), b = ss.split(':');
    const mins = (parseInt(b[0], 10) * 60 + parseInt(b[1], 10)) - (parseInt(a[0], 10) * 60 + parseInt(a[1], 10));
    if (!isFinite(mins) || mins <= 0) return null;
    return Math.floor(mins / 60) + 'h ' + pad2(mins % 60) + 'm';
  }
  function sunCard(d) {
    const sr = hm(d.sunrise && d.sunrise[0]), ss = hm(d.sunset && d.sunset[0]);
    const dl = daylightStr(sr, ss);
    const uv = Number(d.uv_index_max && d.uv_index_max[0]);
    const col = (l, v) => '<div style="flex:1"><div class="muted tiny" style="font-weight:700">' + l + '</div>' +
      '<div class="num display" style="font-size:24px;font-weight:600;margin-top:2px">' + v + '</div></div>';
    let uvHtml = '';
    if (isFinite(uv)) {
      const u = Math.round(uv * 10) / 10;
      uvHtml = u >= 8
        ? '<span class="pill-status warn">UV <span class="num">' + u + '</span> · Very high — Rock sun is fierce</span>'
        : '<span class="pill-status ok">UV <span class="num">' + u + '</span> · ' + (u >= 6 ? 'High — hat by midday' : u >= 3 ? 'Moderate' : 'Low') + '</span>';
    }
    return '<div class="card">' +
      '<div style="display:flex;gap:10px">' + col('Sunrise', esc(sr)) + col('Sunset', esc(ss)) + col('Daylight', dl ? esc(dl) : '—') + '</div>' +
      (uvHtml ? '<div style="margin-top:12px">' + uvHtml + '</div>' : '') +
      '<div class="muted tiny" style="margin-top:8px">The Rock shades the eastern beaches first — the west side keeps the evening sun.</div></div>';
  }

  // -------------------------------------------------------------- now panel --
  function nowPanel(o) {
    const stats = o.stats.map((s, i) =>
      '<div' + (i ? ' style="margin-top:10px"' : '') + '><div class="muted tiny" style="font-weight:700">' + s[0] + '</div>' +
      '<div style="font-weight:800;font-size:17px">' + s[1] + '</div>' +
      (s[2] ? '<div class="muted tiny">' + s[2] + '</div>' : '') + '</div>').join('');
    return '<div class="card">' +
      '<div style="display:flex;gap:14px">' +
      '<div style="flex:1;min-width:0">' +
      '<div class="num display" style="font-size:54px;font-weight:600;line-height:1;letter-spacing:-1.5px">' + o.tempC + '°</div>' +
      '<div style="font-weight:700;font-size:15px;margin-top:8px">' + o.emoji + ' ' + esc(o.condition) + '</div>' +
      '<div class="muted tiny" style="margin-top:3px">' +
      (o.feels != null ? 'Feels like <span class="num" style="font-weight:700;color:var(--ink)">' + o.feels + '°</span> · ' : '') +
      'high <span class="num" style="font-weight:700;color:var(--ink)">' + o.high + '°</span>' +
      ' · low <span class="num" style="font-weight:700;color:var(--ink)">' + o.low + '°</span></div></div>' +
      '<div style="flex:0 0 auto;text-align:right">' + stats + '</div></div>' +
      '<div style="border-top:1px solid var(--mist);margin-top:12px;padding-top:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
      o.source + '</div></div>';
  }

  // ------------------------------------------------------------ screen body --
  function liveBody(w) {
    const c = w.current;
    const sum = liveSummary(w);
    const idxH = nowIdx(w.hourly && w.hourly.time);
    const idxM = nowIdx(w.marine && w.marine.time);
    const age = RW.live.ageMin('weather');
    const ageTxt = (age == null || age < 1) ? 'just now' : '<span class="num">' + age + '</span>m ago';
    const gust = c.wind_gusts_10m == null ? null : num((Number(c.wind_gusts_10m) || 0) * 0.54);
    const rh = num(c.relative_humidity_2m);
    const spark = w.hourly ? sparkCard(w.hourly, idxH) : '';
    const tide = w.marine ? tideCard(w.marine, idxM) : '';
    return nowPanel({
      tempC: sum.tempC, emoji: sum.emoji, condition: sum.condition,
      feels: num(c.apparent_temperature), high: sum.high, low: sum.low,
      stats: [
        ['Wind', '<span class="num">' + sum.windKt + '</span> kt', 'from ' + esc(sum.windDir)],
        ['Humidity', '<span class="num">' + (rh == null ? '—' : rh) + '</span>%', null],
      ],
      source: '<span class="live-dot">Live</span><span class="muted tiny">· Open-Meteo · ' + ageTxt + '</span>',
    }) +
      RW.ui.sectionTitle('Levanter watch') + meterCard(Number(c.wind_direction_10m) || 0, sum.windKt, gust, false) +
      (spark ? RW.ui.sectionTitle('Next 24 hours') + spark : '') +
      (tide ? RW.ui.sectionTitle('Tide & sea level') + tide : '') +
      RW.ui.sectionTitle('Sea & beaches') + (w.marine ? seaCard(w.marine, idxM) : seedSeaCard()) +
      RW.ui.sectionTitle('Sun & UV') + sunCard(w.daily || {});
  }

  function seedBody() {
    return nowPanel({
      tempC: SEED.tempC, emoji: SEED.emoji, condition: SEED.condition,
      feels: null, high: SEED.high, low: SEED.low,
      stats: [
        ['Wind', '<span class="num">' + SEED.windKt + '</span> kt', 'from ' + esc(SEED.windDir)],
        ['Sea state', esc(SEED.seaState), null],
      ],
      source: '<span class="pill-status neutral">Example</span><span class="muted tiny">Live feed unreachable — typical Rock conditions shown</span>',
    }) +
      RW.ui.sectionTitle('Levanter watch') + meterCard(90, SEED.windKt, null, true) +
      RW.ui.sectionTitle('Sea & beaches') + seedSeaCard();
  }

  function skeletonBody() {
    const blk = (h) => '<div class="card"><div class="skel" style="height:' + h + 'px"></div></div>';
    return '<div class="card">' +
      '<div class="skel" style="width:128px;height:54px"></div>' +
      '<div class="skel" style="width:200px;height:15px;margin-top:10px"></div>' +
      '<div class="skel" style="width:160px;height:12px;margin-top:8px"></div>' +
      '<div class="skel" style="width:110px;height:12px;margin-top:14px"></div></div>' +
      RW.ui.sectionTitle('Levanter watch') + blk(196) +
      RW.ui.sectionTitle('Next 24 hours') + blk(104) +
      RW.ui.sectionTitle('Tide & sea level') + blk(140) +
      RW.ui.sectionTitle('Sea & beaches') + blk(216) +
      RW.ui.sectionTitle('Sun & UV') + blk(92);
  }

  function render() {
    const w = RW.live.get('weather');
    const st = RW.live.status('weather');
    const intro = '<div class="muted tiny" style="margin-bottom:10px">The Rock’s microclimate · Levante, Poniente &amp; the sea</div>';
    let body;
    if (w && w.current) { try { body = liveBody(w); } catch (e) { body = seedBody(); } }
    else if (st === 'loading') { body = skeletonBody(); }
    else { body = seedBody(); }
    return RW.ui.screen({ title: 'Weather & Sea', body: intro + body });
  }

  RW.register({
    id: 'weather',
    title: 'Weather & Sea',
    emoji: '🌬️',
    tileBg: '#e6effc',
    section: 'daily',
    order: 30,
    render,
    tick: 60000, // keep the freshness label and now-index honest on screen
  });
})(window.RW);
