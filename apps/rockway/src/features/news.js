/* Rockway feature — News (local Gibraltar news feed, filters, bookmarks, noticeboard). */
(function (RW) {
  'use strict';
  const { esc, uid, ref } = RW.util;

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
      time: '2h ago',
      timeMs: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      id: 'n2',
      source: 'Chronicle',
      headline: 'GHA Announces Expanded Walk-In Clinic Hours at St Bernard\'s Hospital',
      category: 'Health',
      standfirst: 'The Gibraltar Health Authority is extending walk-in clinic availability to include Saturday mornings in response to rising demand from working families.',
      body: [
        'The Gibraltar Health Authority (GHA) has confirmed that the walk-in clinic at St Bernard\'s Hospital will expand its operating hours from the start of next month, covering Saturday mornings from 08:00 to 13:00. The move follows months of feedback from residents who found weekday-only access incompatible with full-time working patterns.',
        'A GHA spokesperson said the additional slots would be staffed by existing nursing teams on a rotation basis and that no additional recruitment was currently required. The authority also confirmed a waiting-time target of under 30 minutes for non-emergency presentations, in line with the standards already operating on weekdays. Patients are reminded that the GHA app allows them to check estimated wait times before attending.',
      ],
      time: '4h ago',
      timeMs: Date.now() - 4 * 60 * 60 * 1000,
    },
    {
      id: 'n3',
      source: 'YGTV',
      headline: 'Gibraltar FC Secure Vital Win to Stay in Europa Conference League Qualifying',
      category: 'Sport',
      standfirst: 'A late header from Lincoln FC graduate Adrián Parody sealed a 2–1 victory at the Victoria Stadium, keeping Gibraltar FC\'s European campaign alive heading into the second leg.',
      body: [
        'Gibraltar FC produced a spirited performance at Victoria Stadium on Thursday evening, coming from a goal down to beat their Maltese opponents 2–1 in the first leg of their UEFA Europa Conference League qualifying tie. A neat combination down the right flank set up the equaliser before Adrián Parody\'s powerful header in the 87th minute sent the home crowd into raptures.',
        'Manager Kevin Caruana praised the team\'s resilience and highlighted the vocal support from the packed terraces. "The crowd was the twelfth man tonight," he said post-match. Gibraltar FC now travel to Malta for the second leg next Thursday, knowing a draw or better will see them advance to the next round. The result continues Gibraltar\'s growing reputation in European competition since the GFA\'s UEFA admission in 2013.',
      ],
      time: '6h ago',
      timeMs: Date.now() - 6 * 60 * 60 * 1000,
    },
    {
      id: 'n4',
      source: 'Chronicle',
      headline: 'Finance Centre Reports Record Funds Under Administration in Q1 2026',
      category: 'Finance',
      standfirst: 'Gibraltar\'s financial services sector posted a record £18.4 billion in funds under administration for the first quarter of 2026, driven by strong growth in distributed-ledger fund structures.',
      body: [
        'Gibraltar Finance has released figures showing that total funds under administration reached £18.4 billion at the end of Q1 2026, a 12% increase year-on-year and the highest figure since Gibraltar\'s financial services industry began publishing quarterly data. The growth has been attributed in particular to continued demand for Gibraltar\'s regulated Distributed Ledger Technology (DLT) framework, which attracted several new fund managers during the quarter.',
        'Minister for Financial Services Albert Isola described the figures as "a testament to the hard work of practitioners and the robustness of our regulatory environment." The gaming and fintech sectors also contributed to buoyant corporate services activity. The Finance Centre\'s annual conference is scheduled for October, where the updated five-year strategy for the sector is expected to be presented.',
      ],
      time: '8h ago',
      timeMs: Date.now() - 8 * 60 * 60 * 1000,
    },
    {
      id: 'n5',
      source: 'GBC',
      headline: 'Levanter Cloud Blankets the Rock as Summer Heat Builds',
      category: 'Weather',
      standfirst: 'The distinctive Levanter cloud cap has settled over the Upper Rock this week as easterly winds increase ahead of a warm spell expected to push temperatures above 30°C by the weekend.',
      body: [
        'The iconic Levanter cloud — Gibraltar\'s weather trademark — has been draping itself over the summit of the Rock since Tuesday, spilling over the western face before evaporating in the drier air below. The phenomenon, caused by moist easterly winds rising over the limestone massif and cooling, is familiar to all Gibraltarians but serves as a striking reminder of the territory\'s unique microclimate.',
        'The Met Office Gibraltar is forecasting that the easterly pattern will ease by Friday, giving way to a warm westerly flow that should bring clear skies and temperatures reaching 31–33°C over the weekend. Residents are advised to stay hydrated and to avoid prolonged exposure during the midday hours. The Nature Reserve paths, particularly those on the eastern face, may be slippery while the Levanter persists.',
      ],
      time: '10h ago',
      timeMs: Date.now() - 10 * 60 * 60 * 1000,
    },
    {
      id: 'n6',
      source: 'Panorama',
      headline: 'National Day Committee Unveils Plans for Landmark 2026 Celebration',
      category: 'National Day',
      standfirst: 'With the 59th anniversary of the 1967 sovereignty referendum approaching on 10 September, organisers have confirmed an expanded programme including a live stage at Governor\'s Parade and a fireworks finale from the Detached Mole.',
      body: [
        'The Gibraltar National Day Committee held its first public briefing of the year this week, outlining plans for what promises to be a landmark celebration. The 10 September 2026 programme will include the traditional children\'s fancy-dress gathering outside Parliament on Main Street, a community street party at John Mackintosh Square, and headline live acts at both Governor\'s Parade (the Piazzela) and Grand Casemates Square from early afternoon.',
        'New this year is a dedicated family funzone on Line Wall Road and an expanded food court celebrating Gibraltarian cuisine alongside international favourites. The evening will culminate with a fireworks display launched from the Detached Mole at 22:00. Organisers are urging residents to wear the national colours of red and white and to book restaurants early, as demand for the evening is already high. Exact headliner announcements are expected in late July.',
      ],
      time: '1d ago',
      timeMs: Date.now() - 26 * 60 * 60 * 1000,
    },
    {
      id: 'n7',
      source: 'GBC',
      headline: 'Port of Gibraltar Handles Record Cruise Passenger Numbers in May',
      category: 'Port & Shipping',
      standfirst: 'Gibraltar\'s port authority recorded over 42,000 cruise-ship visitors during May 2026, a 15% rise on the same month last year, placing renewed pressure on frontier crossing times at peak midday periods.',
      body: [
        'The Gibraltar Port Authority has confirmed that 42,300 cruise passengers disembarked across seventeen vessel calls during May 2026, making it the busiest May on record. The surge has brought a welcome boost to Main Street retailers and Grand Casemates Square restaurants, though it has also contributed to noticeably longer queues at the land frontier on days when multiple ships are in port simultaneously.',
        'The GBCA has urged day-trippers arriving by cruise ship to use the pedestrian crossing rather than hiring taxis, as the vehicle lanes are typically slower during midday peaks. Port officials said they are in discussions with the Spanish counterparts about coordinating staffing on high-volume days. The summer schedule shows a further concentration of cruise calls in June and July, with some weeks seeing three vessels in port on the same day.',
      ],
      time: '1d ago',
      timeMs: Date.now() - 30 * 60 * 60 * 1000,
    },
    {
      id: 'n8',
      source: 'Chronicle',
      headline: 'Online Gaming Sector Welcomes New Licensing Framework for AI-Assisted Platforms',
      category: 'Finance',
      standfirst: 'The Gibraltar Gambling Commissioner has published updated guidance covering AI-driven player-interaction tools, cementing Gibraltar\'s reputation as a forward-thinking jurisdiction for licensed operators.',
      body: [
        'The Gibraltar Gambling Commissioner has released a consultation paper setting out a new licensing pathway for online gaming operators that use artificial-intelligence tools for player interaction, responsible-gambling monitoring, and personalised content. The guidance, which follows 18 months of industry engagement, will come into force on 1 August 2026 for new licence applications and in January 2027 for existing holders.',
        'Industry body the Gibraltar Association of Online Gambling Operators (GAOGO) welcomed the clarity, with chair Melissa Penalver saying the framework "gives operators and investors the certainty needed to build next-generation products on the Rock." Gibraltar currently hosts dozens of licensed operators and the sector employs thousands of people locally. The Commissioner\'s office noted that AI tools used for advertising targeting will be subject to stricter conduct requirements under the new rules.',
      ],
      time: '2d ago',
      timeMs: Date.now() - 50 * 60 * 60 * 1000,
    },
  ];

  // ---- community noticeboard ----

  const INITIAL_NOTICES = [
    { id: 'nb1', type: 'Lost & Found', text: 'Lost: grey tabby cat, answers to Milo, last seen near Rosia Road on Tuesday evening. Please call Maria on 5400-XXXX.', poster: 'Maria R.', time: '3h ago' },
    { id: 'nb2', type: 'Neighbourhood', text: 'Reminder: communal bins on Castle Road will not be collected this Friday due to the public holiday. Next collection Saturday morning.', poster: 'Community Notice', time: '5h ago' },
    { id: 'nb3', type: 'Charity', text: 'St John\'s Church is collecting non-perishable food items for the Foodbank Gibraltar. Drop-off point at the church porch, Mon–Fri 09:00–17:00.', poster: 'Foodbank Gibraltar', time: '1d ago' },
    { id: 'nb4', type: 'Lost & Found', text: 'Found: set of house keys with a red carabiner clip, picked up on Main Street near the Cathedral. Contact YGTV community desk to claim.', poster: 'YGTV Community', time: '2d ago' },
  ];

  const SOURCES = ['All', 'GBC', 'Chronicle', 'Panorama', 'YGTV'];
  const CATEGORIES = ['All', 'Frontier', 'Health', 'Sport', 'Finance', 'Weather', 'National Day', 'Port & Shipping'];

  // ---- helpers ----

  function getBookmarks() { return RW.S.newsBookmarks = RW.S.newsBookmarks || []; }
  function getNotices() { return RW.S.newsNotices = RW.S.newsNotices || []; }

  function allNotices() {
    return INITIAL_NOTICES.concat(getNotices());
  }

  function isBookmarked(id) {
    return getBookmarks().indexOf(id) !== -1;
  }

  function getFilter() {
    return RW.S.newsFilter = RW.S.newsFilter || { source: 'All', category: 'All' };
  }

  function filteredArticles() {
    var f = getFilter();
    return ARTICLES.filter(function (a) {
      var srcOk = f.source === 'All' || a.source === f.source;
      var catOk = f.category === 'All' || a.category === f.category;
      return srcOk && catOk;
    });
  }

  function sourceLabel(src) {
    if (src === 'Chronicle') return 'Gibraltar Chronicle';
    if (src === 'YGTV') return 'YGTV';
    return src;
  }

  function categoryColour(cat) {
    var map = {
      Frontier: '#2563eb',
      Health: '#059669',
      Sport: '#d97706',
      Finance: '#7c3aed',
      Weather: '#0891b2',
      'National Day': '#dc2626',
      'Port & Shipping': '#475569',
    };
    return map[cat] || '#6b7280';
  }

  // ---- render helpers ----

  function renderChips(options, current, actName, paramName) {
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' +
      options.map(function (o) {
        var active = o === current;
        return '<button class="chip' + (active ? ' active' : '') + '" data-act="' + esc(actName) + '" data-' + paramName + '="' + esc(o) + '" style="' +
          (active ? 'background:var(--brand);color:#fff;border-color:var(--brand);' : '') +
          '">' + esc(o) + '</button>';
      }).join('') +
      '</div>';
  }

  function renderArticleCard(a) {
    var bm = isBookmarked(a.id);
    return '<div class="card" style="margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
        '<span style="font-size:11px;font-weight:700;color:var(--brand)">' + esc(sourceLabel(a.source)) + '</span>' +
        '<span style="font-size:11px;color:#fff;background:' + categoryColour(a.category) + ';border-radius:4px;padding:1px 6px">' + esc(a.category) + '</span>' +
        '<span style="font-size:11px;color:#999;margin-left:auto">' + esc(a.time) + '</span>' +
      '</div>' +
      '<div style="font-size:15px;font-weight:700;line-height:1.35;margin-bottom:5px;cursor:pointer" data-act="newsOpen" data-id="' + esc(a.id) + '">' + esc(a.headline) + '</div>' +
      '<div style="font-size:13px;color:#555;line-height:1.4;margin-bottom:10px">' + esc(a.standfirst) + '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn ghost sm" data-act="newsOpen" data-id="' + esc(a.id) + '">Read more</button>' +
        '<button class="btn ghost sm" data-act="newsBookmark" data-id="' + esc(a.id) + '">' +
          (bm ? '★ Saved' : '☆ Save') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderNoticeCard(n) {
    return '<div class="card" style="margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
        '<span style="font-size:11px;font-weight:700;color:var(--brand)">' + esc(n.type) + '</span>' +
        '<span style="font-size:11px;color:#999;margin-left:auto">' + esc(n.time) + '</span>' +
      '</div>' +
      '<div style="font-size:13px;line-height:1.45;margin-bottom:4px">' + esc(n.text) + '</div>' +
      '<div style="font-size:11px;color:#888">Posted by ' + esc(n.poster) + '</div>' +
    '</div>';
  }

  // ---- render ----

  function render(parts) {
    // article view
    if (parts && parts[1]) {
      var articleId = parts[1];
      var a = ARTICLES.find(function (x) { return x.id === articleId; });
      if (!a) {
        return RW.ui.screen({
          title: 'News',
          body: RW.ui.empty('📰', 'Article not found.', 'Back to News', '#/news'),
        });
      }
      var bm = isBookmarked(a.id);
      var body =
        '<div style="margin-bottom:14px;display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:12px;font-weight:700;color:var(--brand)">' + esc(sourceLabel(a.source)) + '</span>' +
          '<span style="font-size:11px;color:#fff;background:' + categoryColour(a.category) + ';border-radius:4px;padding:1px 6px">' + esc(a.category) + '</span>' +
          '<span style="font-size:12px;color:#999;margin-left:auto">' + esc(a.time) + '</span>' +
        '</div>' +
        '<h2 style="font-size:19px;font-weight:800;line-height:1.3;margin:0 0 10px">' + esc(a.headline) + '</h2>' +
        '<p style="font-size:14px;font-style:italic;color:#555;line-height:1.5;margin:0 0 16px;border-left:3px solid var(--brand);padding-left:10px">' + esc(a.standfirst) + '</p>' +
        a.body.map(function (para) {
          return '<p style="font-size:14px;line-height:1.6;margin:0 0 14px;color:#222">' + esc(para) + '</p>';
        }).join('') +
        '<div style="display:flex;gap:10px;margin-top:6px">' +
          '<button class="btn' + (bm ? '' : ' ghost') + '" data-act="newsBookmark" data-id="' + esc(a.id) + '">' +
            (bm ? '★ Bookmarked' : '☆ Bookmark') +
          '</button>' +
          '<button class="btn ghost" data-act="newsShare" data-id="' + esc(a.id) + '">Share</button>' +
        '</div>';
      return RW.ui.screen({ title: esc(sourceLabel(a.source)), body: body });
    }

    // saved / bookmarks tab
    if (parts && parts[1] === undefined && parts[0] === 'saved') {
      var savedIds = getBookmarks();
      var savedArticles = ARTICLES.filter(function (a) { return savedIds.indexOf(a.id) !== -1; });
      var body =
        RW.ui.sectionTitle('Saved Articles') +
        (savedArticles.length === 0
          ? RW.ui.empty('☆', 'No bookmarks yet. Tap ☆ Save on any article.')
          : savedArticles.map(renderArticleCard).join(''));
      return RW.ui.screen({ title: 'News', body: body });
    }

    var f = getFilter();
    var feed = filteredArticles();

    var filterBar =
      '<div style="margin-bottom:4px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em">Source</div>' +
      renderChips(SOURCES, f.source, 'newsFilter', 'source') +
      '<div style="margin-bottom:4px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em">Category</div>' +
      renderChips(CATEGORIES, f.category, 'newsFilter', 'category');

    var feedHtml = feed.length === 0
      ? RW.ui.empty('📰', 'No stories match your filters.', 'Clear filters', '#/news')
      : feed.map(renderArticleCard).join('');

    var savedCount = getBookmarks().length;
    var savedLink = savedCount > 0
      ? '<a href="#/news/saved" style="font-size:13px;color:var(--brand)">★ ' + savedCount + ' saved</a>'
      : '';

    var noticeHtml =
      RW.ui.sectionTitle('Community Noticeboard') +
      allNotices().map(renderNoticeCard).join('') +
      '<button class="btn ghost" style="width:100%;margin-top:4px" data-act="newsPostNotice">+ Post a Notice</button>';

    var body =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
        '<div style="font-size:13px;color:#666">Gibraltar news &amp; community</div>' +
        savedLink +
      '</div>' +
      '<div class="card" style="margin-bottom:14px">' + filterBar + '</div>' +
      RW.ui.sectionTitle('Latest') +
      feedHtml +
      noticeHtml;

    return RW.ui.screen({ title: 'News', body: body });
  }

  // ---- home card ----

  function homeCard() {
    var top = ARTICLES[0];
    return RW.ui.sectionTitle('Top Story', 'All news', '#/news') +
      '<div class="card" style="cursor:pointer" data-act="newsOpen" data-id="' + esc(top.id) + '">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">' +
          '<span style="font-size:11px;font-weight:700;color:var(--brand)">' + esc(sourceLabel(top.source)) + '</span>' +
          '<span style="font-size:11px;color:#fff;background:' + categoryColour(top.category) + ';border-radius:4px;padding:1px 6px">' + esc(top.category) + '</span>' +
          '<span style="font-size:11px;color:#999;margin-left:auto">' + esc(top.time) + '</span>' +
        '</div>' +
        '<div style="font-size:14px;font-weight:700;line-height:1.35">' + esc(top.headline) + '</div>' +
      '</div>';
  }

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
        var bm = getBookmarks();
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

      newsFilter: function (el) {
        var f = getFilter();
        if (el.dataset.source !== undefined) { f.source = el.dataset.source; }
        if (el.dataset.category !== undefined) { f.category = el.dataset.category; }
        RW.S.newsFilter = f;
        RW.store.save();
        RW.render();
      },

      newsShare: function (el) {
        var id = el.dataset.id;
        var a = ARTICLES.find(function (x) { return x.id === id; });
        if (!a) return;
        RW.toast('Link copied: ' + a.headline.substring(0, 40) + '…');
      },

      newsPostNotice: function () {
        var notices = getNotices();
        var text = window.prompt('Enter your community notice (max 200 chars):');
        if (!text || !text.trim()) { RW.toast('Notice cancelled'); return; }
        if (text.length > 200) { text = text.substring(0, 200); }
        notices.push({
          id: uid(),
          type: 'Community',
          text: text.trim(),
          poster: 'You',
          time: 'Just now',
        });
        RW.S.newsNotices = notices;
        RW.store.save();
        RW.toast('Notice posted to the noticeboard');
        RW.render();
      },
    },
  });
})(window.RW);
