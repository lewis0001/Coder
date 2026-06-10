/* Rockway feature — "Ask Rockway": a smart local assistant, no LLM.
 *
 * A retrieval + intent layer over everything the app already knows: the live
 * feeds (frontier, weather, runway, pharmacy, holidays, fixtures) and the
 * search providers (businesses, events, jobs, property, classifieds, lifts…).
 * It composes them — "dog groomer free Saturday + how's the frontier?" returns
 * BOTH a business answer and the live border status. It can't hallucinate: every
 * answer is built from real data with a source + a deep-link. An optional LLM
 * routing layer can slot in later for fuzzy phrasing (see docs/research). */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  var query = '';
  var debounce = null;

  // normalise: lowercase, strip accents, map a few ES/Llanito synonyms to EN
  function norm(q) {
    var s = String(q || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return ' ' + s + ' ';
  }
  function has(s, words) { return words.some(function (w) { return s.indexOf(w) > -1; }); }
  function gibToday() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Gibraltar' }); }

  // Token + prefix fuzzy match (so "dog groomer" finds "…Grooming"). Two words
  // match if one contains the other or they share a >=4-char prefix (groom~ing).
  var STOP = { and: 1, the: 1, for: 1, with: 1, near: 1, any: 1, you: 1, your: 1, where: 1, what: 1, who: 1, how: 1, can: 1, get: 1, need: 1, find: 1, want: 1, some: 1, this: 1, that: 1, there: 1, here: 1, today: 1, please: 1 };
  function qtokens(q) { return norm(q).trim().split(/\s+/).filter(function (w) { return w.length >= 3 && !STOP[w]; }); }
  function fuzzyHit(toks, text) {
    var words = String(text || '').toLowerCase().split(/[^a-z0-9]+/);
    return toks.some(function (t) {
      return words.some(function (w) {
        if (!w || w.length < 3) return false;
        // the typed token appears in a word, OR they share a >=4-char prefix.
        // (We deliberately do NOT match short word-fragments inside the token —
        // that let "frontier" hit "on" from "1-on-1".)
        if (w.indexOf(t) > -1) return true;
        var n = Math.min(t.length, w.length, 5);
        return n >= 4 && t.slice(0, n) === w.slice(0, n);
      });
    });
  }
  // Combined directory results: fuzzy over businesses + the other search providers.
  function dirResults(q) {
    var toks = qtokens(q);
    var out = [];
    var seen = {};
    var biz = (RW.api && RW.api.businesses) ? RW.api.businesses() : [];
    biz.forEach(function (b) {
      var hay = [b.name, b.category, b.area].concat((b.services || []).map(function (s) { return s.name; })).join(' ');
      if (fuzzyHit(toks, hay)) {
        var route = '#/discover/' + b.id;
        if (!seen[route]) { seen[route] = 1; out.push({ group: 'Businesses & services', label: b.name, sub: (b.area || '') + ' · ' + (b.category || ''), route: route, lead: b.emoji || '🔎' }); }
      }
    });
    RW.searchAll(q).forEach(function (r) {
      if (r.group === 'Businesses & services' || r.group === 'News (live)') return;
      var key = r.route + r.label;
      if (!seen[key]) { seen[key] = 1; out.push(r); }
    });
    return out;
  }

  // an answer card builder
  function card(o) {
    return '<div class="card" style="margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
      '<span style="font-size:20px">' + (o.icon || '🔑') + '</span>' +
      '<span style="font-weight:800;font-size:14px">' + esc(o.title) + '</span>' +
      (o.tag ? '<span style="margin-left:auto" class="pill-status ' + (o.tagCls || 'neutral') + '">' + esc(o.tag) + '</span>' : '') +
      '</div>' +
      '<div style="font-size:14px;line-height:1.5">' + o.body + '</div>' +
      (o.source ? '<div class="muted tiny" style="margin-top:6px">' + esc(o.source) + '</div>' : '') +
      (o.route ? '<button class="btn sm" style="margin-top:10px" data-act="nav" data-route="' + esc(o.route) + '">' + esc(o.cta || 'Open') + '</button>' : '') +
      '</div>';
  }

  // ---- intent matchers: each returns a card HTML string, or '' ----
  var INTENTS = [
    function frontier(s) {
      if (!has(s, ['frontier', 'focona', 'border', 'queue', 'cross', 'cruzar', 'la linea', 'spain side'])) return '';
      var F = RW.api.frontier; var ci = F.community('in-car'); var co = F.community('out-car');
      return card({
        icon: '🛂', title: 'The frontier right now', tag: ci.word, tagCls: ci.level === 'green' ? 'ok' : ci.level === 'red' ? 'danger' : 'warn',
        body: '<strong>Into Gibraltar:</strong> ' + esc(ci.word) + (ci.fresh ? ' (' + ci.count + ' recent report' + (ci.count === 1 ? '' : 's') + ')' : ' (typical for now)') +
          '<br><strong>To Spain:</strong> ' + esc(co.word) + '. No EES checks at the land frontier.',
        source: 'Community reports + live cameras', route: '#/frontier', cta: 'Cameras & reports',
      });
    },
    function weather(s) {
      if (!has(s, ['weather', 'tiempo', 'rain', 'lluvia', 'sun', 'sol', 'hot', 'cold', 'wind', 'viento', 'levanter', 'levante', 'forecast'])) return '';
      var W = RW.api.weather();
      return card({ icon: W.emoji || '🌥️', title: 'Weather on the Rock', tag: W.tempC + '°', tagCls: 'info',
        body: esc(W.condition) + ' · feels like context, wind ' + esc(String(W.windKt)) + 'kt ' + esc(W.windDir || '') + '. Today ↑' + esc(String(W.high)) + '° ↓' + esc(String(W.low)) + '°.',
        source: 'Live · Open-Meteo', route: '#/weather', cta: 'Full forecast & sea' });
    },
    function beach(s) {
      if (!has(s, ['beach', 'playa', 'sea', 'mar', 'swim', 'tide', 'marea', 'surf', 'sandy bay', 'catalan'])) return '';
      var W = RW.api.weather();
      return card({ icon: '🏖️', title: 'Beaches & sea', body: 'Air ' + esc(String(W.tempC)) + '°, ' + esc(W.condition) + '. Catalan Bay, Sandy Bay and Eastern Beach — see live sea temperature and the tide curve in Weather & Sea.',
        source: 'Live · Open-Meteo marine', route: '#/weather', cta: 'Tides & sea state' });
    },
    function pharmacy(s) {
      if (!has(s, ['pharmacy', 'farmacia', 'chemist', 'duty', 'medicine', 'medicina', 'prescription'])) return '';
      var p = RW.live && RW.live.get('pharmacy');
      if (p && p.ok) return card({ icon: '💊', title: 'Duty pharmacy', body: '<strong>' + esc(p.name) + '</strong><br>' + esc(p.address || '') + (p.tel ? ' · ' + esc(p.tel) : '') + '<br>Weekdays ' + esc(p.hoursWeekday || '') + ' · weekends ' + esc(p.hoursWeekend || ''),
        source: 'Live · dutypharmacy.gi', route: '#/today', cta: 'Today on the Rock' });
      return card({ icon: '💊', title: 'Duty pharmacy', body: 'Checking the duty-pharmacy rota… open Today on the Rock for the latest.', route: '#/today', cta: 'Today on the Rock' });
    },
    function runway(s) {
      if (!has(s, ['runway', 'plane', 'avion', 'flight', 'vuelo', 'airport', 'crossing closed', 'winston churchill'])) return '';
      var r = RW.api.runway;
      var body = 'The pedestrian/cycle crossing closes briefly for each aircraft (cars use the Kingsway tunnel).';
      var tag = 'Open', cls = 'ok';
      try {
        if (r && r.closedNow && r.closedNow()) { tag = 'Closed now'; cls = 'danger'; body = 'The crossing is closed right now for an aircraft. ' + body; }
        else if (r && r.next) { var n = r.next(); if (n) body = 'Next closure ~' + esc(n.start) + ' for ' + esc(n.flight || 'a flight') + '. ' + body; }
      } catch (e) {}
      return card({ icon: '🛬', title: 'Runway crossing', tag: tag, tagCls: cls, body: body, source: 'Live · gibraltarairport.gi', route: '#/runway', cta: 'Today’s flights' });
    },
    function holiday(s) {
      if (!has(s, ['holiday', 'bank holiday', 'fiesta', 'festivo', 'closed today', 'day off'])) return '';
      var h = RW.live && RW.live.get('holidays'); var t = gibToday();
      if (h && h.ok) {
        var gi = (h.gi || []).filter(function (x) { return x.date === t; })[0];
        var es = (h.es || []).filter(function (x) { return x.date === t; })[0];
        var body = gi ? '🇬🇮 Today is <strong>' + esc(gi.name) + '</strong> — a Gibraltar public holiday.' : 'No Gibraltar public holiday today.';
        if (es) body += '<br>🇪🇸 It’s also a holiday across the border (' + esc(es.name) + ') — quieter exits, busier beaches.';
        return card({ icon: '📅', title: 'Holidays', body: body, source: 'Nager.Date', route: '#/today', cta: 'Today on the Rock' });
      }
      return '';
    },
    function football(s) {
      if (!has(s, ['football', 'match', 'fixture', 'gibraltar play', 'red imps', 'futbol', 'soccer', 'national team'])) return '';
      var f = RW.live && RW.live.get('fixtures');
      if (f && f.ok && f.events && f.events[0]) {
        var e = f.events[0];
        return card({ icon: '⚽', title: 'Next Gibraltar fixture', body: '<strong>' + esc(e.name) + '</strong><br>' + esc(e.league || '') + ' · ' + esc(e.date) + (e.time ? ' · ' + esc(e.time) : '') + (e.venue ? ' · ' + esc(e.venue) : ''),
          source: 'TheSportsDB', route: '#/news', cta: 'News & sport' });
      }
      return '';
    },
    function events(s) {
      if (!has(s, ['event', 'whats on', "what's on", 'tonight', 'this weekend', 'concert', 'festival', 'que hacer'])) return '';
      var e = RW.api.nextEvent && RW.api.nextEvent();
      if (e) return card({ icon: e.emoji || '🎉', title: 'Coming up', body: '<strong>' + esc(e.name) + '</strong> · ' + esc(e.venue || '') , source: 'What’s On', route: '#/events', cta: 'All events' });
      return '';
    },
    function gov(s) {
      if (!has(s, ['licence', 'license', 'passport', 'id card', 'tax', 'register', 'renew', 'civil status', 'birth certificate', 'driving'])) return '';
      return card({ icon: '🏛️', title: 'Government services', body: 'Most Gibraltar government services — driving licence, ID card, civil status, tax — are handled on the official eGovernment portal.',
        source: 'Official · gov.gi', route: '#/news', cta: 'Local news' });
    },
    function carpool(s) {
      if (!has(s, ['lift', 'carpool', 'car pool', 'car-pool', 'ride', 'share the drive', 'compartir', 'commute'])) return '';
      var n = (RW.S.lifts || []).length;
      return card({ icon: '🚗', title: 'Frontier car-pool', body: n ? n + ' lift' + (n === 1 ? '' : 's') + ' on the board right now. Offer a seat or find one across the border.' : 'Be the first to offer or request a lift across the Focona.',
        route: '#/carpool', cta: 'Open the lift board' });
    },
  ];

  function suggestions() {
    var qs = ['How’s the frontier?', 'Duty pharmacy tonight', 'Dog groomer Saturday', 'What’s on this weekend', 'Is it a holiday today?', 'Lift to La Línea'];
    return '<div class="chips" style="margin-top:12px">' + qs.map(function (q) {
      return '<span class="chip tap" data-act="askSuggest" data-v="' + esc(q) + '">' + esc(q) + '</span>';
    }).join('') + '</div>';
  }

  function render() {
    var q = query.trim();
    var input = '<input id="ask-input" class="input" type="search" autocomplete="off" placeholder="Ask Rockway anything about the Rock…" value="' + esc(query) + '" style="margin-top:8px;font-size:16px">';
    var body = input;

    if (q.length < 2) {
      body += '<div class="subtle" style="margin-top:14px">I answer from live Gibraltar data — the frontier, weather &amp; sea, the runway, duty pharmacy, holidays, what’s on, lifts and every local business. Try:</div>' + suggestions();
      return RW.ui.screen({ title: 'Ask Rockway', body: body });
    }

    var s = norm(q);
    var cards = INTENTS.map(function (fn) { try { return fn(s); } catch (e) { return ''; } }).filter(Boolean);

    // directory / cross-feature results (fuzzy businesses + other providers)
    var results = dirResults(q);
    var dir = '';
    if (results.length) {
      var groups = {};
      results.slice(0, 12).forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
      dir = Object.keys(groups).map(function (g) {
        return '<div class="subtle" style="margin:12px 2px 6px;font-weight:700">' + esc(g) + '</div>' +
          '<div class="card" style="padding:2px 14px">' + groups[g].map(function (r) {
            return '<div class="row" data-act="nav" data-route="' + esc(r.route) + '" style="cursor:pointer">' +
              '<div class="lead" style="font-size:18px">' + (r.lead || '🔎') + '</div>' +
              '<div class="body"><div class="name">' + esc(r.label) + '</div>' + (r.sub ? '<div class="sub">' + esc(r.sub) + '</div>' : '') + '</div>' +
              '<div class="trail muted">›</div></div>';
          }).join('') + '</div>';
      }).join('');
    }

    if (!cards.length && !dir) {
      body += RW.ui.empty('🤔', 'I don’t have an answer for “' + esc(q) + '” yet.<br>Try the frontier, weather, a business or a place.');
    } else {
      if (cards.length) body += '<div style="margin-top:14px">' + cards.join('') + '</div>';
      if (dir) body += '<div style="margin-top:6px">' + (cards.length ? '<div class="section-title">Also on the Rock</div>' : '') + dir + '</div>';
    }
    return RW.ui.screen({ title: 'Ask Rockway', body: body });
  }

  // live typing with focus preservation
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el || el.id !== 'ask-input') return;
    var v = el.value;
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      query = v; RW.render();
      var i = document.getElementById('ask-input');
      if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} }
    }, 150);
  });

  RW.register({
    id: 'ask', title: 'Ask Rockway', emoji: '✨', showTile: false, render: render,
    actions: {
      askSuggest: function (el) { query = el.dataset.v || ''; RW.render(); var i = document.getElementById('ask-input'); if (i) i.focus(); },
    },
  });
})(window.RW);
