/* Rockway feature — Marketplace (Gibraltar buy & sell classifieds, mirroring Facebook "Buy & Sell" groups + GiBoard). */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime } = RW.util;

  // ---- Seed listings — authentic Gibraltar categories (furniture, electronics, bikes/scooters, baby, free, cars) ----
  const SEED = [
    {
      id: 'sl-1',
      title: 'IKEA KALLAX Shelving Unit (4x4)',
      price: '£45',
      priceNum: 45,
      category: 'Furniture',
      area: 'Ocean Village',
      seller: 'Maria L.',
      desc: 'White 4×4 KALLAX in good condition. A few scuffs on the base but solid. Collection from Ocean Village — no delivery. Bought from Morrisons last year.',
      t: Date.now() - 3 * 86400000,
    },
    {
      id: 'sl-2',
      title: 'iPhone 14 Pro 256 GB — Space Black',
      price: '£620 ono',
      priceNum: 620,
      category: 'Electronics',
      area: 'Main Street',
      seller: 'Dani G.',
      desc: 'Excellent condition. Comes with original box, charger and two cases. Face ID fully working, battery health 91%. Happy to meet on Main Street.',
      t: Date.now() - 1 * 86400000,
    },
    {
      id: 'sl-3',
      title: 'Vespa GTS 300 (2021) — Low Mileage',
      price: '£3,800',
      priceNum: 3800,
      category: 'Vehicles',
      area: 'Queensway Quay',
      seller: 'Tony R.',
      desc: 'Only 4,200 km. Brilliant for getting round the Rock. Serviced at Gibauto last month. MOT until Jan 2027. Log book ready. Ideal for commuting to the border.',
      t: Date.now() - 5 * 86400000,
    },
    {
      id: 'sl-4',
      title: 'Baby Jogger City Mini GT2 Pram',
      price: '£180',
      priceNum: 180,
      category: 'Baby & Kids',
      area: 'Midtown',
      seller: 'Sofia P.',
      desc: 'Used for 10 months. Folds flat, fits in most car boots. Rain cover included. Smoke-free and pet-free home. Collection Midtown or can drop locally.',
      t: Date.now() - 2 * 86400000,
    },
    {
      id: 'sl-5',
      title: 'Free — Wooden Pallets (x6)',
      price: 'Free',
      priceNum: 0,
      category: 'Free',
      area: 'North District',
      seller: 'Pete W.',
      desc: 'Six solid pine pallets from a business delivery. Great for garden projects or DIY. Must collect from North District, available from this Saturday.',
      t: Date.now() - 4 * 86400000,
    },
    {
      id: 'sl-6',
      title: 'VW Golf 1.6 TDI 2018 — Gibraltar Reg',
      price: '£12,500',
      priceNum: 12500,
      category: 'Vehicles',
      area: 'Catalan Bay',
      seller: 'James O.',
      desc: 'Full service history. One previous owner (local). Tax and MOT current. Bluetooth, DAB radio, parking sensors. Will consider part exchange. Viewings welcome at Catalan Bay.',
      t: Date.now() - 6 * 86400000,
    },
    {
      id: 'sl-7',
      title: 'Samsung 55" QLED 4K TV',
      price: '£350 ono',
      priceNum: 350,
      category: 'Electronics',
      area: 'Irish Town',
      seller: 'Lucia M.',
      desc: '2022 model, pristine. Wall bracket and remote included. Smart TV with Netflix/Disney+ pre-installed. Reason for sale: upgrading. Viewing welcome near Irish Town.',
      t: Date.now() - 2 * 86400000,
    },
    {
      id: 'sl-8',
      title: 'Folding Bike — Dahon Mariner D8',
      price: '£220',
      priceNum: 220,
      category: 'Bikes',
      area: 'Marina Bay',
      seller: 'Kezia A.',
      desc: 'Perfect for Gibraltar roads. Folds in seconds. Recently serviced at the Marina Bay bike shop. New tyres fitted. Lights included. Selling because I moved abroad.',
      t: Date.now() - 7 * 86400000,
    },
  ];

  const CATEGORIES = ['All', 'Furniture', 'Electronics', 'Vehicles', 'Baby & Kids', 'Bikes', 'Free'];

  // ---- Category colour map ----
  var CAT_STYLE = {
    'Furniture':   'background:#e8f0fe;color:#1a56db',
    'Electronics': 'background:#fef3c7;color:#92400e',
    'Vehicles':    'background:#f3f0ff;color:#5b21b6',
    'Baby & Kids': 'background:#fce7f3;color:#9d174d',
    'Bikes':       'background:#ecfdf5;color:#065f46',
    'Free':        'background:#d1fae5;color:#065f46',
  };

  // ---- helpers ----

  function activeFilter() {
    return RW._mktFilter || 'All';
  }

  function allListings() {
    // user listings newest-first, then seed (oldest first as posted)
    var userListings = (RW.S.listings || []).filter(function (l) { return l.type !== 'property'; }).slice().reverse();
    return userListings.concat(SEED);
  }

  function filteredListings() {
    var f = activeFilter();
    var all = allListings();
    if (f === 'All') return all;
    return all.filter(function (l) { return l.category === f; });
  }

  function isSaved(id) {
    RW.S.savedListings = RW.S.savedListings || [];
    return RW.S.savedListings.indexOf(id) !== -1;
  }

  // Category pill badge — always escapes cat
  function catPill(cat) {
    var style = CAT_STYLE[cat] || 'background:var(--cloud);color:var(--slate)';
    return '<span class="pill-status" style="' + style + ';font-size:11px;padding:3px 8px">' + esc(cat) + '</span>';
  }

  // Price badge — numeric prices use .num for tabular figures; zero = Free pill
  function priceBadge(l) {
    if (l.price === 'Free' || l.priceNum === 0) {
      return '<span class="pill-status ok" style="font-size:12px">Free</span>';
    }
    return '<span class="num" style="font-weight:800;font-size:16px;color:var(--ink)">' + esc(l.price) + '</span>';
  }

  function listingCard(l) {
    var saved = isSaved(l.id);
    var saveLabel = saved ? '♥ Saved' : '♡ Save';
    var saveCls = saved ? ' style="color:var(--brand)"' : '';
    var isOwn = l.seller === 'You';

    return '<div class="card" style="margin-bottom:12px">' +
      // Header: title left, price right
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">' +
        '<div style="font-weight:700;font-size:15px;line-height:1.3;flex:1">' + esc(l.title) + '</div>' +
        '<div style="flex:0 0 auto;text-align:right">' + priceBadge(l) + '</div>' +
      '</div>' +
      // Meta row: category pill, pin+area, seller (or "Your listing" badge)
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px">' +
        catPill(l.category) +
        '<span style="font-size:12px;color:var(--ash)">&#x1f4cd; ' + esc(l.area) + '</span>' +
        (isOwn
          ? '<span class="pill-status info" style="font-size:11px;padding:3px 8px;margin-left:auto">Your listing</span>'
          : '<span style="font-size:12px;color:var(--ash);margin-left:auto">&#x1f464; ' + esc(l.seller) + '</span>') +
      '</div>' +
      // Description
      '<div style="font-size:13px;color:var(--slate);line-height:1.5;margin-bottom:8px">' + esc(l.desc) + '</div>' +
      // Footer: timestamp + action buttons
      '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--mist);padding-top:10px">' +
        '<span style="font-size:11.5px;color:var(--fog)">' + fmtTime(l.t) + '</span>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn sm ghost"' + saveCls + ' data-act="mktSave" data-id="' + esc(l.id) + '">' + saveLabel + '</button>' +
          (isOwn
            ? '<span class="pill-status neutral" style="font-size:11px;padding:5px 10px">Active</span>'
            : '<button class="btn sm" data-act="mktMessage" data-id="' + esc(l.id) + '" data-seller="' + esc(l.seller) + '" data-title="' + esc(l.title) + '">Message</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- Post form ----
  function postForm() {
    var catOptions = CATEGORIES.filter(function (c) { return c !== 'All'; }).map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');

    return RW.ui.sectionTitle('Post an Item') +
      '<div class="card" style="margin-bottom:16px">' +
        '<label class="fld" style="margin-top:0">Title</label>' +
        '<input class="input" id="mkt-title" placeholder="e.g. Sofa, iPhone 14, Dahon Bike…" autocomplete="off">' +
        '<div class="grid2" style="margin-top:0">' +
          '<div>' +
            '<label class="fld">Price</label>' +
            '<input class="input" id="mkt-price" placeholder="e.g. £50 or Free">' +
          '</div>' +
          '<div>' +
            '<label class="fld">Category</label>' +
            '<select class="input" id="mkt-category">' + catOptions + '</select>' +
          '</div>' +
        '</div>' +
        '<label class="fld">Area (optional)</label>' +
        '<input class="input" id="mkt-area" placeholder="e.g. Ocean Village, Irish Town…" autocomplete="off">' +
        '<label class="fld">Description</label>' +
        '<textarea class="input" id="mkt-desc" rows="3" placeholder="Condition, size, collection notes…" style="resize:vertical;min-height:68px"></textarea>' +
        '<button class="btn" style="margin-top:14px" data-act="mktPost">&#x1f3f7;&#xfe0f; Post listing</button>' +
      '</div>';
  }

  // ---- Stats bar ----
  function statsBar(all) {
    var total = all.length;
    var freeCount = all.filter(function (l) { return l.priceNum === 0 || l.price === 'Free'; }).length;
    return '<div class="grid2" style="margin-bottom:16px">' +
      '<div class="stat">' +
        '<div class="n num">' + total + '</div>' +
        '<div class="l">Listings</div>' +
      '</div>' +
      '<div class="stat">' +
        '<div class="n num">' + freeCount + '</div>' +
        '<div class="l">Free items</div>' +
      '</div>' +
    '</div>';
  }

  function render() {
    RW.S.listings = RW.S.listings || [];
    RW.S.savedListings = RW.S.savedListings || [];

    var filter = activeFilter();

    // Hero banner
    var heroHtml = RW.ui.hero({
      emoji: '&#x1f3f7;&#xfe0f;',
      title: 'Gibraltar Buy & Sell',
      sub: 'Second-hand goods, vehicles, electronics & more — across the Rock',
      accent: '#d4112a',
    });

    // Category filter chips
    var chipItems = CATEGORIES.map(function (c) { return { label: c, value: c }; });
    var chipsBar = RW.ui.chips(chipItems, filter, 'mktFilter', true);

    // Stats (always over full unfiltered set)
    var statsHtml = statsBar(allListings());

    // Feed
    var feedItems = filteredListings();
    var feedHtml = feedItems.length
      ? feedItems.map(function (l) { return listingCard(l); }).join('')
      : RW.ui.empty('&#x1f50d;', 'No listings in this category yet.', 'Clear filter', '#/marketplace');

    var feedLabel = filter === 'All' ? 'Buy & Sell' : filter;
    var feedSection =
      RW.ui.sectionTitle(feedLabel, filter !== 'All' ? 'Clear' : '', filter !== 'All' ? '#/marketplace' : '') +
      feedHtml;

    // Your listings section (user-posted only, newest first)
    var myListings = (RW.S.listings || []).slice().reverse();
    var mySection = RW.ui.sectionTitle('Your Listings') +
      (myListings.length
        ? myListings.map(function (l) { return listingCard(l); }).join('')
        : RW.ui.empty('&#x1f4dd;', 'You haven’t posted any listings yet. Use the form above to get started!', '', ''));

    // Saved section
    var savedIds = RW.S.savedListings || [];
    var savedItems = savedIds.map(function (id) {
      return SEED.find(function (s) { return s.id === id; }) ||
             (RW.S.listings || []).find(function (s) { return s.id === id; });
    }).filter(Boolean);

    var savedSection = RW.ui.sectionTitle('Saved') +
      (savedItems.length
        ? savedItems.map(function (l) { return listingCard(l); }).join('')
        : RW.ui.empty('♡', 'Tap the heart on any listing to save it here.', '', ''));

    var body =
      statsHtml +
      postForm() +
      chipsBar +
      feedSection +
      '<div style="margin-top:4px">' + mySection + '</div>' +
      '<div style="margin-top:4px">' + savedSection + '</div>';

    return RW.ui.screen({ title: 'Market', hero: heroHtml, body: body });
  }

  // ---- Activity feed ----
  RW.registerActivity(function () {
    RW.S.listings = RW.S.listings || [];
    return RW.S.listings.map(function (l) {
      return {
        t: l.t,
        html: '<div class="card row">' +
          '<div class="lead">&#x1f3f7;&#xfe0f;</div>' +
          '<div class="body">' +
            '<div class="name">Listed: ' + esc(l.title) + '</div>' +
            '<div class="sub">' + esc(l.price) + ' · ' + esc(l.category) + ' · ' + fmtTime(l.t) + '</div>' +
          '</div>' +
          '<div class="trail"><span class="pill-status ok">Live</span></div>' +
        '</div>',
      };
    });
  });

  // ---- Register ----
  RW.register({
    id: 'marketplace',
    title: 'Market',
    emoji: '&#x1f3f7;&#xfe0f;',
    tileBg: '#fde7ea',
    section: 'services',
    order: 50,
    render: render,
    actions: {

      mktPost: function () {
        RW.S.listings = RW.S.listings || [];

        var titleEl = document.getElementById('mkt-title');
        var priceEl = document.getElementById('mkt-price');
        var catEl   = document.getElementById('mkt-category');
        var areaEl  = document.getElementById('mkt-area');
        var descEl  = document.getElementById('mkt-desc');

        if (!titleEl || !priceEl || !catEl || !descEl) return;

        var title    = titleEl.value.trim();
        var price    = priceEl.value.trim();
        var category = catEl.value.trim();
        var area     = (areaEl && areaEl.value.trim()) || 'Gibraltar';
        var desc     = descEl.value.trim();

        if (!title)    { RW.toast('Please enter a title for your listing.'); return; }
        if (!price)    { RW.toast('Please enter a price (or "Free").'); return; }
        if (!category) { RW.toast('Please choose a category.'); return; }

        // Parse a numeric price for sorting/display; free items = 0
        var priceNum = 0;
        var priceNorm = price.toLowerCase().replace(/,/g, '');
        if (priceNorm !== 'free') {
          var parsed = parseFloat(priceNorm.replace(/[^\d.]/g, ''));
          priceNum = isNaN(parsed) ? 0 : parsed;
        }

        var listing = {
          id: 'ul-' + uid(),
          t: Date.now(),
          title: title,
          price: price,
          priceNum: priceNum,
          category: category,
          area: area || 'Gibraltar',
          desc: desc || 'No description provided.',
          seller: 'You',
        };

        RW.S.listings.push(listing);
        RW.store.save();
        RW.toast('✅ Listing posted! It now appears in Buy & Sell.');
        RW.render();
      },

      mktSave: function (el) {
        RW.S.savedListings = RW.S.savedListings || [];
        var id = el.dataset.id;
        if (!id) return;

        var idx = RW.S.savedListings.indexOf(id);
        if (idx === -1) {
          RW.S.savedListings.push(id);
          RW.store.save();
          RW.toast('♥ Saved to your Saved listings.');
        } else {
          RW.S.savedListings.splice(idx, 1);
          RW.store.save();
          RW.toast('Removed from Saved listings.');
        }
        RW.render();
      },

      mktMessage: function (el) {
        var seller = el.dataset.seller || 'the seller';
        var title  = el.dataset.title  || 'this item';
        // Both seller and title come from data attributes which were esc()-encoded at render time;
        // re-escape raw values here for the toast (toast already escapes internally).
        RW.toast('Message sent to ' + seller + ' about "' + title + '".');
      },

      mktFilter: function (el) {
        var cat = el.dataset.v || 'All';
        RW._mktFilter = cat === 'All' ? null : cat;
        RW.render();
      },
    },
  });

  // ---- global search: classifieds ----
  RW.registerSearch(function (q) {
    var out = [];
    allListings().forEach(function (l) {
      if (l.type === 'property') return;
      var hay = (String(l.title || '') + ' ' + String(l.category || '') + ' ' + String(l.area || '')).toLowerCase();
      if (hay.indexOf(q) !== -1) out.push({ group: 'Buy & Sell', label: l.title, sub: (l.price || '') + ' \u00b7 ' + (l.area || 'Gibraltar'), route: '#/marketplace', lead: '\ud83c\udff7\ufe0f' });
    });
    return out;
  });

})(window.RW);
