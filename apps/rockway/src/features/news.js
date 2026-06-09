/* Rockway feature — News (live Gibraltar Chronicle headlines via RW.live,
 * matchday ribbon, community noticeboard). Live-first: we never fabricate
 * articles — real headlines link out to chronicle.gi with attribution. */
(function (RW) {
  'use strict';
  const { esc, uid, fmtDate } = RW.util;

  // ---- community noticeboard examples (clearly badged, never passed off as real) ----

  const EXAMPLE_NOTICES = [
    {
      id: 'nb1',
      type: 'Lost & Found',
      text: 'Lost: grey tabby cat, answers to Milo, last seen near Rosia Road on Tuesday evening. Please call Maria on 5400-XXXX.',
      poster: 'Maria R.',
      example: true,
      timeMs: Date.now() - 3 * 60 * 60 * 1000,
    },
    {
      id: 'nb2',
      type: 'Neighbourhood',
      text: 'Reminder: communal bins on Castle Road will not be collected this Friday due to the public holiday. Next collection Saturday morning.',
      poster: 'Community Notice',
      example: true,
      timeMs: Date.now() - 5 * 60 * 60 * 1000,
    },
    {
      id: 'nb3',
      type: 'Charity',
      text: 'St John’s Church is collecting non-perishable food items for the Foodbank Gibraltar. Drop-off at the church porch, Mon–Fri 09:00–17:00.',
      poster: 'Foodbank Gibraltar',
      example: true,
      timeMs: Date.now() - 26 * 60 * 60 * 1000,
    },
    {
      id: 'nb4',
      type: 'Lost & Found',
      text: 'Found: set of house keys with a red carabiner clip, picked up on Main Street near the Cathedral. Contact the noticeboard to claim.',
      poster: 'Community Notice',
      example: true,
      timeMs: Date.now() - 48 * 60 * 60 * 1000,
    },
  ];

  // Real local outlets — used for honest link-outs when the live feed is down.
  const OUTLETS = [
    { label: 'Chronicle', href: 'https://www.chronicle.gi' },
    { label: 'GBC', href: 'https://www.gbc.gi' },
    { label: 'Panorama', href: 'https://www.gibraltarpanorama.gi' },
  ];

  // ---- state helpers ----

  // Bookmarks are {title, link, date, t} objects; drop legacy id-string entries.
  function getBookmarks() {
    var list = (RW.S.newsBookmarks || []).filter(function (b) {
      return b && typeof b === 'object' && b.link;
    });
    RW.S.newsBookmarks = list;
    return list;
  }

  function isBookmarked(link) {
    var bm = getBookmarks();
    for (var i = 0; i < bm.length; i++) if (bm[i].link === link) return true;
    return false;
  }

  function getNotices() { return (RW.S.newsNotices = RW.S.newsNotices || []); }

  function noticeT(n) { return n.t || n.timeMs || 0; }

  function allNotices() {
    return getNotices().concat(EXAMPLE_NOTICES)
      .sort(function (a, b) { return noticeT(b) - noticeT(a); });
  }

  // ---- formatting helpers ----

  function relTime(ms) {
    var diff = Date.now() - ms;
    var mins  = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days  = Math.floor(diff / 86400000);
    if (mins < 2)   return 'Just now';
    if (mins < 60)  return mins + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days === 1) return 'Yesterday';
    return days + 'd ago';
  }

  // RSS pubDate (RFC 822) → relative label; quiet '' when unparseable.
  function relFromDate(dateStr) {
    if (!dateStr) return '';
    var ms = Date.parse(dateStr);
    if (isNaN(ms)) return '';
    return relTime(ms);
  }

  var DIVIDER = '<div style="height:1px;background:var(--mist)"></div>';

  // ---- live headline rows (headline + link-out only; we never republish body text) ----

  function headlineRow(item) {
    var title = item.title || '';
    var link  = item.link || '';
    var when  = relFromDate(item.date);
    var saved = isBookmarked(link);
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:11px 0">' +
      '<div style="flex:1;min-width:0">' +
        '<a href="' + esc(link) + '" target="_blank" rel="noopener"' +
          ' style="display:block;color:var(--ink);text-decoration:none;font-weight:700;font-size:14px;line-height:1.4">' +
          esc(title) +
        '</a>' +
        '<div style="margin-top:3px;font-size:11px;color:var(--ash)">' +
          '<span style="font-weight:800;letter-spacing:.04em;text-transform:uppercase">Chronicle</span>' +
          (when ? ' · <span class="num">' + esc(when) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<button class="btn ghost sm" style="padding:5px 11px;font-size:14px;flex:0 0 auto' +
        (saved ? ';color:var(--gold)' : '') + '"' +
        ' data-act="newsBookmark" data-link="' + esc(link) + '" data-title="' + esc(title) + '"' +
        ' data-date="' + esc(item.date || '') + '" aria-label="Save headline">' +
        (saved ? '★' : '☆') +
      '</button>' +
    '</div>';
  }

  function skelRows() {
    var widths = [92, 74, 88, 63, 84, 70];
    return widths.map(function (w) {
      return '<div style="padding:12px 0">' +
        '<div class="skel" style="height:13px;width:' + w + '%">&nbsp;</div>' +
        '<div class="skel" style="height:9px;width:34%;margin-top:7px">&nbsp;</div>' +
      '</div>';
    }).join('');
  }

  function outletChips() {
    return '<div class="chips" style="margin-top:10px">' + OUTLETS.map(function (o) {
      return '<a class="chip tap" style="text-decoration:none" href="' + o.href + '"' +
        ' target="_blank" rel="noopener">' + esc(o.label) + ' ↗</a>';
    }).join('') + '</div>';
  }

  function headlinesSection() {
    var p  = RW.live.get('news');     // {ok, items:[{title, link, date}], fetched}
    var st = RW.live.status('news');
    var out = RW.ui.sectionTitle('Headlines');

    if (p && p.items && p.items.length) {
      var age = RW.live.ageMin('news');
      var attribution =
        '<div style="display:flex;align-items:center;gap:7px;padding-bottom:8px;border-bottom:1px solid var(--mist)">' +
          '<span class="live-dot">Live</span>' +
          '<span class="subtle" style="font-size:11.5px">· Gibraltar Chronicle' +
            (age != null ? ' · <span class="num">' + age + 'm ago</span>' : '') +
          '</span>' +
          '<a class="subtle" style="margin-left:auto;font-size:11.5px;text-decoration:none"' +
            ' href="https://www.chronicle.gi" target="_blank" rel="noopener">chronicle.gi ↗</a>' +
        '</div>';
      return out + '<div class="card">' + attribution +
        p.items.map(headlineRow).join(DIVIDER) + '</div>';
    }

    if (st === 'loading') {
      return out + '<div class="card">' + skelRows() + '</div>';
    }

    // Offline / proxy down — a quiet card with honest link-outs, no fake stories.
    return out + '<div class="card">' +
      '<div style="font-weight:700;font-size:14px;line-height:1.45">Live headlines need a connection — nothing cached yet.</div>' +
      '<div class="subtle" style="margin-top:4px">Read the local outlets directly:</div>' +
      outletChips() +
    '</div>';
  }

  // ---- matchday ribbon (live fixtures, only when one exists) ----

  function fixtureRibbon() {
    var p = RW.live.get('fixtures');  // {ok, events:[{name,league,date,time,home,away,venue}]}
    if (!p || !p.events || !p.events.length) return '';
    var e = p.events[0] || {};
    var title = (e.home && e.away) ? (e.home + ' vs ' + e.away) : (e.name || '');
    if (!title) return '';
    var meta = [];
    if (e.league) meta.push(esc(e.league));
    if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) meta.push('<span class="num">' + esc(fmtDate(e.date)) + '</span>');
    if (e.time)  meta.push('<span class="num">' + esc(e.time) + '</span>');
    if (e.venue) meta.push(esc(e.venue));
    return '<div class="card" style="margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;gap:11px">' +
        '<div style="font-size:22px;flex:0 0 auto">⚽</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:800;font-size:14px;line-height:1.3">' + esc(title) + '</div>' +
          (meta.length ? '<div class="subtle" style="margin-top:3px;font-size:12px">' + meta.join(' · ') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="font-size:10.5px;color:var(--fog);margin-top:7px">Live · TheSportsDB</div>' +
    '</div>';
  }

  // ---- saved headlines ----

  function savedSection() {
    var bm = getBookmarks();
    if (!bm.length) return '';
    var rows = bm.slice()
      .sort(function (a, b) { return (b.t || 0) - (a.t || 0); })
      .map(headlineRow).join(DIVIDER);
    return RW.ui.sectionTitle('Saved') + '<div class="card">' + rows + '</div>';
  }

  // ---- community noticeboard (genuine UGC + clearly-badged examples) ----

  function renderNoticeCard(n) {
    var t = noticeT(n);
    var when = t ? relTime(t) : (n.time || '');
    return '<div class="card" style="margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px">' +
        '<span class="chip">' + esc(n.type || 'Community') + '</span>' +
        (n.example ? '<span class="pill-status neutral" style="font-size:10px;padding:3px 8px">Example</span>' : '') +
        (when ? '<span class="num" style="font-size:11px;color:var(--ash);margin-left:auto">' + esc(when) + '</span>' : '') +
      '</div>' +
      '<div style="font-size:13.5px;line-height:1.5;color:var(--ink)">' + esc(n.text) + '</div>' +
      '<div style="font-size:11px;color:var(--fog);margin-top:5px">Posted by ' + esc(n.poster || '') + '</div>' +
    '</div>';
  }

  function noticesSection() {
    return RW.ui.sectionTitle('Community noticeboard') +
      allNotices().map(renderNoticeCard).join('') +
      '<button class="btn ghost" style="margin-top:4px" data-act="newsPost">Post a notice</button>';
  }

  // ---- main render ----

  function render(parts) {
    // Legacy deep links (#/news/n1, #/news/saved, #/news/post) all land here —
    // the fabricated article views are gone for good.
    var body =
      fixtureRibbon() +
      headlinesSection() +
      savedSection() +
      noticesSection();
    return RW.ui.screen({ title: 'News', body: body });
  }

  // ---- home card: top LIVE headline only — no live data, no card ----

  function homeCard() {
    var p  = RW.live.get('news');
    var st = RW.live.status('news');
    if (p && p.items && p.items.length) {
      var top  = p.items[0];
      var when = relFromDate(top.date);
      return RW.ui.sectionTitle('Local news', 'All news', '#/news') +
        '<div class="card" style="cursor:pointer" data-act="nav" data-route="#/news">' +
          '<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">' +
            '<span class="live-dot">Live</span>' +
            '<span class="subtle" style="font-size:11px">· Chronicle</span>' +
            (when ? '<span class="num" style="font-size:11px;color:var(--ash);margin-left:auto">' + esc(when) + '</span>' : '') +
          '</div>' +
          '<div style="font-size:14px;font-weight:800;line-height:1.35;color:var(--ink)">' + esc(top.title) + '</div>' +
        '</div>';
    }
    if (st === 'loading') {
      return RW.ui.sectionTitle('Local news', 'All news', '#/news') +
        '<div class="card">' +
          '<div class="skel" style="height:10px;width:32%">&nbsp;</div>' +
          '<div class="skel" style="height:14px;width:90%;margin-top:8px">&nbsp;</div>' +
        '</div>';
    }
    return ''; // offline: home stays clean — never a fake Top Story
  }

  // ---- register ----

  RW.register({
    id: 'news',
    title: 'News',
    emoji: '📰',
    tileBg: '#e7e9ee',
    section: 'explore',
    order: 30,
    render: render,
    homeCard: homeCard,
    homeOrder: 25,
    actions: {
      // Toggle a live headline in/out of Saved ({title, link, date, t} objects).
      newsBookmark: function (el) {
        var link = el.dataset.link || '';
        if (!link) return;
        var bm = getBookmarks();
        var idx = -1;
        for (var i = 0; i < bm.length; i++) if (bm[i].link === link) { idx = i; break; }
        if (idx === -1) {
          bm.push({ title: el.dataset.title || '', link: link, date: el.dataset.date || '', t: Date.now() });
          RW.toast('Headline saved ★');
        } else {
          bm.splice(idx, 1);
          RW.toast('Removed from Saved');
        }
        RW.S.newsBookmarks = bm;
        RW.store.save();
        RW.render();
      },

      // Post a community notice (simple prompt flow, 200-char cap).
      newsPost: function () {
        if (typeof prompt !== 'function') return;
        var text = prompt('Post a community notice (max 200 characters):', '');
        if (text == null) return;
        text = String(text).trim().slice(0, 200);
        if (!text) { RW.toast('Nothing posted — the notice was empty'); return; }
        var notices = getNotices();
        notices.push({ id: uid(), type: 'Community', text: text, poster: 'You', t: Date.now() });
        RW.S.newsNotices = notices;
        RW.store.save();
        RW.toast('Notice posted ✓');
        RW.render();
      },
    },
  });
})(window.RW);
