/* Rockway feature — Property (example Gibraltar listings, free community listings, honest link-outs). */
(function (RW) {
  'use strict';
  const { esc, uid, fmtDate, fmtTime } = RW.util;

  // ---- seed data — EXAMPLE listings only (de-branded; no real agency is attached) ----
  var LISTINGS = [
    // RENT
    {
      id: 'p-ov-r1', type: 'rent', area: 'Ocean Village', beds: 2, baths: 1,
      price: 2200, lister: 'Local agency',
      title: '2-bed apartment, Ocean Village Marina',
      blurb: 'Modern marina-front apartment with full sea views, secure underground parking and 24-hour concierge. Moments from the casino and Ocean Village promenade.',
      features: ['Sea views', 'Parking', 'Concierge', 'Gym access'],
      floor: 4,
    },
    {
      id: 'p-ov-r2', type: 'rent', area: 'Ocean Village', beds: 1, baths: 1,
      price: 1650, lister: 'Private landlord',
      title: '1-bed studio, Ocean Village',
      blurb: 'Contemporary studio steps from the casino and waterfront dining. Fully furnished, fast broadband — popular with online gaming professionals.',
      features: ['Furnished', 'Fast broadband', 'Waterfront'],
      floor: 2,
    },
    {
      id: 'p-mb-r1', type: 'rent', area: 'Marina Bay', beds: 3, baths: 2,
      price: 3400, lister: 'Local agency',
      title: '3-bed penthouse, Marina Bay',
      blurb: 'Spacious penthouse with wrap-around terrace and sweeping Algeciras Bay views. Double-height ceilings, bespoke kitchen and direct lift access.',
      features: ['Terrace', 'Bay views', 'Lift', 'Parking'],
      floor: 8,
    },
    {
      id: 'p-qq-r1', type: 'rent', area: 'Queensway Quay', beds: 2, baths: 2,
      price: 2750, lister: 'Managing agent',
      title: '2-bed waterfront apartment, Queensway Quay',
      blurb: 'Luxury quayside living with private marina berth available. Walking distance to The Landings restaurant and the Queensway marina boardwalk.',
      features: ['Marina berth', 'Waterfront', 'Parking', 'Storage'],
      floor: 3,
    },
    {
      id: 'p-tw-r1', type: 'rent', area: 'Tradewinds', beds: 2, baths: 1,
      price: 1800, lister: 'Managing agent',
      title: '2-bed apartment, Tradewinds',
      blurb: 'Well-maintained development popular with finance-sector professionals. Easy access to Main Street, Morrisons and the frontier crossing.',
      features: ['Parking', 'Storage', 'Quiet block'],
      floor: 2,
    },
    {
      id: 'p-he-r1', type: 'rent', area: 'Hesperus', beds: 1, baths: 1,
      price: 1500, lister: 'Private landlord',
      title: '1-bed apartment, Hesperus',
      blurb: 'Quiet residential block with easy access to Main Street and shops. Ideal first rental on the Rock — competitively priced and well-managed.',
      features: ['Quiet area', 'Near Main Street'],
      floor: 1,
    },
    {
      id: 'p-bw-r1', type: 'rent', area: 'Both Worlds', beds: 3, baths: 2,
      price: 2950, lister: 'Private landlord',
      title: '3-bed townhouse, Both Worlds',
      blurb: 'Rare townhouse-style rental with private south-facing garden and Rock views. Generous storage and a double garage — almost impossible to find.',
      features: ['Private garden', 'Double garage', 'Rock views'],
      floor: 0,
    },
    {
      id: 'p-cb-r1', type: 'rent', area: 'Catalan Bay', beds: 2, baths: 1,
      price: 2100, lister: 'Private landlord',
      title: '2-bed apartment, Catalan Bay',
      blurb: 'East-side beach village setting — wake up to the Mediterranean. Steps from La Caleta beach; a true escape from the bustle of Town.',
      features: ['Beach access', 'Sea views', 'Village setting'],
      floor: 1,
    },
    {
      id: 'p-to-r1', type: 'rent', area: 'Upper Town', beds: 1, baths: 1,
      price: 1600, lister: 'Private landlord',
      title: '1-bed flat, Upper Town',
      blurb: 'Character flat in the historic quarter, close to all amenities. Original Moorish-era archways, high ceilings and a tranquil rear courtyard.',
      features: ['Historic building', 'Courtyard', 'Near Main Street'],
      floor: 2,
    },
    {
      id: 'p-qq-r2', type: 'rent', area: 'Queensway Quay', beds: 1, baths: 1,
      price: 1900, lister: 'Managing agent',
      title: '1-bed apartment, Queensway Quay',
      blurb: "Compact, stylish flat in one of Gibraltar’s premier waterfront addresses. All-day sun on the terrace; marina views from the living room.",
      features: ['Marina views', 'Terrace', 'Secure entry'],
      floor: 3,
    },
    // BUY
    {
      id: 'p-ov-b1', type: 'buy', area: 'Ocean Village', beds: 2, baths: 2,
      price: 750000, lister: 'Local agency',
      title: '2-bed apartment, Ocean Village',
      blurb: 'Award-winning development with a strong rental yield track record; ideal for the online gaming community. Floor-to-ceiling glazing and a south-facing balcony.',
      features: ['Balcony', 'Parking', 'Concierge', 'Sea views'],
      floor: 5,
    },
    {
      id: 'p-ov-b2', type: 'buy', area: 'Ocean Village', beds: 3, baths: 2,
      price: 1250000, lister: 'Local agency',
      title: '3-bed penthouse, Ocean Village Marina',
      blurb: 'Panoramic views of the Rock and bay from every room; high-spec kitchen and bathrooms. One of the most sought-after addresses in Gibraltar.',
      features: ['Penthouse', 'Rock views', 'Bay views', 'Parking'],
      floor: 12,
    },
    {
      id: 'p-mb-b1', type: 'buy', area: 'Marina Bay', beds: 2, baths: 2,
      price: 695000, lister: 'Local agency',
      title: '2-bed apartment, Marina Bay',
      blurb: 'Sought-after Marina Bay address with direct sea access. Strong resale history and a loyal tenant base — excellent buy-to-let prospect.',
      features: ['Sea access', 'Parking', 'Terrace'],
      floor: 4,
    },
    {
      id: 'p-qq-b1', type: 'buy', area: 'Queensway Quay', beds: 3, baths: 3,
      price: 1650000, lister: 'Local agency',
      title: '3-bed duplex, Queensway Quay',
      blurb: "Exceptional duplex with a double-height living room and private roof terrace looking over the marina. Three en-suite bathrooms, wine cellar and maid’s room.",
      features: ['Roof terrace', 'Duplex', 'Marina views', 'Wine cellar'],
      floor: 6,
    },
    {
      id: 'p-tw-b1', type: 'buy', area: 'Tradewinds', beds: 2, baths: 1,
      price: 490000, lister: 'Managing agent',
      title: '2-bed apartment, Tradewinds',
      blurb: 'Popular development with a strong rental yield potential. Well-managed block, low service charges and easy access to the frontier — great entry-level purchase.',
      features: ['Parking', 'Storage', 'Low service charge'],
      floor: 3,
    },
    {
      id: 'p-he-b1', type: 'buy', area: 'Hesperus', beds: 1, baths: 1,
      price: 415000, lister: 'Private landlord',
      title: '1-bed apartment, Hesperus',
      blurb: 'Competitively priced entry-level purchase in a quiet residential block. Ideal for a first-time buyer or investor seeking a low-maintenance property on the Rock.',
      features: ['Quiet block', 'Near Main Street'],
      floor: 2,
    },
    {
      id: 'p-bw-b1', type: 'buy', area: 'Both Worlds', beds: 4, baths: 3,
      price: 2100000, lister: 'Local agency',
      title: '4-bed villa, Both Worlds',
      blurb: "One of Gibraltar’s rare standalone villas — generous plot with a private pool, views of Spain and the Strait. A generational property that rarely comes to market.",
      features: ['Private pool', 'Garden', 'Spain views', 'Garage'],
      floor: 0,
    },
    {
      id: 'p-cb-b1', type: 'buy', area: 'Catalan Bay', beds: 2, baths: 1,
      price: 580000, lister: 'Private landlord',
      title: '2-bed apartment, Catalan Bay (La Caleta)',
      blurb: 'East-side fishing-village charm; beach on your doorstep. A tranquil alternative to Town-side living with a tight-knit community feel.',
      features: ['Beach access', 'Sea views', 'Village community'],
      floor: 1,
    },
    {
      id: 'p-to-b1', type: 'buy', area: 'Upper Town', beds: 2, baths: 1,
      price: 520000, lister: 'Private landlord',
      title: '2-bed period flat, Upper Town',
      blurb: 'Converted 19th-century building with original features, high ceilings and a private courtyard. A rare slice of Gibraltar history at the heart of the old town.',
      features: ['Period features', 'Courtyard', 'Historic building'],
      floor: 1,
    },
    {
      id: 'p-to-b2', type: 'buy', area: 'Upper Town', beds: 3, baths: 2,
      price: 875000, lister: 'Local agency',
      title: '3-bed townhouse, Main Street quarter',
      blurb: 'Historic townhouse fully renovated to a luxury standard. Rooftop terrace with views of the harbour — character living at the heart of Gibraltar.',
      features: ['Roof terrace', 'Harbour views', 'Renovated', 'Character'],
      floor: 0,
    },
  ];

  var byId = {};
  LISTINGS.forEach(function (l) { byId[l.id] = l; });

  // External portals where Gibraltar actually searches today (honest link-outs).
  var PORTALS = [
    { label: 'propertygibraltar.com', url: 'https://www.propertygibraltar.com' },
    { label: 'chestertons.gi', url: 'https://www.chestertons.gi' },
    { label: 'bmigroup.gi', url: 'https://www.bmigroup.gi' },
  ];

  // ---- helpers ----

  // 'rent' → monthly; anything else ('buy'/'sale') → sale-style figure.
  function priceText(kindish, price) {
    var p = Number(price) || 0;
    if (kindish === 'rent') return '£' + Math.round(p).toLocaleString('en-GB') + '/mo';
    if (p >= 1000000) return '£' + (p / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (p >= 100000) return '£' + Math.round(p / 1000) + 'k';
    return '£' + Math.round(p).toLocaleString('en-GB');
  }

  // Price with <span class="num"> in plain ink (no rainbow — §5).
  function priceNum(kindish, price) {
    return '<span class="num">' + esc(priceText(kindish, price)) + '</span>';
  }

  function bedsLabel(n) { return n === 1 ? '1 bed' : n + ' beds'; }
  function bathsLabel(n) { return n === 1 ? '1 bath' : n + ' baths'; }

  function isSaved(id) {
    RW.S.savedProperties = RW.S.savedProperties || [];
    return RW.S.savedProperties.indexOf(id) !== -1;
  }

  // Legacy guard — old demo "viewing requests" may persist in saved state.
  function hasViewing(id) {
    RW.S.viewings = RW.S.viewings || [];
    return RW.S.viewings.some(function (v) { return v.listingId === id; });
  }

  // One neutral treatment for every listing — colour carries no meaning here.
  // (#3a4150 is the existing --slate from styles.css, not a new colour.)
  var NEUTRAL_ACCENT = '#3a4150';

  function listerIcon(lister) {
    return lister === 'Private landlord' ? '👤' : '🏢';
  }

  // Area emoji flag for flavour.
  var AREA_EMOJI = {
    'Ocean Village':  '⛵',
    'Marina Bay':     '⚓',
    'Queensway Quay': '🚤',
    'Tradewinds':     '🏗️',
    'Hesperus':       '🏠',
    'Both Worlds':    '🌿',
    'Catalan Bay':    '🏖️',
    'Upper Town':     '🏛️',
  };

  function areaEmoji(area) {
    return AREA_EMOJI[area] || '📍';
  }

  var EXAMPLE_PILL = '<span class="pill-status neutral" style="font-size:11px">Example</span>';
  var COMMUNITY_PILL = '<span class="pill-status info" style="font-size:11px">Community listing</span>';

  // ---- community (user) listings — namespaced in shared RW.S.listings via type:'property' ----

  function userListings() {
    RW.S.listings = RW.S.listings || [];
    return RW.S.listings.filter(function (l) { return l && l.type === 'property'; });
  }

  function getUserListing(id) {
    return userListings().find(function (l) { return l.id === id; }) || null;
  }

  function userTitle(l) {
    return bedsLabel(l.beds) + (l.kind === 'rent' ? ' to rent' : ' for sale') + ', ' + l.area;
  }

  // ---- example listing card ----
  function listingCard(l) {
    var saved = isSaved(l.id);

    var priceRow =
      '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">' +
      '<span style="font-size:20px;font-weight:800">' + priceNum(l.type, l.price) + '</span>' +
      (l.type === 'rent' ? '<span style="font-size:12px;color:var(--ash)">per month</span>' : '<span style="font-size:12px;color:var(--ash)">asking price</span>') +
      '</div>';

    var heartBtn =
      '<button class="btn sm ghost" data-act="propertySave" data-id="' + esc(l.id) + '" ' +
      'style="border:none;background:none;font-size:20px;padding:4px 6px;cursor:pointer;line-height:1" ' +
      'title="' + (saved ? 'Remove from saved' : 'Save property') + '">' +
      (saved ? '❤️' : '♡') +
      '</button>';

    var chips =
      '<div class="chips" style="margin-bottom:10px">' +
      '<span class="chip">🛏️ ' + esc(bedsLabel(l.beds)) + '</span>' +
      '<span class="chip">🚿 ' + esc(bathsLabel(l.baths)) + '</span>' +
      '<span class="chip">' + esc(areaEmoji(l.area)) + ' ' + esc(l.area) + '</span>' +
      '</div>';

    var listerLine =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<span style="font-size:12px;color:var(--ash)">' + esc(listerIcon(l.lister)) + ' ' + esc(l.lister) + '</span>' +
      EXAMPLE_PILL +
      '</div>';

    return '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-weight:800;font-size:15px;line-height:1.3;flex:1;margin-right:8px">' + esc(l.title) + '</div>' +
      heartBtn +
      '</div>' +
      listerLine +
      priceRow +
      chips +
      '<div style="font-size:13px;color:var(--ink60);line-height:1.5;margin-bottom:12px">' + esc(l.blurb) + '</div>' +
      '<button class="btn sm sea" data-act="propertyView" data-id="' + esc(l.id) + '">View details →</button>' +
      '</div>';
  }

  // ---- community listing card (renders first; deletable by the poster) ----
  function communityCard(l) {
    return '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">' +
      '<div style="font-weight:800;font-size:15px;line-height:1.3;flex:1">' + esc(userTitle(l)) + '</div>' +
      COMMUNITY_PILL +
      '</div>' +
      '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">' +
      '<span style="font-size:20px;font-weight:800">' + priceNum(l.kind, l.price) + '</span>' +
      (l.kind === 'rent' ? '<span style="font-size:12px;color:var(--ash)">per month</span>' : '<span style="font-size:12px;color:var(--ash)">asking price</span>') +
      '</div>' +
      '<div class="chips" style="margin-bottom:10px">' +
      '<span class="chip">🛏️ ' + esc(bedsLabel(l.beds)) + '</span>' +
      '<span class="chip">' + esc(areaEmoji(l.area)) + ' ' + esc(l.area) + '</span>' +
      '</div>' +
      (l.desc ? '<div style="font-size:13px;color:var(--ink60);line-height:1.5;margin-bottom:8px">' + esc(l.desc) + '</div>' : '') +
      '<div style="font-size:12.5px;color:var(--ash);margin-bottom:10px">📞 ' + esc(l.contact) + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--mist);padding-top:10px">' +
      '<span style="font-size:11.5px;color:var(--fog)">Listed ' + esc(fmtTime(l.t)) + '</span>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="btn sm ghost" data-act="propertyDelete" data-id="' + esc(l.id) + '">Remove</button>' +
      '<button class="btn sm sea" data-act="propertyView" data-id="' + esc(l.id) + '">View →</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  // ---- "List your property" form (the real product) ----
  function postForm(activeTab) {
    var areaOptions = Object.keys(AREA_EMOJI).concat(['Other']).map(function (a) {
      return '<option value="' + esc(a) + '">' + esc(a) + '</option>';
    }).join('');

    return RW.ui.sectionTitle('List your property') +
      '<div class="card" style="margin-bottom:16px">' +
      '<div style="font-size:13px;color:var(--ink60);line-height:1.5;margin-bottom:4px">Agents and landlords list free while Rockway launches. Your listing appears above the examples.</div>' +
      '<div class="grid2" style="margin-top:0">' +
      '<div>' +
      '<label class="fld">Listing type</label>' +
      '<select class="input" id="prop-kind">' +
      '<option value="rent"' + (activeTab === 'rent' ? ' selected' : '') + '>To rent</option>' +
      '<option value="sale"' + (activeTab === 'buy' ? ' selected' : '') + '>For sale</option>' +
      '</select>' +
      '</div>' +
      '<div>' +
      '<label class="fld">Area</label>' +
      '<select class="input" id="prop-area">' + areaOptions + '</select>' +
      '</div>' +
      '</div>' +
      '<div class="grid2" style="margin-top:0">' +
      '<div>' +
      '<label class="fld">Bedrooms</label>' +
      '<input class="input" id="prop-beds" type="number" min="1" max="20" placeholder="e.g. 2">' +
      '</div>' +
      '<div>' +
      '<label class="fld">Price (£)</label>' +
      '<input class="input" id="prop-price" type="number" min="1" placeholder="monthly rent or sale price">' +
      '</div>' +
      '</div>' +
      '<label class="fld">Contact</label>' +
      '<input class="input" id="prop-contact" placeholder="Phone, WhatsApp or email" autocomplete="off">' +
      '<label class="fld">One-line description</label>' +
      '<input class="input" id="prop-desc" placeholder="e.g. Bright 2-bed with terrace, available July" autocomplete="off">' +
      '<button class="btn" style="margin-top:14px" data-act="propertyPost">🏘️ List my property — free</button>' +
      '</div>';
  }

  // ---- "Where Gibraltar really searches" card (honest external link-outs) ----
  function portalsCard() {
    var chips = PORTALS.map(function (p) {
      return '<a class="chip" href="' + esc(p.url) + '" target="_blank" rel="noopener" ' +
        'style="text-decoration:none;color:inherit">' + esc(p.label) + ' ↗</a>';
    }).join('');

    return RW.ui.sectionTitle('Where Gibraltar really searches') +
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="font-size:13px;color:var(--ink60);line-height:1.5;margin-bottom:10px">Rockway has no live property feed yet. These external portals carry Gibraltar’s real listings today:</div>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="muted tiny" style="margin-top:8px">External sites — open in a new tab.</div>' +
      '</div>';
  }

  // ---- list view ----
  function list(tab) {
    var activeTab = tab || 'rent';
    RW.S.savedProperties = RW.S.savedProperties || [];
    RW.S.viewings = RW.S.viewings || [];

    var filtered = LISTINGS.filter(function (l) { return l.type === activeTab; });
    var kind = activeTab === 'rent' ? 'rent' : 'sale';
    var community = userListings().filter(function (l) { return l.kind === kind; }).slice().reverse();

    var seg =
      '<div class="seg" style="margin-bottom:20px">' +
      '<button data-act="propertyTab" data-tab="rent" class="' + (activeTab === 'rent' ? 'on' : '') + '">Rent</button>' +
      '<button data-act="propertyTab" data-tab="buy" class="' + (activeTab === 'buy' ? 'on' : '') + '">Buy</button>' +
      '</div>';

    // Community listings first, then the example seeds.
    var cards = community.map(communityCard).join('') + filtered.map(listingCard).join('');

    // Saved section
    var savedSection = '';
    var savedListings = (RW.S.savedProperties || []).map(function (id) {
      return byId[id] || getUserListing(id);
    }).filter(Boolean);
    if (savedListings.length > 0) {
      var savedRows = savedListings.map(function (l) {
        var seed = !!byId[l.id];
        var name = seed ? l.title : userTitle(l);
        var kindish = seed ? l.type : l.kind;
        return RW.ui.row({
          lead: areaEmoji(l.area),
          leadBg: 'var(--cloud)',
          name: name,
          sub: l.area + ' · ' + priceText(kindish, l.price) + ' · ' + (seed ? 'Example' : 'Community'),
          trail: '<button class="btn sm ghost" data-act="propertyView" data-id="' + esc(l.id) + '">View</button>',
        });
      }).join('');
      savedSection =
        RW.ui.sectionTitle('❤️ Saved Properties') +
        '<div class="card" style="padding-bottom:0">' + savedRows + '</div>';
    } else {
      savedSection =
        RW.ui.sectionTitle('❤️ Saved Properties') +
        RW.ui.empty('♡', 'No saved properties yet. Tap ♡ on any listing to save it.');
    }

    // Legacy demo viewing requests — shown honestly only if old state exists.
    var viewingsSection = '';
    var viewings = RW.S.viewings || [];
    if (viewings.length > 0) {
      var vRows = viewings.slice().reverse().map(function (v) {
        return RW.ui.row({
          lead: '📅',
          leadBg: 'var(--cloud)',
          name: v.title,
          sub: 'Saved on this device only — never sent · ' + fmtDate(new Date(v.t).toISOString().slice(0, 10)),
          trail: '<span class="pill-status neutral">Demo</span>',
        });
      }).join('');
      viewingsSection =
        RW.ui.sectionTitle('📅 Demo viewing requests') +
        '<div class="card" style="padding-bottom:0">' + vRows + '</div>';
    }

    var listLabel = activeTab === 'rent' ? 'Properties to Rent' : 'Properties for Sale';
    var body =
      seg +
      postForm(activeTab) +
      RW.ui.sectionTitle(listLabel) +
      '<div class="muted tiny" style="margin:-4px 0 10px">Example listings shown until launch — community listings appear first.</div>' +
      (cards || RW.ui.empty('🏘️', 'No listings available right now.')) +
      portalsCard() +
      savedSection +
      viewingsSection;

    return RW.ui.screen({ title: 'Property', body: body });
  }

  // ---- detail: example seed listing ----
  function seedDetail(l) {
    var saved = isSaved(l.id);
    var legacyViewing = hasViewing(l.id);

    var heroSection = RW.ui.hero({
      emoji: l.type === 'rent' ? '🏢' : '🏠',
      title: l.title,
      sub: areaEmoji(l.area) + '  ' + l.area + '  ·  ' + l.lister,
      accent: NEUTRAL_ACCENT,
      chips: [
        bedsLabel(l.beds),
        bathsLabel(l.baths),
        l.type === 'rent' ? 'To Rent' : 'For Sale',
        'Floor ' + l.floor,
        'Example',
      ],
    });

    var priceCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div class="kv total" style="margin-bottom:4px">' +
      '<span>' + (l.type === 'rent' ? 'Monthly Rent' : 'Asking Price') + '</span>' +
      priceNum(l.type, l.price) +
      '</div>' +
      '<div class="kv"><span>Status</span>' + EXAMPLE_PILL + '</div>' +
      '<div class="kv"><span>Listed by</span><span>' + esc(l.lister) + '</span></div>' +
      '<div class="kv"><span>Area</span><span>' + esc(areaEmoji(l.area)) + ' ' + esc(l.area) + '</span></div>' +
      '<div class="kv"><span>Bedrooms</span><span class="num">' + l.beds + '</span></div>' +
      '<div class="kv"><span>Bathrooms</span><span class="num">' + l.baths + '</span></div>' +
      '<div class="kv"><span>Floor</span><span class="num">' + l.floor + '</span></div>' +
      '<div class="kv"><span>Type</span><span>' + esc(l.type === 'rent' ? 'Rental' : 'For Sale') + '</span></div>' +
      '</div>';

    var blurbCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">About this property</div>' +
      '<div style="font-size:14px;line-height:1.6;color:var(--ink)">' + esc(l.blurb) + '</div>' +
      '</div>';

    var featureChips = '';
    if (l.features && l.features.length) {
      featureChips =
        '<div class="card" style="margin-bottom:12px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">Highlights</div>' +
        '<div class="chips">' +
        l.features.map(function (f) { return '<span class="chip">✔ ' + esc(f) + '</span>'; }).join('') +
        '</div></div>';
    }

    var saveLabel = saved ? '❤️ Saved' : '♡ Save';
    var actionsCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;gap:10px">' +
      '<button class="btn ghost" data-act="propertySave" data-id="' + esc(l.id) + '" style="flex:1">' + saveLabel + '</button>' +
      '<button class="btn sea" data-act="propertyEnquire" style="flex:1">Enquire when live</button>' +
      '</div>' +
      '<div class="muted tiny" style="margin-top:8px">Example listing — not a real property; nothing is sent to anyone.</div>' +
      (legacyViewing ? '<div class="muted tiny" style="margin-top:4px">An earlier demo enquiry is saved on this device only — it was never sent.</div>' : '') +
      '</div>';

    var listerCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="width:46px;height:46px;border-radius:14px;background:var(--cloud);display:grid;place-items:center;font-size:22px;flex:0 0 auto">' + esc(listerIcon(l.lister)) + '</div>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-weight:700;font-size:14.5px">' + esc(l.lister) + '</div>' +
      '<div style="font-size:12.5px;color:var(--ash)">Generic example — no real agency or landlord is attached</div>' +
      '</div>' +
      EXAMPLE_PILL +
      '</div>' +
      '</div>';

    var body = priceCard + blurbCard + featureChips + actionsCard + listerCard;
    return RW.ui.screen({ title: 'Property', hero: heroSection, body: body });
  }

  // ---- detail: community listing ----
  function communityDetail(l) {
    var heroSection = RW.ui.hero({
      emoji: l.kind === 'rent' ? '🏢' : '🏠',
      title: userTitle(l),
      sub: areaEmoji(l.area) + '  ' + l.area + '  ·  Community listing',
      accent: NEUTRAL_ACCENT,
      chips: [bedsLabel(l.beds), l.kind === 'rent' ? 'To Rent' : 'For Sale'],
    });

    var priceCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div class="kv total" style="margin-bottom:4px">' +
      '<span>' + (l.kind === 'rent' ? 'Monthly Rent' : 'Asking Price') + '</span>' +
      priceNum(l.kind, l.price) +
      '</div>' +
      '<div class="kv"><span>Status</span>' + COMMUNITY_PILL + '</div>' +
      '<div class="kv"><span>Area</span><span>' + esc(areaEmoji(l.area)) + ' ' + esc(l.area) + '</span></div>' +
      '<div class="kv"><span>Bedrooms</span><span class="num">' + esc(String(l.beds)) + '</span></div>' +
      '<div class="kv"><span>Listed</span><span>' + esc(fmtDate(new Date(l.t).toISOString().slice(0, 10))) + '</span></div>' +
      '<div class="kv"><span>Contact</span><span>' + esc(l.contact) + '</span></div>' +
      '</div>';

    var descCard = l.desc
      ? '<div class="card" style="margin-bottom:12px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Description</div>' +
        '<div style="font-size:14px;line-height:1.6;color:var(--ink)">' + esc(l.desc) + '</div>' +
        '</div>'
      : '';

    var actionsCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<button class="btn ghost" data-act="propertyDelete" data-id="' + esc(l.id) + '" style="width:100%">Remove my listing</button>' +
      '<div class="muted tiny" style="margin-top:8px">Stored on this device for now — listings go live to everyone at launch.</div>' +
      '</div>';

    var body = priceCard + descCard + actionsCard;
    return RW.ui.screen({ title: 'Property', hero: heroSection, body: body });
  }

  function detail(id) {
    RW.S.savedProperties = RW.S.savedProperties || [];
    RW.S.viewings = RW.S.viewings || [];

    if (byId[id]) return seedDetail(byId[id]);
    var mine = getUserListing(id);
    if (mine) return communityDetail(mine);
    return list(RW.S.propertyTab || 'rent');
  }

  // ---- render dispatcher ----
  function render(parts) {
    if (parts && parts[0]) {
      return detail(parts[0]);
    }
    var tab = RW.S.propertyTab || 'rent';
    return list(tab);
  }

  RW.register({
    id: 'property',
    title: 'Property',
    emoji: '🏘️',
    tileBg: '#e6effc',
    section: 'services',
    order: 40,
    render: render,
    actions: {
      propertyTab: function (el) {
        var tab = el.dataset.tab || 'rent';
        RW.S.propertyTab = tab;
        RW.store.save();
        RW.render();
      },

      propertyView: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.go('#/property/' + id);
      },

      propertySave: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.S.savedProperties = RW.S.savedProperties || [];
        var idx = RW.S.savedProperties.indexOf(id);
        if (idx === -1) {
          RW.S.savedProperties.push(id);
          RW.toast('Property saved ❤️');
        } else {
          RW.S.savedProperties.splice(idx, 1);
          RW.toast('Removed from saved.');
        }
        RW.store.save();
        RW.render();
      },

      // Honest replacement for the old fake "viewing request".
      propertyEnquire: function () {
        RW.toast('Real listings open with launch — agents & landlords can list free');
      },

      propertyPost: function () {
        RW.S.listings = RW.S.listings || [];

        var kindEl    = document.getElementById('prop-kind');
        var areaEl    = document.getElementById('prop-area');
        var bedsEl    = document.getElementById('prop-beds');
        var priceEl   = document.getElementById('prop-price');
        var contactEl = document.getElementById('prop-contact');
        var descEl    = document.getElementById('prop-desc');
        if (!kindEl || !areaEl || !bedsEl || !priceEl || !contactEl || !descEl) return;

        var kind    = kindEl.value === 'sale' ? 'sale' : 'rent';
        var area    = areaEl.value || 'Other';
        var beds    = parseInt(bedsEl.value, 10);
        var price   = parseFloat(String(priceEl.value).replace(/[^\d.]/g, ''));
        var contact = contactEl.value.trim();
        var desc    = descEl.value.trim().slice(0, 160);

        if (isNaN(beds) || beds < 1 || beds > 20) { RW.toast('Enter bedrooms (1–20).'); return; }
        if (isNaN(price) || price <= 0) { RW.toast('Enter a price in £.'); return; }
        if (!contact) { RW.toast('Add a contact (phone or email) so people can reach you.'); return; }

        RW.S.listings.push({
          id: 'pl-' + uid(),
          t: Date.now(),
          type: 'property',
          kind: kind,
          area: area,
          beds: beds,
          price: price,
          contact: contact,
          desc: desc,
        });
        RW.S.propertyTab = kind === 'sale' ? 'buy' : 'rent';
        RW.store.save();
        RW.toast('✓ Listed free — your property now shows above the examples.');
        RW.render();
      },

      propertyDelete: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.S.listings = RW.S.listings || [];
        var idx = -1;
        RW.S.listings.forEach(function (l, i) {
          if (idx === -1 && l && l.type === 'property' && l.id === id) idx = i;
        });
        if (idx === -1) return;
        RW.S.listings.splice(idx, 1);
        RW.S.savedProperties = RW.S.savedProperties || [];
        var sIdx = RW.S.savedProperties.indexOf(id);
        if (sIdx !== -1) RW.S.savedProperties.splice(sIdx, 1);
        RW.store.save();
        RW.toast('Listing removed.');
        if ((location.hash || '').indexOf(id) !== -1) {
          RW.go('#/property');
        } else {
          RW.render();
        }
      },
    },
  });

  // ---- surface community listings + legacy demo viewings in Activity ----
  RW.registerActivity(function () {
    RW.S.viewings = RW.S.viewings || [];
    var legacy = RW.S.viewings.map(function (v) {
      return {
        t: v.t,
        html: '<div class="card" style="margin-bottom:0">' +
          '<div style="font-weight:700;font-size:14px">🏘️ Viewing request <span class="pill-status neutral" style="font-size:11px">Demo</span></div>' +
          '<div style="font-size:13px;color:var(--ink60);margin-top:2px">' + esc(v.title) + '</div>' +
          '<div class="muted tiny" style="margin-top:4px">Saved on this device only — never sent · ' + esc(fmtDate(new Date(v.t).toISOString().slice(0, 10))) + '</div>' +
          '</div>',
      };
    });
    var mine = userListings().map(function (l) {
      return {
        t: l.t,
        html: '<div class="card" style="margin-bottom:0">' +
          '<div style="font-weight:700;font-size:14px">🏘️ Property listed ' + COMMUNITY_PILL + '</div>' +
          '<div style="font-size:13px;color:var(--ink60);margin-top:2px">' + esc(userTitle(l)) + ' · ' + esc(priceText(l.kind, l.price)) + '</div>' +
          '<div class="muted tiny" style="margin-top:4px">Listed ' + esc(fmtTime(l.t)) + '</div>' +
          '</div>',
      };
    });
    return legacy.concat(mine);
  });

  // ---- global search: property ----
  RW.registerSearch(function (q) {
    var out = [];
    (RW.S.listings || []).forEach(function (l) {
      if (l.type !== 'property') return;
      var hay = (String(l.area || '') + ' ' + String(l.desc || '') + ' ' + String(l.beds || '') + ' bed').toLowerCase();
      if (hay.indexOf(q) !== -1) out.push({ group: 'Property', label: (l.beds || '?') + '-bed \u00b7 ' + (l.area || 'Gibraltar'), sub: 'Community listing \u00b7 \u00a3' + (l.price || '?'), route: '#/property', lead: '\ud83c\udfe0' });
    });
    LISTINGS.forEach(function (l) {
      var hay = (String(l.title) + ' ' + String(l.area) + ' ' + String(l.blurb || '') + ' ' + l.beds + ' bed').toLowerCase();
      if (hay.indexOf(q) !== -1) out.push({ group: 'Property', label: l.title, sub: l.area + ' \u00b7 \u00a3' + l.price + (l.type === 'rent' ? '/mo' : '') + ' \u00b7 Example', route: '#/property/' + l.id, lead: '\ud83c\udfe0' });
    });
    return out;
  });

})(window.RW);
