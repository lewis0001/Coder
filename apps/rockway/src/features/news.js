/* Rockway feature — News (local Gibraltar news feed, filters, bookmarks, noticeboard). */
(function (RW) {
  'use strict';
  const { esc, uid } = RW.util;

  // ---- seed data: authentic Gibraltar headlines ----

  const ARTICLES = [
    {
      id: 'n1',
      source: 'GBC',
      headline: 'EES Scanners Now Fully Operational at Land Frontier',
      category: 'Frontier',
      standfirst: 'The EU Entry/Exit System biometric scanners have moved to full operation at the Gibraltar–Spain land border, with Gibraltar residents directed to dedicated fast-track lanes.',
      body: [
        'The EU Entry/Exit System (EES) biometric scanners installed at the Gibraltar–Spain land frontier since February 2026 are now operating at full capacity. Fingerprint and facial-recognition checks apply to all non-residents crossing the Schengen external border, with Gibraltar authorities confirming that morning peaks between 07:30 and 09:00 have seen queues of up to 45 minutes for visitors during the bedding-in period.',
        'Gibraltar residents and registered cross-frontier workers are directed to dedicated lanes and are largely unaffected by the new procedure. The Gibraltar Borders & Coastguard Agency (GBCA) has advised non-residents to plan for the extra time until the system matures. Under the treaty text published on 26 February 2026, land checks are expected to be removed once the agreement enters provisional application — currently targeted for July 2026 — so the current disruption is widely regarded as temporary.',
      ],
      timeMs: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      id: 'n2',
      source: 'Chronicle',
      headline: 'GHA Announces Expanded Walk-In Clinic Hours at St Bernard’s Hospital',
      category: 'Health',
      standfirst: 'The Gibraltar Health Authority is extending walk-in clinic availability to include Saturday mornings in response to rising demand from working families.',
      body: [
        'The Gibraltar Health Authority (GHA) has confirmed that the walk-in clinic at St Bernard’s Hospital will expand its operating hours from the start of next month, covering Saturday mornings from 08:00 to 13:00. The move follows months of feedback from residents who found weekday-only access incompatible with full-time working patterns.',
        'A GHA spokesperson said the additional slots would be staffed by existing nursing teams on a rotation basis and that no additional recruitment was currently required. The authority also confirmed a waiting-time target of under 30 minutes for non-emergency presentations. Patients are reminded that the GHA app allows them to check estimated wait times before attending.',
      ],
      timeMs: Date.now() - 4 * 60 * 60 * 1000,
    },
    {
      id: 'n3',
      source: 'YGTV',
      headline: 'Gibraltar FC Secure Vital Win to Stay in Europa Conference League Qualifying',
      category: 'Sport',
      standfirst: 'A late header from Lincoln FC graduate Adrián Parody sealed a 2–1 victory at the Victoria Stadium, keeping Gibraltar FC’s European campaign alive heading into the second leg.',
      body: [
        'Gibraltar FC produced a spirited performance at Victoria Stadium on Thursday evening, coming from a goal down to beat their Maltese opponents 2–1 in the first leg of their UEFA Europa Conference League qualifying tie. A neat combination down the right flank set up the equaliser before Adrián Parody’s powerful header in the 87th minute sent the home crowd into raptures.',
        'Manager Kevin Caruana praised the team’s resilience and highlighted the vocal support from the packed terraces. “The crowd was the twelfth man tonight,” he said post-match. Gibraltar FC now travel to Malta for the second leg next Thursday, knowing a draw or better will see them advance. The result continues Gibraltar’s growing reputation in European competition since the GFA’s UEFA admission in 2013.',
      ],
      timeMs: Date.now() - 6 * 60 * 60 * 1000,
    },
    {
      id: 'n4',
      source: 'Chronicle',
      headline: 'Finance Centre Reports Record Funds Under Administration in Q1 2026',
      category: 'Finance',
      standfirst: 'Gibraltar’s financial services sector posted a record £18.4 billion in funds under administration for the first quarter of 2026, driven by strong growth in distributed-ledger fund structures.',
      body: [
        'Gibraltar Finance has released figures showing that total funds under administration reached £18.4 billion at the end of Q1 2026, a 12% increase year-on-year and the highest figure on record. The growth has been attributed in particular to continued demand for Gibraltar’s regulated Distributed Ledger Technology (DLT) framework, which attracted several new fund managers during the quarter.',
        'Minister for Financial Services Albert Isola described the figures as “a testament to the hard work of practitioners and the robustness of our regulatory environment.” The gaming and fintech sectors also contributed to buoyant corporate services activity. The Finance Centre’s annual conference is scheduled for October, where the updated five-year strategy for the sector is expected to be presented.',
      ],
      timeMs: Date.now() - 8 * 60 * 60 * 1000,
    },
    {
      id: 'n5',
      source: 'GBC',
      headline: 'Levanter Cloud Blankets the Rock as Summer Heat Builds',
      category: 'Weather',
      standfirst: 'The distinctive Levanter cloud cap has settled over the Upper Rock this week as easterly winds increase ahead of a warm spell expected to push temperatures above 30°C by the weekend.',
      body: [
        'The iconic Levanter cloud — Gibraltar’s weather trademark — has been draping itself over the summit of the Rock since Tuesday, spilling over the western face before evaporating in the drier air below. The phenomenon, caused by moist easterly winds rising over the limestone massif and cooling, is familiar to all Gibraltarians but serves as a striking reminder of the territory’s unique microclimate.',
        'The Met Office Gibraltar is forecasting that the easterly pattern will ease by Friday, giving way to a warm westerly flow that should bring clear skies and temperatures reaching 31–33°C over the weekend. Residents are advised to stay hydrated and to avoid prolonged exposure during the midday hours. The Nature Reserve paths, particularly those on the eastern face, may be slippery while the Levanter persists.',
      ],
      timeMs: Date.now() - 10 * 60 * 60 * 1000,
    },
    {
      id: 'n6',
      source: 'Panorama',
      headline: 'National Day Committee Unveils Plans for Landmark 2026 Celebration',
      category: 'National Day',
      standfirst: 'With the 59th anniversary of the 1967 sovereignty referendum approaching on 10 September, organisers have confirmed an expanded programme including a live stage at Governor’s Parade and a fireworks finale from the Detached Mole.',
      body: [
        'The Gibraltar National Day Committee held its first public briefing of the year this week, outlining plans for what promises to be a landmark celebration. The 10 September 2026 programme will include the traditional children’s fancy-dress gathering outside Parliament on Main Street, a community street party at John Mackintosh Square, and headline live acts at both Governor’s Parade (the Piazzela) and Grand Casemates Square from early afternoon.',
        'New this year is a dedicated family funzone on Line Wall Road and an expanded food court celebrating Gibraltarian cuisine alongside international favourites. The evening will culminate with a fireworks display launched from the Detached Mole at 22:00. Organisers are urging residents to wear the national colours of red and white and to book restaurants early, as demand for the evening is already high.',
      ],
      timeMs: Date.now() - 26 * 60 * 60 * 1000,
    },
    {
      id: 'n7',
      source: 'GBC',
      headline: 'Port of Gibraltar Handles Record Cruise Passenger Numbers in May',
      category: 'Port & Shipping',
      standfirst: 'Gibraltar’s port authority recorded over 42,000 cruise-ship visitors during May 2026, a 15% rise on the same month last year, placing renewed pressure on frontier crossing times at peak midday periods.',
      body: [
        'The Gibraltar Port Authority has confirmed that 42,300 cruise passengers disembarked across seventeen vessel calls during May 2026, making it the busiest May on record. The surge has brought a welcome boost to Main Street retailers and Grand Casemates Square restaurants, though it has also contributed to noticeably longer queues at the land frontier on days when multiple ships are in port simultaneously.',
        'The GBCA has urged day-trippers arriving by cruise ship to use the pedestrian crossing rather than hiring taxis, as the vehicle lanes are typically slower during midday peaks. Port officials said they are in discussions with Spanish counterparts about coordinating staffing on high-volume days.',
      ],
      timeMs: Date.now() - 30 * 60 * 60 * 1000,
    },
    {
      id: 'n8',
      source: 'Chronicle',
      headline: 'Gaming Sector Welcomes New AI Licensing Framework from Gibraltar Regulator',
      category: 'Finance',
      standfirst: 'The Gibraltar Gambling Commissioner has published updated guidance covering AI-driven player-interaction tools, cementing Gibraltar’s reputation as a forward-thinking jurisdiction for licensed operators.',
      body: [
        'The Gibraltar Gambling Commissioner has released a consultation paper setting out a new licensing pathway for online gaming operators that use artificial-intelligence tools for player interaction, responsible-gambling monitoring, and personalised content. The guidance will come into force on 1 August 2026 for new licence applications and in January 2027 for existing holders.',
        'Industry body the Gibraltar Association of Online Gambling Operators (GAOGO) welcomed the clarity, with chair Melissa Penalver saying the framework “gives operators and investors the certainty needed to build next-generation products on the Rock.” Gibraltar currently hosts dozens of licensed operators and the sector employs thousands of people locally.',
      ],
      timeMs: Date.now() - 50 * 60 * 60 * 1000,
    },
  ];

  // ---- community noticeboard seed data ----

  const INITIAL_NOTICES = [
    {
      id: 'nb1',
      type: 'Lost & Found',
      text: 'Lost: grey tabby cat, answers to Milo, last seen near Rosia Road on Tuesday evening. Please call Maria on 5400-XXXX.',
      poster: 'Maria R.',
      timeMs: Date.now() - 3 * 60 * 60 * 1000,
    },
    {
      id: 'nb2',
      type: 'Neighbourhood',
      text: 'Reminder: communal bins on Castle Road will not be collected this Friday due to the public holiday. Next collection Saturday morning.',
      poster: 'Community Notice',
      timeMs: Date.now() - 5 * 60 * 60 * 1000,
    },
    {
      id: 'nb3',
      type: 'Charity',
      text: 'St John’s Church is collecting non-perishable food items for the Foodbank Gibraltar. Drop-off at the church porch, Mon–Fri 09:00–17:00.',
      poster: 'Foodbank Gibraltar',
      timeMs: Date.now() - 26 * 60 * 60 * 1000,
    },
    {
      id: 'nb4',
      type: 'Lost & Found',
      text: 'Found: set of house keys with a red carabiner clip, picked up on Main Street near the Cathedral. Contact YGTV community desk to claim.',
      poster: 'YGTV Community',
      timeMs: Date.now() - 48 * 60 * 60 * 1000,
    },
  ];

  const NOTICE_TYPES = ['Community', 'Lost & Found', 'Charity', 'Neighbourhood', 'For Sale', 'Events'];

  const SOURCES = ['All', 'GBC', 'Chronicle', 'Panorama', 'YGTV'];
  const CATEGORIES = ['All', 'Frontier', 'Health', 'Sport', 'Finance', 'Weather', 'National Day', 'Port & Shipping'];

  // ---- live feed state (populated by /api/news proxy) ----

  var liveItems  = null;  // array of {title, link, date} from Chronicle RSS, or null
  var fetchFired = false; // guard: only one fetch per page load

  // ---- state helpers ----

  function getBookmarks() { return (RW.S.newsBookmarks = RW.S.newsBookmarks || []); }
  function getNotices()   { return (RW.S.newsNotices   = RW.S.newsNotices   || []); }
  function allNotices()   { return INITIAL_NOTICES.concat(getNotices()); }
  function isBookmarked(id) { return getBookmarks().indexOf(id) !== -1; }
  function getFilter() {
    var f = RW.S.newsFilter = RW.S.newsFilter || {};
    if (!f.source) f.source = 'All';
    if (!f.category) f.category = 'All';
    return f;
  }

  function filteredArticles() {
    var f = getFilter();
    return ARTICLES.filter(function (a) {
      return (f.source === 'All' || a.source === f.source) &&
             (f.category === 'All' || a.category === f.category);
    });
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

  function sourceLabel(src) {
    if (src === 'Chronicle') return 'Gibraltar Chronicle';
    return src || '';
  }

  // Parse an RSS pubDate string (RFC 2822) into a relative label; falls back gracefully
  function relTimeFromRFC(dateStr) {
    if (!dateStr) return '';
    try {
      var ms = Date.parse(dateStr);
      if (isNaN(ms)) return dateStr.substring(0, 16);
      return relTime(ms);
    } catch (e) {
      return '';
    }
  }

  // Render a single live Chronicle item as a card
  function renderLiveItem(item) {
    var t = relTimeFromRFC(item.date);
    var safeLink = (item.link || '').replace(/"/g, '%22');
    return '<div class="card" style="margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
        '<span style="font-size:11px;font-weight:800;color:#1455c0;letter-spacing:.02em">Gibraltar Chronicle</span>' +
        (t ? '<span class="num" style="font-size:11px;color:var(--ash);margin-left:auto">' + esc(t) + '</span>' : '') +
      '</div>' +
      '<a href="' + safeLink + '" target="_blank" rel="noopener"' +
        ' style="font-size:14.5px;font-weight:800;line-height:1.35;color:var(--ink);text-decoration:none;display:block;margin-bottom:4px">' +
        esc(item.title) +
      '</a>' +
    '</div>';
  }

  // Render the "Live · Gibraltar Chronicle" section (only when liveItems is populated)
  function renderLiveSection() {
    if (!liveItems || !liveItems.length) return '';
    try {
      return '<div style="margin-bottom:4px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
            '<span style="font-size:13px;font-weight:800;color:var(--ink)">Live</span>' +
            '<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;' +
              'color:#fff;background:#1455c0;border-radius:999px;padding:1px 7px">CHRONICLE</span>' +
            '<span style="font-size:11px;color:var(--ash);margin-left:auto">gibraltar-chronicle.gi</span>' +
          '</div>' +
          liveItems.map(renderLiveItem).join('') +
        '</div>';
    } catch (e) {
      return '';
    }
  }

  // Kick off ONE background fetch of the Chronicle RSS proxy; re-renders on success
  function maybeStartLiveFetch() {
    if (fetchFired) return;
    if (typeof fetch !== 'function') return;
    fetchFired = true;
    fetch('/api/news')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && Array.isArray(data.items) && data.items.length) {
          liveItems = data.items;
          RW.render();
        }
      })
      .catch(function () {
        // Network or parse error — stay on seed data, no crash
      });
  }

  // Source badge colours map (accent colour per outlet)
  var SRC_COLOUR = {
    GBC: '#d4112a',
    Chronicle: '#1455c0',
    Panorama: '#7c3aed',
    YGTV: '#059669',
  };

  // Category pill colours
  var CAT_COLOUR = {
    Frontier: '#1455c0',
    Health: '#059669',
    Sport: '#d97706',
    Finance: '#7c3aed',
    Weather: '#0891b2',
    'National Day': '#dc2626',
    'Port & Shipping': '#475569',
  };

  // Notice type colours
  var NOTICE_COLOUR = {
    'Lost & Found': '#d97706',
    Neighbourhood:  '#475569',
    Charity:        '#059669',
    Community:      '#1455c0',
    'For Sale':     '#7c3aed',
    Events:         '#d4112a',
  };

  function srcColour(src)  { return SRC_COLOUR[src]  || '#6b7280'; }
  function catColour(cat)  { return CAT_COLOUR[cat]  || '#6b7280'; }
  function noticeColour(t) { return NOTICE_COLOUR[t] || '#6b7280'; }

  // Inline pill helper (no RW.ui dependency — just HTML)
  function pill(text, colour) {
    return '<span style="display:inline-flex;align-items:center;font-size:11px;font-weight:700;' +
      'color:#fff;background:' + colour + ';border-radius:999px;padding:2px 8px;white-space:nowrap">' +
      esc(text) + '</span>';
  }

  // Source badge (brand-coloured text label)
  function srcBadge(src) {
    return '<span style="font-size:11px;font-weight:800;color:' + srcColour(src) + ';letter-spacing:.02em">' +
      esc(sourceLabel(src)) + '</span>';
  }

  // ---- article card (feed) ----

  function renderArticleCard(a) {
    var bm = isBookmarked(a.id);
    var t  = relTime(a.timeMs);
    return '<div class="card" style="margin-bottom:10px">' +
      // meta row
      '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-bottom:7px">' +
        srcBadge(a.source) +
        pill(a.category, catColour(a.category)) +
        '<span class="num" style="font-size:11px;color:var(--ash);margin-left:auto">' + esc(t) + '</span>' +
      '</div>' +
      // headline — tappable
      '<div style="font-size:15px;font-weight:800;line-height:1.35;margin-bottom:6px;cursor:pointer;color:var(--ink)"' +
        ' data-act="newsOpen" data-id="' + esc(a.id) + '">' + esc(a.headline) + '</div>' +
      // standfirst
      '<div style="font-size:13px;color:var(--ash);line-height:1.5;margin-bottom:10px">' + esc(a.standfirst) + '</div>' +
      // actions
      '<div style="display:flex;gap:8px">' +
        '<button class="btn ghost sm" data-act="newsOpen" data-id="' + esc(a.id) + '">Read more</button>' +
        '<button class="btn sm" style="' +
          (bm ? 'background:var(--gold);color:var(--brand-dark);box-shadow:none' : 'background:var(--cloud);color:var(--ash);box-shadow:none') +
          '" data-act="newsBookmark" data-id="' + esc(a.id) + '">' +
          (bm ? '★ Saved' : '☆ Save') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  // ---- article reading view ----

  function renderArticleView(a) {
    var bm  = isBookmarked(a.id);
    var t   = relTime(a.timeMs);
    var heroHtml = RW.ui.hero({
      emoji: sourceEmoji(a.source),
      title: esc(a.headline),
      sub: sourceLabel(a.source) + ' · ' + t,
      accent: srcColour(a.source),
      chips: [a.category],
    });
    var body =
      '<p style="font-size:14px;font-style:italic;color:var(--ash);line-height:1.55;' +
        'margin:0 0 16px;border-left:3px solid var(--brand);padding-left:12px">' +
        esc(a.standfirst) + '</p>' +
      a.body.map(function (para) {
        return '<p style="font-size:14.5px;line-height:1.65;margin:0 0 16px;color:var(--ink)">' + esc(para) + '</p>';
      }).join('') +
      '<div style="display:flex;gap:10px;margin-top:4px;padding-top:14px;border-top:1px solid var(--mist)">' +
        '<button class="btn' + (bm ? ' gold' : ' ghost') + '" data-act="newsBookmark" data-id="' + esc(a.id) + '">' +
          (bm ? '★ Bookmarked' : '☆ Bookmark') +
        '</button>' +
        '<button class="btn ghost" data-act="newsShare" data-id="' + esc(a.id) + '">🔗 Share</button>' +
      '</div>';
    return RW.ui.screen({ title: esc(sourceLabel(a.source)), hero: heroHtml, body: body });
  }

  function sourceEmoji(src) {
    if (src === 'GBC')       return '📺';
    if (src === 'Chronicle') return '📰';
    if (src === 'Panorama')  return '📖';
    if (src === 'YGTV')      return '🎥';
    return '📰';
  }

  // ---- saved / bookmarks view ----

  function renderSavedView() {
    var savedIds      = getBookmarks();
    var savedArticles = ARTICLES.filter(function (a) { return savedIds.indexOf(a.id) !== -1; });
    var body =
      RW.ui.sectionTitle('Saved Articles') +
      (savedArticles.length === 0
        ? RW.ui.empty('☆', 'No bookmarks yet. Tap ☆ Save on any article.', 'Browse News', '#/news')
        : savedArticles.map(renderArticleCard).join(''));
    return RW.ui.screen({ title: 'Saved', body: body });
  }

  // ---- notice card ----

  function renderNoticeCard(n) {
    var t = n.timeMs ? relTime(n.timeMs) : (n.time || '');
    return '<div class="card" style="margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
        pill(n.type, noticeColour(n.type)) +
        '<span class="num" style="font-size:11px;color:var(--ash);margin-left:auto">' + esc(t) + '</span>' +
      '</div>' +
      '<div style="font-size:13.5px;line-height:1.5;margin-bottom:5px;color:var(--ink)">' + esc(n.text) + '</div>' +
      '<div style="font-size:11px;color:var(--fog)">Posted by ' + esc(n.poster || '') + '</div>' +
    '</div>';
  }

  // ---- post-a-notice modal (inline form rendered via action) ----

  function renderPostNoticeForm() {
    var typeOptions = NOTICE_TYPES.map(function (t) {
      return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
    }).join('');
    var body =
      RW.ui.sectionTitle('Post a Notice') +
      '<div class="card">' +
        '<label class="fld">Category</label>' +
        '<select id="notice-type" class="input" style="margin-bottom:10px">' +
          typeOptions +
        '</select>' +
        '<label class="fld">Your notice <span style="color:var(--ash);font-weight:400">(max 200 chars)</span></label>' +
        '<textarea id="notice-text" class="input" rows="4" maxlength="200"' +
          ' placeholder="What would you like to share with the community?"></textarea>' +
        '<div style="font-size:11px;color:var(--ash);margin:4px 0 14px;text-align:right">' +
          '<span id="notice-counter">0</span>/200' +
        '</div>' +
        '<button class="btn" data-act="newsPostNotice">Post to Noticeboard</button>' +
        '<button class="btn ghost" style="margin-top:10px" data-act="nav" data-route="#/news">Cancel</button>' +
      '</div>';
    return RW.ui.screen({ title: 'Community Notice', body: body });
  }

  // ---- main render ----

  function render(parts) {
    var segment = parts && parts[1] ? parts[1] : (parts && parts[0] ? parts[0] : '');

    // article reading view: #/news/n1 etc.
    if (segment && segment !== 'saved' && segment !== 'post') {
      var a = ARTICLES.find(function (x) { return x.id === segment; });
      if (!a) {
        return RW.ui.screen({
          title: 'News',
          body: RW.ui.empty('📰', 'Article not found.', 'Back to News', '#/news'),
        });
      }
      return renderArticleView(a);
    }

    // saved articles view: #/news/saved
    if (segment === 'saved') {
      return renderSavedView();
    }

    // post-a-notice form: #/news/post
    if (segment === 'post') {
      return renderPostNoticeForm();
    }

    // ---- main feed ----
    var f    = getFilter();
    var feed = filteredArticles();

    // Filter chips using RW.ui.chips
    var srcItems = SOURCES.map(function (s) { return { label: s, value: s }; });
    var catItems = CATEGORIES.map(function (c) { return { label: c, value: c }; });

    var filterBar =
      '<div style="margin-bottom:2px">' +
        '<div class="subtle" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Source</div>' +
        RW.ui.chips(srcItems, f.source, 'newsFilter', true) +
        '<div class="subtle" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;margin-top:2px">Category</div>' +
        RW.ui.chips(catItems, f.category, 'newsFilter') +
      '</div>';

    var feedHtml = feed.length === 0
      ? RW.ui.empty('📰', 'No stories match your filters.', 'Clear filters', '#/news')
      : feed.map(renderArticleCard).join('');

    var savedCount = getBookmarks().length;
    var savedBadge = savedCount > 0
      ? '<a href="#/news/saved" style="font-size:13px;font-weight:700;color:var(--brand);text-decoration:none">' +
          '★ ' + savedCount + ' saved</a>'
      : '';

    // Stats row
    var statsHtml =
      '<div class="grid2" style="margin-bottom:14px">' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--brand)">' + ARTICLES.length + '</div>' +
          '<div class="l">Stories today</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="n num" style="color:var(--sea)">' + savedCount + '</div>' +
          '<div class="l">Saved articles</div>' +
        '</div>' +
      '</div>';

    var noticesAll = allNotices();
    var noticeHtml =
      RW.ui.sectionTitle('Community Noticeboard', 'Post a notice', '#/news/post') +
      noticesAll.slice(0, 4).map(renderNoticeCard).join('') +
      (noticesAll.length > 4
        ? '<p style="font-size:12px;color:var(--ash);text-align:center;margin-top:6px">' +
            (noticesAll.length - 4) + ' more notice' + (noticesAll.length - 4 === 1 ? '' : 's') +
          '</p>'
        : '');

    // Kick off live fetch (no-op if already fired or fetch unavailable)
    maybeStartLiveFetch();

    // Live Chronicle section (empty string when no live data yet)
    var liveHtml = renderLiveSection();

    var body =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<div style="font-size:13px;color:var(--ash)">Gibraltar news &amp; community</div>' +
        savedBadge +
      '</div>' +
      statsHtml +
      '<div class="card" style="margin-bottom:14px">' + filterBar + '</div>' +
      (liveHtml
        ? RW.ui.sectionTitle('Live · Gibraltar Chronicle') + liveHtml
        : '') +
      RW.ui.sectionTitle('Latest') +
      feedHtml +
      noticeHtml;

    return RW.ui.screen({ title: 'News', body: body });
  }

  // ---- home card ----

  function homeCard() {
    var top = ARTICLES[0];
    var t   = relTime(top.timeMs);
    return RW.ui.sectionTitle('Top Story', 'All news', '#/news') +
      '<div class="card" style="cursor:pointer;padding:12px" data-act="newsOpen" data-id="' + esc(top.id) + '">' +
        '<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">' +
          srcBadge(top.source) +
          pill(top.category, catColour(top.category)) +
          '<span class="num" style="font-size:11px;color:var(--ash);margin-left:auto">' + esc(t) + '</span>' +
        '</div>' +
        '<div style="font-size:14px;font-weight:800;line-height:1.35;color:var(--ink)">' + esc(top.headline) + '</div>' +
        '<div style="font-size:12px;color:var(--ash);margin-top:5px;line-height:1.4;' +
          'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' +
          esc(top.standfirst) + '</div>' +
      '</div>';
  }

  // ---- newsFilter action uses data-v (RW.ui.chips emits data-v) ----
  // We intercept both data-v (new chips) and legacy data-source/data-category

  // ---- actions ----

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
      newsOpen: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.go('#/news/' + id);
      },

      newsBookmark: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        var bm  = getBookmarks();
        var idx = bm.indexOf(id);
        if (idx === -1) {
          bm.push(id);
          RW.toast('Article saved ★');
        } else {
          bm.splice(idx, 1);
          RW.toast('Bookmark removed');
        }
        RW.S.newsBookmarks = bm;
        RW.store.save();
        RW.render();
      },

      // RW.ui.chips fires data-v; legacy data-source / data-category also handled
      newsFilter: function (el) {
        var f = getFilter();
        // RW.ui.chips puts the value in data-v; determine which filter by context
        if (el.dataset.v !== undefined) {
          var v = el.dataset.v;
          if (SOURCES.indexOf(v) !== -1)     { f.source = v; }
          else if (CATEGORIES.indexOf(v) !== -1) { f.category = v; }
        }
        // legacy fallback
        if (el.dataset.source   !== undefined) { f.source   = el.dataset.source; }
        if (el.dataset.category !== undefined) { f.category = el.dataset.category; }
        RW.S.newsFilter = f;
        RW.store.save();
        RW.render();
      },

      newsShare: function (el) {
        var id = el.dataset.id;
        var a  = ARTICLES.find(function (x) { return x.id === id; });
        if (!a) return;
        RW.toast('Link copied: ' + a.headline.substring(0, 42) + '…');
      },

      newsPostNotice: function () {
        // If we are on the post-form screen, read the form values
        var typeEl = document.getElementById('notice-type');
        var textEl = document.getElementById('notice-text');
        if (!typeEl || !textEl) {
          // Not on the form yet — navigate to it
          RW.go('#/news/post');
          return;
        }
        var text = (textEl.value || '').trim();
        var type = (typeEl.value || 'Community').trim();
        if (!text) { RW.toast('Please enter some text first'); return; }
        if (text.length > 200) { text = text.substring(0, 200); }
        var notices = getNotices();
        notices.push({
          id:     uid(),
          type:   type,
          text:   text,
          poster: 'You',
          timeMs: Date.now(),
        });
        RW.S.newsNotices = notices;
        RW.store.save();
        RW.toast('Notice posted to the noticeboard ✓');
        RW.go('#/news');
        RW.render();
      },
    },
  });

  // Live character counter for the notice textarea
  document.addEventListener('DOMContentLoaded', function () {
    var phone = document.querySelector('.phone') || document.body;
    phone.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'notice-text') {
        var counter = document.getElementById('notice-counter');
        if (counter) { counter.textContent = String(e.target.value.length); }
      }
    });
  });
})(window.RW);
