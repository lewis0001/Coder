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

  // ---- helpers ----

  function activeFilter() {
    return RW._mktFilter || 'All';
  }

  function allListings() {
    // user listings first, then seed
    const userListings = (RW.S.listings || []).slice().reverse();
    return userListings.concat(SEED);
  }

  function filteredListings() {
    const f = activeFilter();
    const all = allListings();
    if (f === 'All') return all;
    return all.filter(function (l) { return l.category === f; });
  }

  function isSaved(id) {
    RW.S.savedListings = RW.S.savedListings || [];
    return RW.S.savedListings.indexOf(id) !== -1;
  }

  function listingCard(l, compact) {
    const saved = isSaved(l.id);
    const saveLabel = saved ? '♥ Saved' : '♡ Save';
    const saveStyle = saved ? 'color:var(--brand,#e0304e)' : '';
    const priceBadge = l.price === 'Free'
      ? '<span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700">Free</span>'
      : '<span style="font-weight:800;font-size:15px">' + esc(l.price) + '</span>';

    return '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<div style="flex:1">' +
          '<div style="font-weight:700;font-size:15px;margin-bottom:4px">' + esc(l.title) + '</div>' +
          '<div style="margin-bottom:6px">' + priceBadge + '</div>' +
          '<div style="font-size:12px;color:#666;margin-bottom:6px">' +
            '<span class="chip" style="margin-right:4px">' + esc(l.category) + '</span>' +
            '<span class="chip">' + esc(l.area) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:#444;line-height:1.45;margin-bottom:8px">' + esc(l.desc) + '</div>' +
          '<div style="font-size:12px;color:#888">Seller: <strong>' + esc(l.seller) + '</strong> · ' + fmtTime(l.t) + '</div>' +
        '</div>' +
      '</div>' +
      (compact ? '' :
        '<div style="display:flex;gap:8px;margin-top:10px;border-top:1px solid var(--rule,#f0f0f0);padding-top:10px">' +
          '<button class="btn sm ghost" data-act="mktSave" data-id="' + esc(l.id) + '" style="' + saveStyle + '">' + saveLabel + '</button>' +
          '<button class="btn sm" data-act="mktMessage" data-id="' + esc(l.id) + '" data-seller="' + esc(l.seller) + '" data-title="' + esc(l.title) + '">Message seller</button>' +
        '</div>') +
    '</div>';
  }

  function render() {
    RW.S.listings = RW.S.listings || [];
    RW.S.savedListings = RW.S.savedListings || [];

    const filter = activeFilter();

    // Category filter chips
    const chips = CATEGORIES.map(function (c) {
      const active = c === filter;
      return '<button class="chip' + (active ? ' on' : '') + '" data-act="mktFilter" data-cat="' + esc(c) + '" style="' +
        (active ? 'background:var(--brand,#e0304e);color:#fff;border-color:var(--brand,#e0304e)' : '') +
        '">' + esc(c) + '</button>';
    }).join(' ');

    const chipsBar = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">' + chips + '</div>';

    // Post form
    const postForm =
      RW.ui.sectionTitle('Post an Item') +
      '<div class="card" style="margin-bottom:14px">' +
        '<label class="fld" style="margin-top:0">Title</label>' +
        '<input class="input" id="mkt-title" placeholder="e.g. Sofa, iPhone, Bike…">' +
        '<label class="fld">Price</label>' +
        '<input class="input" id="mkt-price" placeholder="e.g. £50, Free, £120 ono">' +
        '<label class="fld">Category</label>' +
        '<select class="input" id="mkt-category">' +
          CATEGORIES.filter(function (c) { return c !== 'All'; }).map(function (c) {
            return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
          }).join('') +
        '</select>' +
        '<label class="fld">Description</label>' +
        '<textarea class="input" id="mkt-desc" rows="3" placeholder="Condition, size, collection area…" style="resize:vertical;min-height:64px"></textarea>' +
        '<button class="btn" style="margin-top:12px" data-act="mktPost">Post listing</button>' +
      '</div>';

    // Feed
    const feedItems = filteredListings();
    const feedHtml = feedItems.length
      ? feedItems.map(function (l) { return listingCard(l, false); }).join('')
      : RW.ui.empty('🔍', 'No listings in this category yet.');

    const feedSection = RW.ui.sectionTitle('Buy &amp; Sell', filter !== 'All' ? 'Clear filter' : '', filter !== 'All' ? '#/marketplace' : '') +
      feedHtml;

    // Your listings section
    const myListings = (RW.S.listings || []).slice().reverse();
    const mySection = myListings.length
      ? RW.ui.sectionTitle('Your Listings') +
        myListings.map(function (l) { return listingCard(l, false); }).join('')
      : '';

    // Saved section
    const savedIds = RW.S.savedListings || [];
    const savedItems = savedIds.map(function (id) {
      return SEED.find(function (s) { return s.id === id; }) ||
             (RW.S.listings || []).find(function (s) { return s.id === id; });
    }).filter(Boolean);

    const savedSection = savedItems.length
      ? RW.ui.sectionTitle('Saved') +
        savedItems.map(function (l) { return listingCard(l, false); }).join('')
      : '';

    const body =
      '<div class="muted tiny" style="margin-bottom:10px">Gibraltar Buy &amp; Sell — second-hand goods, vehicles, electronics &amp; more</div>' +
      postForm +
      chipsBar +
      feedSection +
      (mySection ? '<div style="margin-top:4px">' + mySection + '</div>' : '') +
      (savedSection ? '<div style="margin-top:4px">' + savedSection + '</div>' : '');

    return RW.ui.screen({ title: 'Market', body });
  }

  // ---- Activity feed ----
  RW.registerActivity(function () {
    RW.S.listings = RW.S.listings || [];
    return RW.S.listings.map(function (l) {
      return {
        t: l.t,
        html: '<div class="card row">' +
          '<div class="lead">🏷️</div>' +
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
    emoji: '🏷️',
    tileBg: '#fde7ea',
    section: 'services',
    order: 50,
    render: render,
    actions: {
      mktPost: function () {
        RW.S.listings = RW.S.listings || [];

        var titleEl = document.getElementById('mkt-title');
        var priceEl = document.getElementById('mkt-price');
        var catEl = document.getElementById('mkt-category');
        var descEl = document.getElementById('mkt-desc');

        if (!titleEl || !priceEl || !catEl || !descEl) return;

        var title = titleEl.value.trim();
        var price = priceEl.value.trim();
        var category = catEl.value.trim();
        var desc = descEl.value.trim();

        if (!title) { RW.toast('Please enter a title for your listing.'); return; }
        if (!price) { RW.toast('Please enter a price (or "Free").'); return; }
        if (!category) { RW.toast('Please choose a category.'); return; }

        var listing = {
          id: 'ul-' + uid(),
          t: Date.now(),
          title: title,
          price: price,
          priceNum: 0,
          category: category,
          area: 'Gibraltar',
          desc: desc || 'No description provided.',
          seller: 'You',
        };

        RW.S.listings.push(listing);
        RW.store.save();
        RW.toast('🏷️ Listing posted!');
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
          RW.toast('♥ Saved to your saved listings.');
        } else {
          RW.S.savedListings.splice(idx, 1);
          RW.store.save();
          RW.toast('Removed from saved listings.');
        }
        RW.render();
      },

      mktMessage: function (el) {
        var seller = el.dataset.seller || 'the seller';
        var title = el.dataset.title || 'this item';
        RW.toast('Message sent to ' + seller + ' about "' + title + '".');
      },

      mktFilter: function (el) {
        var cat = el.dataset.cat || 'All';
        RW._mktFilter = cat === 'All' ? null : cat;
        RW.render();
      },
    },
  });
})(window.RW);
