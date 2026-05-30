#!/usr/bin/env node
/* Rockway — zero-dependency static server.
 * Usage: node server.js [port]   (default 4178)
 * Or just open index.html directly — the app also runs on file://. */
'use strict';
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT = parseInt(process.argv[2] || process.env.PORT || '4178', 10);
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

// ---- /api/news proxy: Gibraltar Chronicle RSS ----

var newsCache = null;   // { ts: Number, payload: String }
var NEWS_TTL  = 5 * 60 * 1000; // 5 minutes

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '');
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#038;/g,  '&')
    .replace(/&#39;/g,   '’');
}

function extractField(item, tag) {
  var re  = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  var m   = item.match(re);
  if (!m) return '';
  return decodeEntities(stripTags(stripCdata(m[1]))).trim();
}

function parseRSS(xml) {
  var items = [];
  var itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  var m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 12) {
    var chunk = m[1];
    var title = extractField(chunk, 'title');
    var link  = extractField(chunk, 'link');
    // <link> is sometimes a text node between tags with no content attr; try guid too
    if (!link) { link = extractField(chunk, 'guid'); }
    var date  = extractField(chunk, 'pubDate');
    if (!title) continue;
    items.push({ title: title, link: link, date: date });
  }
  return items;
}

function fetchChronicleRSS(cb) {
  var options = {
    hostname: 'www.chronicle.gi',
    path:     '/feed/',
    method:   'GET',
    headers:  { 'User-Agent': 'RockwayNewsProxy/1.0', 'Accept': 'application/rss+xml, text/xml, */*' },
    timeout:  6000,
  };

  var done = false;
  function finish(err, result) {
    if (done) return;
    done = true;
    cb(err, result);
  }

  try {
    var req = https.request(options, function (res) {
      // Follow a single redirect (301/302)
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        var loc = res.headers.location;
        res.resume();
        try {
          var u    = new URL(loc);
          var opts2 = {
            hostname: u.hostname,
            path:     u.pathname + (u.search || ''),
            method:   'GET',
            headers:  options.headers,
            timeout:  6000,
          };
          var req2 = https.request(opts2, function (res2) {
            var buf = '';
            res2.setEncoding('utf8');
            res2.on('data', function (c) { buf += c; });
            res2.on('end',  function ()  { finish(null, buf); });
          });
          req2.on('error',   function (e) { finish(e); });
          req2.on('timeout', function ()  { req2.destroy(); finish(new Error('timeout')); });
          req2.end();
        } catch (e2) { finish(e2); }
        return;
      }

      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) { body += chunk; });
      res.on('end',  function ()      { finish(null, body); });
    });

    req.on('error',   function (e) { finish(e); });
    req.on('timeout', function ()  { req.destroy(); finish(new Error('timeout')); });
    req.end();
  } catch (e) {
    finish(e);
  }
}

function serveNewsAPI(res) {
  // Serve from cache if fresh
  if (newsCache && (Date.now() - newsCache.ts < NEWS_TTL)) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(newsCache.payload);
    return;
  }

  fetchChronicleRSS(function (err, xml) {
    var payload;
    if (err || !xml) {
      payload = JSON.stringify({ ok: false, items: [] });
    } else {
      try {
        var items = parseRSS(xml);
        if (items.length > 0) {
          newsCache = { ts: Date.now(), payload: JSON.stringify({ ok: true, items: items }) };
          payload   = newsCache.payload;
        } else {
          payload = JSON.stringify({ ok: false, items: [] });
        }
      } catch (e) {
        payload = JSON.stringify({ ok: false, items: [] });
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(payload);
  });
}

// ---- HTTP server ----

http.createServer(function (req, res) {
  // API proxy route — must be checked before static-file fallback
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/news') {
    serveNewsAPI(res);
    return;
  }

  // Static file serving (unchanged behaviour)
  var urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  var filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('🔑 Rockway running → http://localhost:' + PORT);
});
