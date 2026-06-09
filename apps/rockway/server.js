#!/usr/bin/env node
/* Rockway — zero-dependency server: static files + live Gibraltar data proxies.
 *
 * Usage: node server.js [port]   (default 4178)
 * The app also runs by opening index.html directly (file://) — every /api/*
 * consumer falls back to seed data when the proxies are unreachable.
 *
 * API routes (all cached, all soft-fail with {ok:false} and HTTP 200):
 *   /api/news      Gibraltar Chronicle RSS                 (cache 5 min)
 *   /api/weather   Open-Meteo forecast + marine, merged    (cache 15 min)
 *   /api/flights   gibraltarairport.gi 7-day schedule      (cache 30 min)
 *   /api/pharmacy  dutypharmacy.gi duty rota               (cache 12 h)
 *   /api/holidays  Nager.Date GI + ES (Andalucía) holidays (cache 24 h)
 *   /api/fixtures  TheSportsDB Gibraltar national team     (cache 12 h)
 *
 * Sources verified in docs/review/live-data.md. Scraped pages (airport,
 * pharmacy) are cached long and fetched with an identifying User-Agent. */
'use strict';
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT = parseInt(process.argv[2] || process.env.PORT || '4178', 10);
const ROOT = __dirname;
const UA   = 'RockwayProxy/1.0 (Gibraltar community app)';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

/* ---------------------------------------------------------------- fetch -- */
// GET a URL (https), follow up to 2 redirects, 8s timeout, cb(err, body).
function fetchUrl(url, cb, redirects) {
  redirects = redirects == null ? 2 : redirects;
  let u;
  try { u = new URL(url); } catch (e) { cb(e); return; }
  let done = false;
  const finish = (err, body) => { if (!done) { done = true; cb(err, body); } };
  const req = https.request({
    hostname: u.hostname,
    path: u.pathname + (u.search || ''),
    method: 'GET',
    headers: { 'User-Agent': UA, 'Accept': '*/*' },
    timeout: 8000,
  }, (res) => {
    if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects > 0) {
      res.resume();
      const next = new URL(res.headers.location, url).toString();
      fetchUrl(next, finish, redirects - 1);
      return;
    }
    if (res.statusCode !== 200) { res.resume(); finish(new Error('HTTP ' + res.statusCode)); return; }
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (c) => { body += c; });
    res.on('end', () => finish(null, body));
  });
  req.on('error', finish);
  req.on('timeout', () => { req.destroy(); finish(new Error('timeout')); });
  req.end();
}

// Fetch several URLs in parallel; cb(errOrNull, [bodies…]) — fails if any fail.
function fetchAll(urls, cb) {
  const out = new Array(urls.length);
  let pending = urls.length, failed = false;
  urls.forEach((url, i) => {
    fetchUrl(url, (err, body) => {
      if (failed) return;
      if (err) { failed = true; cb(err); return; }
      out[i] = body;
      if (--pending === 0) cb(null, out);
    });
  });
}

/* ----------------------------------------------------------- html utils -- */
const stripCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const stripTags  = (s) => s.replace(/<[^>]*>/g, '');
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, '’')
    .replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
    .replace(/&#038;/g, '&').replace(/&nbsp;/g, ' ');
}
const cleanText = (s) => decodeEntities(stripTags(stripCdata(s))).replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------- route registry -- */
// Each route: { ttl, build(cb) } where build calls cb(payloadObject).
const routes = {};
const cache = {};
function register(name, ttl, build) { routes[name] = { ttl, build }; }

function serveApi(name, res) {
  const route = routes[name];
  const sendJson = (obj) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(obj));
  };
  if (!route) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const c = cache[name];
  if (c && Date.now() - c.ts < route.ttl) { sendJson(c.payload); return; }
  let responded = false;
  try {
    route.build((payload) => {
      if (responded) return;
      responded = true;
      if (payload && payload.ok) cache[name] = { ts: Date.now(), payload };
      // serve stale cache rather than a failure if we have one
      sendJson(payload && payload.ok ? payload : (c ? c.payload : payload || { ok: false }));
    });
  } catch (e) {
    if (!responded) sendJson(c ? c.payload : { ok: false });
  }
}

/* ------------------------------------------------------------- /api/news -- */
register('news', 5 * 60 * 1000, (done) => {
  fetchUrl('https://www.chronicle.gi/feed/', (err, xml) => {
    if (err || !xml) { done({ ok: false, items: [] }); return; }
    const items = [];
    const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = re.exec(xml)) !== null && items.length < 12) {
      const chunk = m[1];
      const field = (tag) => {
        const f = chunk.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
        return f ? cleanText(f[1]) : '';
      };
      const title = field('title');
      if (!title) continue;
      items.push({ title, link: field('link') || field('guid'), date: field('pubDate') });
    }
    done(items.length ? { ok: true, items } : { ok: false, items: [] });
  });
});

/* ---------------------------------------------------------- /api/weather -- */
register('weather', 15 * 60 * 1000, (done) => {
  const base = 'latitude=36.14&longitude=-5.35&timezone=Europe%2FGibraltar';
  const forecast = 'https://api.open-meteo.com/v1/forecast?' + base +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
    '&hourly=temperature_2m,weather_code,uv_index&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min&forecast_days=2';
  const marine = 'https://marine-api.open-meteo.com/v1/marine?' + base +
    '&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,sea_level_height_msl&forecast_days=2';
  fetchAll([forecast, marine], (err, bodies) => {
    if (err) { done({ ok: false }); return; }
    try {
      const f = JSON.parse(bodies[0]);
      const mar = JSON.parse(bodies[1]);
      done({
        ok: true,
        fetched: Date.now(),
        current: f.current,
        daily: f.daily,
        hourly: { time: f.hourly.time, temp: f.hourly.temperature_2m, code: f.hourly.weather_code, uv: f.hourly.uv_index },
        marine: {
          time: mar.hourly.time,
          waveHeight: mar.hourly.wave_height,
          wavePeriod: mar.hourly.wave_period,
          seaTemp: mar.hourly.sea_surface_temperature,
          seaLevel: mar.hourly.sea_level_height_msl,
        },
      });
    } catch (e) { done({ ok: false }); }
  });
});

/* ---------------------------------------------------------- /api/flights -- */
// Parses gibraltarairport.gi "live flight information": two tab panes
// (arrivals/departures), each containing <h6>Day DD Month YYYY</h6> + a table
// of rows From/To · Flight · Sched · Status · Expected.
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function parseFlightPane(html, kind) {
  const out = [];
  const dayRe = /<h6>\s*\w+\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s*<\/h6>([\s\S]*?)(?=<h6>|$)/gi;
  let dm;
  while ((dm = dayRe.exec(html)) !== null) {
    const mon = MONTHS[dm[2].toLowerCase()];
    if (!mon) continue;
    const date = dm[3] + '-' + String(mon).padStart(2, '0') + '-' + String(parseInt(dm[1], 10)).padStart(2, '0');
    const rows = [];
    const trRe = /<tr>([\s\S]*?)<\/tr>/gi;
    let tm;
    while ((tm = trRe.exec(dm[4])) !== null) {
      const cells = [];
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cm;
      while ((cm = tdRe.exec(tm[1])) !== null) cells.push(cleanText(cm[1]));
      if (cells.length >= 3 && /\d{1,2}:\d{2}/.test(cells[2])) {
        rows.push({
          place: cells[0], flight: cells[1], sched: cells[2],
          status: cells[3] || '', expected: cells[4] || '',
        });
      }
    }
    if (rows.length) out.push({ date, kind, rows });
  }
  return out;
}
register('flights', 30 * 60 * 1000, (done) => {
  fetchUrl('https://www.gibraltarairport.gi/airlines-and-destinations/live-flight-information', (err, html) => {
    if (err || !html) { done({ ok: false }); return; }
    try {
      const depSplit = html.split(/id="live-flight-info-departures"/i);
      const arrHtml = depSplit[0];
      const depHtml = depSplit[1] || '';
      const days = {};
      parseFlightPane(arrHtml, 'arr').concat(parseFlightPane(depHtml, 'dep')).forEach((d) => {
        days[d.date] = days[d.date] || { date: d.date, arrivals: [], departures: [] };
        days[d.date][d.kind === 'arr' ? 'arrivals' : 'departures'] = d.rows;
      });
      const list = Object.keys(days).sort().map((k) => days[k]);
      done(list.length ? { ok: true, fetched: Date.now(), source: 'gibraltarairport.gi', days: list } : { ok: false });
    } catch (e) { done({ ok: false }); }
  });
});

/* --------------------------------------------------------- /api/pharmacy -- */
register('pharmacy', 12 * 60 * 60 * 1000, (done) => {
  fetchUrl('https://www.dutypharmacy.gi/', (err, html) => {
    if (err || !html) { done({ ok: false }); return; }
    try {
      let txt = html.replace(/<script[\s\S]*?<\/script>/gi, '');
      txt = decodeEntities(txt.replace(/<[^>]+>/g, '|')).replace(/\|+/g, '|');
      const grab = (label) => {
        const i = txt.indexOf(label + '|');
        if (i === -1) return '';
        return (txt.slice(i + label.length + 1).split('|')[0] || '').trim();
      };
      const name = grab('Pharmacy');
      const hoursWk = (txt.match(/Monday to Friday:\s*([^|]+)/i) || [])[1] || '';
      const hoursWe = (txt.match(/Weekends & public holidays:\s*([^|]+)/i) || [])[1] || '';
      if (!name) { done({ ok: false }); return; }
      done({
        ok: true, fetched: Date.now(), source: 'dutypharmacy.gi',
        name, address: grab('Address'), tel: grab('Telephone'),
        hoursWeekday: hoursWk.trim(), hoursWeekend: hoursWe.trim(),
        from: grab('Duty Period'),
      });
    } catch (e) { done({ ok: false }); }
  });
});

/* --------------------------------------------------------- /api/holidays -- */
register('holidays', 24 * 60 * 60 * 1000, (done) => {
  const year = new Date().getFullYear();
  const urls = [
    'https://date.nager.at/api/v3/PublicHolidays/' + year + '/GI',
    'https://date.nager.at/api/v3/PublicHolidays/' + year + '/ES',
    'https://date.nager.at/api/v3/PublicHolidays/' + (year + 1) + '/GI',
    'https://date.nager.at/api/v3/PublicHolidays/' + (year + 1) + '/ES',
  ];
  fetchAll(urls, (err, bodies) => {
    if (err) { done({ ok: false }); return; }
    try {
      const parse = (s) => JSON.parse(s);
      // Spanish holidays relevant at the frontier: national (counties null) or Andalucía
      const esFilter = (h) => !h.counties || h.counties.indexOf('ES-AN') !== -1;
      const slim = (h) => ({ date: h.date, name: h.name, local: h.localName });
      done({
        ok: true, fetched: Date.now(),
        gi: parse(bodies[0]).map(slim).concat(parse(bodies[2]).map(slim)),
        es: parse(bodies[1]).filter(esFilter).map(slim).concat(parse(bodies[3]).filter(esFilter).map(slim)),
      });
    } catch (e) { done({ ok: false }); }
  });
});

/* --------------------------------------------------------- /api/fixtures -- */
register('fixtures', 12 * 60 * 60 * 1000, (done) => {
  // Gibraltar national team on TheSportsDB (free/shared key — cached 12 h)
  fetchUrl('https://www.thesportsdb.com/api/v1/json/123/eventsnext.php?id=136464', (err, body) => {
    if (err || !body) { done({ ok: false }); return; }
    try {
      const data = JSON.parse(body);
      const events = (data.events || []).slice(0, 3).map((e) => ({
        name: e.strEvent, league: e.strLeague, date: e.dateEvent,
        time: (e.strTime || '').slice(0, 5), home: e.strHomeTeam, away: e.strAwayTeam,
        venue: e.strVenue || '',
      }));
      done(events.length ? { ok: true, fetched: Date.now(), events } : { ok: false });
    } catch (e) { done({ ok: false }); }
  });
});

/* ------------------------------------------------------------- HTTP core -- */
http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  const apiMatch = pathname.match(/^\/api\/(\w+)$/);
  if (req.method === 'GET' && apiMatch) { serveApi(apiMatch[1], res); return; }

  let urlPath;
  try {
    urlPath = decodeURIComponent(pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('🔑 Rockway running → http://localhost:' + PORT);
  console.log('   live data: /api/news /api/weather /api/flights /api/pharmacy /api/holidays /api/fixtures');
});
