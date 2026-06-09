/* Rockway feature — Property (browse, save and request viewings for Gibraltar properties). */
(function (RW) {
  'use strict';
  const { esc, money, uid, fmtDate } = RW.util;

  // ---- seed data — authentic Gibraltar areas & agents ----
  var LISTINGS = [
    // RENT
    {
      id: 'p-ov-r1', type: 'rent', area: 'Ocean Village', beds: 2, baths: 1,
      price: 2200, agent: 'Chestertons', agentUrl: 'chestertons.gi',
      title: '2-bed apartment, Ocean Village Marina',
      blurb: 'Modern marina-front apartment with full sea views, secure underground parking and 24-hour concierge. Moments from the casino and Ocean Village promenade.',
      features: ['Sea views', 'Parking', 'Concierge', 'Gym access'],
      floor: 4,
    },
    {
      id: 'p-ov-r2', type: 'rent', area: 'Ocean Village', beds: 1, baths: 1,
      price: 1650, agent: 'BMI', agentUrl: 'bmigroup.gi',
      title: '1-bed studio, Ocean Village',
      blurb: 'Contemporary studio steps from the casino and waterfront dining. Fully furnished, fast broadband — popular with online gaming professionals.',
      features: ['Furnished', 'Fast broadband', 'Waterfront'],
      floor: 2,
    },
    {
      id: 'p-mb-r1', type: 'rent', area: 'Marina Bay', beds: 3, baths: 2,
      price: 3400, agent: 'Seekers', agentUrl: 'seekerspropertygibraltar.com',
      title: '3-bed penthouse, Marina Bay',
      blurb: 'Spacious penthouse with wrap-around terrace and sweeping Algeciras Bay views. Double-height ceilings, bespoke kitchen and direct lift access.',
      features: ['Terrace', 'Bay views', 'Lift', 'Parking'],
      floor: 8,
    },
    {
      id: 'p-qq-r1', type: 'rent', area: 'Queensway Quay', beds: 2, baths: 2,
      price: 2750, agent: 'BFA', agentUrl: 'bfagib.com',
      title: '2-bed waterfront apartment, Queensway Quay',
      blurb: 'Luxury quayside living with private marina berth available. Walking distance to The Landings restaurant and the Queensway marina boardwalk.',
      features: ['Marina berth', 'Waterfront', 'Parking', 'Storage'],
      floor: 3,
    },
    {
      id: 'p-tw-r1', type: 'rent', area: 'Tradewinds', beds: 2, baths: 1,
      price: 1800, agent: 'Chestertons', agentUrl: 'chestertons.gi',
      title: '2-bed apartment, Tradewinds',
      blurb: 'Well-maintained development popular with finance-sector professionals. Easy access to Main Street, Morrisons and the frontier crossing.',
      features: ['Parking', 'Storage', 'Quiet block'],
      floor: 2,
    },
    {
      id: 'p-he-r1', type: 'rent', area: 'Hesperus', beds: 1, baths: 1,
      price: 1500, agent: 'BMI', agentUrl: 'bmigroup.gi',
      title: '1-bed apartment, Hesperus',
      blurb: 'Quiet residential block with easy access to Main Street and shops. Ideal first rental on the Rock — competitively priced and well-managed.',
      features: ['Quiet area', 'Near Main Street'],
      floor: 1,
    },
    {
      id: 'p-bw-r1', type: 'rent', area: 'Both Worlds', beds: 3, baths: 2,
      price: 2950, agent: 'Seekers', agentUrl: 'seekerspropertygibraltar.com',
      title: '3-bed townhouse, Both Worlds',
      blurb: 'Rare townhouse-style rental with private south-facing garden and Rock views. Generous storage and a double garage — almost impossible to find.',
      features: ['Private garden', 'Double garage', 'Rock views'],
      floor: 0,
    },
    {
      id: 'p-cb-r1', type: 'rent', area: 'Catalan Bay', beds: 2, baths: 1,
      price: 2100, agent: 'BFA', agentUrl: 'bfagib.com',
      title: '2-bed apartment, Catalan Bay',
      blurb: 'East-side beach village setting — wake up to the Mediterranean. Steps from La Caleta beach; a true escape from the bustle of Town.',
      features: ['Beach access', 'Sea views', 'Village setting'],
      floor: 1,
    },
    {
      id: 'p-to-r1', type: 'rent', area: 'Upper Town', beds: 1, baths: 1,
      price: 1600, agent: 'Chestertons', agentUrl: 'chestertons.gi',
      title: '1-bed flat, Upper Town',
      blurb: 'Character flat in the historic quarter, close to all amenities. Original Moorish-era archways, high ceilings and a tranquil rear courtyard.',
      features: ['Historic building', 'Courtyard', 'Near Main Street'],
      floor: 2,
    },
    {
      id: 'p-qq-r2', type: 'rent', area: 'Queensway Quay', beds: 1, baths: 1,
      price: 1900, agent: 'BMI', agentUrl: 'bmigroup.gi',
      title: '1-bed apartment, Queensway Quay',
      blurb: "Compact, stylish flat in one of Gibraltar’s premier waterfront addresses. All-day sun on the terrace; marina views from the living room.",
      features: ['Marina views', 'Terrace', 'Secure entry'],
      floor: 3,
    },
    // BUY
    {
      id: 'p-ov-b1', type: 'buy', area: 'Ocean Village', beds: 2, baths: 2,
      price: 750000, agent: 'Chestertons', agentUrl: 'chestertons.gi',
      title: '2-bed apartment, Ocean Village',
      blurb: 'Award-winning development with a strong rental yield track record; ideal for the online gaming community. Floor-to-ceiling glazing and a south-facing balcony.',
      features: ['Balcony', 'Parking', 'Concierge', 'Sea views'],
      floor: 5,
    },
    {
      id: 'p-ov-b2', type: 'buy', area: 'Ocean Village', beds: 3, baths: 2,
      price: 1250000, agent: 'BMI', agentUrl: 'bmigroup.gi',
      title: '3-bed penthouse, Ocean Village Marina',
      blurb: 'Panoramic views of the Rock and bay from every room; high-spec kitchen and bathrooms. One of the most sought-after addresses in Gibraltar.',
      features: ['Penthouse', 'Rock views', 'Bay views', 'Parking'],
      floor: 12,
    },
    {
      id: 'p-mb-b1', type: 'buy', area: 'Marina Bay', beds: 2, baths: 2,
      price: 695000, agent: 'Seekers', agentUrl: 'seekerspropertygibraltar.com',
      title: '2-bed apartment, Marina Bay',
      blurb: 'Sought-after Marina Bay address with direct sea access. Strong resale history and a loyal tenant base — excellent buy-to-let prospect.',
      features: ['Sea access', 'Parking', 'Terrace'],
      floor: 4,
    },
    {
      id: 'p-qq-b1', type: 'buy', area: 'Queensway Quay', beds: 3, baths: 3,
      price: 1650000, agent: 'BFA', agentUrl: 'bfagib.com',
      title: '3-bed duplex, Queensway Quay',
      blurb: "Exceptional duplex with a double-height living room and private roof terrace looking over the marina. Three en-suite bathrooms, wine cellar and maid’s room.",
      features: ['Roof terrace', 'Duplex', 'Marina views', 'Wine cellar'],
      floor: 6,
    },
    {
      id: 'p-tw-b1', type: 'buy', area: 'Tradewinds', beds: 2, baths: 1,
      price: 490000, agent: 'Chestertons', agentUrl: 'chestertons.gi',
      title: '2-bed apartment, Tradewinds',
      blurb: 'Popular development with a strong rental yield potential. Well-managed block, low service charges and easy access to the frontier — great entry-level purchase.',
      features: ['Parking', 'Storage', 'Low service charge'],
      floor: 3,
    },
    {
      id: 'p-he-b1', type: 'buy', area: 'Hesperus', beds: 1, baths: 1,
      price: 415000, agent: 'BMI', agentUrl: 'bmigroup.gi',
      title: '1-bed apartment, Hesperus',
      blurb: 'Competitively priced entry-level purchase in a quiet residential block. Ideal for a first-time buyer or investor seeking a low-maintenance property on the Rock.',
      features: ['Quiet block', 'Near Main Street'],
      floor: 2,
    },
    {
      id: 'p-bw-b1', type: 'buy', area: 'Both Worlds', beds: 4, baths: 3,
      price: 2100000, agent: 'Seekers', agentUrl: 'seekerspropertygibraltar.com',
      title: '4-bed villa, Both Worlds',
      blurb: "One of Gibraltar’s rare standalone villas — generous plot with a private pool, views of Spain and the Strait. A generational property that rarely comes to market.",
      features: ['Private pool', 'Garden', 'Spain views', 'Garage'],
      floor: 0,
    },
    {
      id: 'p-cb-b1', type: 'buy', area: 'Catalan Bay', beds: 2, baths: 1,
      price: 580000, agent: 'BFA', agentUrl: 'bfagib.com',
      title: '2-bed apartment, Catalan Bay (La Caleta)',
      blurb: 'East-side fishing-village charm; beach on your doorstep. A tranquil alternative to Town-side living with a tight-knit community feel.',
      features: ['Beach access', 'Sea views', 'Village community'],
      floor: 1,
    },
    {
      id: 'p-to-b1', type: 'buy', area: 'Upper Town', beds: 2, baths: 1,
      price: 520000, agent: 'Chestertons', agentUrl: 'chestertons.gi',
      title: '2-bed period flat, Upper Town',
      blurb: 'Converted 19th-century building with original features, high ceilings and a private courtyard. A rare slice of Gibraltar history at the heart of the old town.',
      features: ['Period features', 'Courtyard', 'Historic building'],
      floor: 1,
    },
    {
      id: 'p-to-b2', type: 'buy', area: 'Upper Town', beds: 3, baths: 2,
      price: 875000, agent: 'BMI', agentUrl: 'bmigroup.gi',
      title: '3-bed townhouse, Main Street quarter',
      blurb: 'Historic Main Street townhouse fully renovated to a luxury standard. Rooftop terrace with views of the harbour — character living at the heart of Gibraltar.',
      features: ['Roof terrace', 'Harbour views', 'Renovated', 'Character'],
      floor: 0,
    },
  ];

  var byId = {};
  LISTINGS.forEach(function (l) { byId[l.id] = l; });

  // ---- helpers ----

  // Format price with <span class="num"> for tabular styling.
  function fmtPriceNum(listing) {
    var raw;
    if (listing.type === 'rent') {
      raw = money(listing.price) + '/mo';
    } else {
      var p = listing.price;
      if (p >= 1000000) {
        raw = '£' + (p / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
      } else {
        raw = '£' + Math.round(p / 1000) + 'k';
      }
    }
    return '<span class="num">' + esc(raw) + '</span>';
  }

  // Plain string price for use in row sub-text (already escaped upstream).
  function fmtPriceStr(listing) {
    if (listing.type === 'rent') {
      return money(listing.price) + '/mo';
    }
    var p = listing.price;
    if (p >= 1000000) {
      return '£' + (p / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    return '£' + Math.round(p / 1000) + 'k';
  }

  function bedsLabel(n) { return n === 1 ? '1 bed' : n + ' beds'; }
  function bathsLabel(n) { return n === 1 ? '1 bath' : n + ' baths'; }

  function isSaved(id) {
    RW.S.savedProperties = RW.S.savedProperties || [];
    return RW.S.savedProperties.indexOf(id) !== -1;
  }

  function hasViewing(id) {
    RW.S.viewings = RW.S.viewings || [];
    return RW.S.viewings.some(function (v) { return v.listingId === id; });
  }

  // Accent colours per agent for visual identity.
  var AGENT_ACCENT = {
    'Chestertons': '#1a4ea3',
    'BMI':         '#0e7c5b',
    'Seekers':     '#7c3aed',
    'BFA':         '#c05621',
  };

  function agentAccent(agent) {
    return AGENT_ACCENT[agent] || '#1a4ea3';
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

  // ---- listing card (rich) ----
  function listingCard(l) {
    var saved = isSaved(l.id);
    var viewing = hasViewing(l.id);
    var accent = agentAccent(l.agent);

    var priceRow =
      '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">' +
      '<span style="font-size:20px;font-weight:900;color:' + accent + '">' + fmtPriceNum(l) + '</span>' +
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
      (viewing ? '<span class="pill-status ok" style="font-size:11px">✓ Viewing requested</span>' : '') +
      '</div>';

    var agentLine =
      '<div style="font-size:12px;color:var(--ash);margin-bottom:10px">' +
      '🏢 ' + esc(l.agent) + ' &middot; ' + esc(l.agentUrl) +
      '</div>';

    return '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-weight:800;font-size:15px;line-height:1.3;flex:1;margin-right:8px">' + esc(l.title) + '</div>' +
      heartBtn +
      '</div>' +
      agentLine +
      priceRow +
      chips +
      '<div style="font-size:13px;color:var(--ink60);line-height:1.5;margin-bottom:12px">' + esc(l.blurb) + '</div>' +
      '<button class="btn sm sea" data-act="propertyView" data-id="' + esc(l.id) + '">View details →</button>' +
      '</div>';
  }

  // ---- list view ----
  function list(tab) {
    var activeTab = tab || 'rent';
    RW.S.savedProperties = RW.S.savedProperties || [];
    RW.S.viewings = RW.S.viewings || [];

    var filtered = LISTINGS.filter(function (l) { return l.type === activeTab; });

    var seg =
      '<div class="seg" style="margin-bottom:20px">' +
      '<button data-act="propertyTab" data-tab="rent" class="' + (activeTab === 'rent' ? 'on' : '') + '">Rent</button>' +
      '<button data-act="propertyTab" data-tab="buy" class="' + (activeTab === 'buy' ? 'on' : '') + '">Buy</button>' +
      '</div>';

    var cards = filtered.map(listingCard).join('');

    // Saved section
    var savedSection = '';
    var savedListings = (RW.S.savedProperties || []).map(function (id) { return byId[id]; }).filter(Boolean);
    if (savedListings.length > 0) {
      var savedRows = savedListings.map(function (l) {
        return RW.ui.row({
          lead: areaEmoji(l.area),
          leadBg: agentAccent(l.agent) + '18',
          name: esc(l.title),
          sub: esc(l.area) + ' · ' + esc(fmtPriceStr(l)) + ' · ' + esc(l.agent),
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

    // Viewings section
    var viewingsSection = '';
    var viewings = RW.S.viewings || [];
    if (viewings.length > 0) {
      var vRows = viewings.slice().reverse().map(function (v) {
        var listing = byId[v.listingId];
        var agent = listing ? listing.agent : 'Agent';
        return RW.ui.row({
          lead: '📅',
          leadBg: '#fff3cd',
          name: esc(v.title),
          sub: esc(agent) + ' · Requested ' + esc(fmtDate(new Date(v.t).toISOString().slice(0, 10))),
          trail: '<span class="pill-status warn">Pending</span>',
        });
      }).join('');
      viewingsSection =
        RW.ui.sectionTitle('📅 Viewing Requests') +
        '<div class="card" style="padding-bottom:0">' + vRows + '</div>';
    } else {
      viewingsSection =
        RW.ui.sectionTitle('📅 Viewing Requests') +
        RW.ui.empty('📅', 'No viewing requests yet. Request one from any property detail page.');
    }

    var listLabel = activeTab === 'rent' ? 'Properties to Rent' : 'Properties for Sale';
    var body =
      seg +
      RW.ui.sectionTitle(listLabel) +
      (filtered.length ? cards : RW.ui.empty('🏘️', 'No listings available right now.')) +
      savedSection +
      viewingsSection;

    return RW.ui.screen({ title: 'Property', body: body });
  }

  // ---- detail view ----
  function detail(id) {
    RW.S.savedProperties = RW.S.savedProperties || [];
    RW.S.viewings = RW.S.viewings || [];

    var l = byId[id];
    if (!l) return list('rent');

    var saved = isSaved(id);
    var alreadyRequested = hasViewing(id);
    var accent = agentAccent(l.agent);

    // RW.ui.hero header with accent colour
    var heroSection = RW.ui.hero({
      emoji: l.type === 'rent' ? '🏢' : '🏠',
      title: l.title,
      sub: areaEmoji(l.area) + '  ' + l.area + '  ·  ' + l.agent,
      accent: accent,
      chips: [
        bedsLabel(l.beds),
        bathsLabel(l.baths),
        l.type === 'rent' ? 'To Rent' : 'For Sale',
        'Floor ' + l.floor,
      ],
    });

    // Key figures
    var priceCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div class="kv total" style="margin-bottom:4px">' +
      '<span>' + (l.type === 'rent' ? 'Monthly Rent' : 'Asking Price') + '</span>' +
      fmtPriceNum(l) +
      '</div>' +
      '<div class="kv"><span>Agent</span><span style="font-weight:700;color:' + accent + '">' + esc(l.agent) + '</span></div>' +
      '<div class="kv"><span>Area</span><span>' + esc(areaEmoji(l.area)) + ' ' + esc(l.area) + '</span></div>' +
      '<div class="kv"><span>Bedrooms</span><span class="num">' + l.beds + '</span></div>' +
      '<div class="kv"><span>Bathrooms</span><span class="num">' + l.baths + '</span></div>' +
      '<div class="kv"><span>Floor</span><span class="num">' + l.floor + '</span></div>' +
      '<div class="kv"><span>Type</span><span>' + esc(l.type === 'rent' ? 'Rental' : 'For Sale') + '</span></div>' +
      '</div>';

    // Description
    var blurbCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">About this property</div>' +
      '<div style="font-size:14px;line-height:1.6;color:var(--ink)">' + esc(l.blurb) + '</div>' +
      '</div>';

    // Feature chips
    var featureChips = '';
    if (l.features && l.features.length) {
      featureChips =
        '<div class="card" style="margin-bottom:12px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">Highlights</div>' +
        '<div class="chips">' +
        l.features.map(function (f) { return '<span class="chip">✔ ' + esc(f) + '</span>'; }).join('') +
        '</div></div>';
    }

    // Save + viewing actions
    var saveLabel = saved ? '❤️ Saved' : '♡ Save';
    var saveClass = saved ? 'btn ghost' : 'btn ghost';

    var actionsCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;gap:10px">' +
      '<button class="' + saveClass + '" data-act="propertySave" data-id="' + esc(id) + '" style="flex:1">' + saveLabel + '</button>' +
      (alreadyRequested
        ? '<button class="btn" disabled style="flex:1;opacity:.5;cursor:default;background:var(--green);border-color:var(--green)">✓ Viewing requested</button>'
        : '<button class="btn sea" data-act="propertyViewing" data-id="' + esc(id) + '" style="flex:1">Request viewing</button>') +
      '</div>' +
      '</div>';

    // Agent contact block
    var agentCard =
      '<div class="card" style="margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="width:46px;height:46px;border-radius:14px;background:' + accent + '18;display:grid;place-items:center;font-size:22px;flex:0 0 auto">🏢</div>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-weight:700;font-size:14.5px">' + esc(l.agent) + '</div>' +
      '<div style="font-size:12.5px;color:var(--ash)">' + esc(l.agentUrl) + '</div>' +
      '</div>' +
      '<span class="pill-status info" style="font-size:11px">Gibraltar</span>' +
      '</div>' +
      '</div>';

    var body = priceCard + blurbCard + featureChips + actionsCard + agentCard;

    return RW.ui.screen({ title: 'Property', hero: heroSection, body: body });
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

      propertyViewing: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.S.viewings = RW.S.viewings || [];
        var listing = byId[id];
        if (!listing) return;
        var already = RW.S.viewings.some(function (v) { return v.listingId === id; });
        if (already) {
          RW.toast('Viewing already requested for this property.');
          return;
        }
        var now = Date.now();
        RW.S.viewings.push({
          id: uid(),
          t: now,
          listingId: id,
          title: listing.title,
          when: now,
        });
        RW.store.save();
        RW.toast('Viewing request saved — contact ' + listing.agent + ' to arrange a time.');
        RW.render();
      },
    },
  });

  // ---- surface viewing activity ----
  RW.registerActivity(function () {
    RW.S.viewings = RW.S.viewings || [];
    return RW.S.viewings.map(function (v) {
      return {
        t: v.t,
        html: '<div class="card" style="margin-bottom:0">' +
          '<div style="font-weight:700;font-size:14px">🏘️ Viewing request</div>' +
          '<div style="font-size:13px;color:var(--ink60);margin-top:2px">' + esc(v.title) + '</div>' +
          '<div class="muted tiny" style="margin-top:4px">Requested ' + esc(fmtDate(new Date(v.t).toISOString().slice(0, 10))) + '</div>' +
          '</div>',
      };
    });
  });
})(window.RW);
