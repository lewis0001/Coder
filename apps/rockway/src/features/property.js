/* Rockway feature — Property (browse, save and request viewings for Gibraltar properties). */
(function (RW) {
  'use strict';
  const { esc, money, uid, fmtDate, fmtTime } = RW.util;

  // ---- seed data — authentic Gibraltar areas & agents ----
  var LISTINGS = [
    // RENT
    {
      id: 'p-ov-r1', type: 'rent', area: 'Ocean Village', beds: 2, baths: 1,
      price: 2200, agent: 'Chestertons',
      title: '2-bed apartment, Ocean Village Marina',
      blurb: 'Modern marina-front apartment with sea views and secure parking.',
    },
    {
      id: 'p-ov-r2', type: 'rent', area: 'Ocean Village', beds: 1, baths: 1,
      price: 1650, agent: 'BMI',
      title: '1-bed studio, Ocean Village',
      blurb: 'Contemporary studio steps from the casino and waterfront dining.',
    },
    {
      id: 'p-mb-r1', type: 'rent', area: 'Marina Bay', beds: 3, baths: 2,
      price: 3400, agent: 'Seekers',
      title: '3-bed penthouse, Marina Bay',
      blurb: 'Spacious penthouse with wrap-around terrace and Algeciras Bay views.',
    },
    {
      id: 'p-qq-r1', type: 'rent', area: 'Queensway Quay', beds: 2, baths: 2,
      price: 2750, agent: 'BFA',
      title: '2-bed waterfront apartment, Queensway Quay',
      blurb: 'Luxury quayside living with private marina berth available.',
    },
    {
      id: 'p-tw-r1', type: 'rent', area: 'Tradewinds', beds: 2, baths: 1,
      price: 1800, agent: 'Chestertons',
      title: '2-bed apartment, Tradewinds',
      blurb: 'Well-maintained development popular with finance-sector professionals.',
    },
    {
      id: 'p-he-r1', type: 'rent', area: 'Hesperus', beds: 1, baths: 1,
      price: 1500, agent: 'BMI',
      title: '1-bed apartment, Hesperus',
      blurb: 'Quiet residential block with easy access to Main Street and shops.',
    },
    {
      id: 'p-bw-r1', type: 'rent', area: 'Both Worlds', beds: 3, baths: 2,
      price: 2950, agent: 'Seekers',
      title: '3-bed townhouse, Both Worlds',
      blurb: 'Rare townhouse-style rental with private garden and Rock views.',
    },
    {
      id: 'p-cb-r1', type: 'rent', area: 'Catalan Bay', beds: 2, baths: 1,
      price: 2100, agent: 'BFA',
      title: '2-bed apartment, Catalan Bay',
      blurb: 'East-side beach village setting — wake up to the Mediterranean.',
    },
    {
      id: 'p-to-r1', type: 'rent', area: 'Town / Upper Town', beds: 1, baths: 1,
      price: 1600, agent: 'Chestertons',
      title: '1-bed flat, Upper Town',
      blurb: 'Character flat in the historic quarter, close to all amenities.',
    },
    {
      id: 'p-qq-r2', type: 'rent', area: 'Queensway Quay', beds: 1, baths: 1,
      price: 1900, agent: 'BMI',
      title: '1-bed apartment, Queensway Quay',
      blurb: 'Compact, stylish flat in one of Gibraltar\'s premier waterfront addresses.',
    },
    // BUY
    {
      id: 'p-ov-b1', type: 'buy', area: 'Ocean Village', beds: 2, baths: 2,
      price: 750000, agent: 'Chestertons',
      title: '2-bed apartment, Ocean Village',
      blurb: 'Award-winning development; ideal for the online gaming community.',
    },
    {
      id: 'p-ov-b2', type: 'buy', area: 'Ocean Village', beds: 3, baths: 2,
      price: 1250000, agent: 'BMI',
      title: '3-bed penthouse, Ocean Village Marina',
      blurb: 'Panoramic Rock and bay views; high-spec finishes throughout.',
    },
    {
      id: 'p-mb-b1', type: 'buy', area: 'Marina Bay', beds: 2, baths: 2,
      price: 695000, agent: 'Seekers',
      title: '2-bed apartment, Marina Bay',
      blurb: 'Sought-after Marina Bay address with direct sea access.',
    },
    {
      id: 'p-qq-b1', type: 'buy', area: 'Queensway Quay', beds: 3, baths: 3,
      price: 1650000, agent: 'BFA',
      title: '3-bed duplex, Queensway Quay',
      blurb: 'Exceptional duplex; double-height living room and roof terrace.',
    },
    {
      id: 'p-tw-b1', type: 'buy', area: 'Tradewinds', beds: 2, baths: 1,
      price: 490000, agent: 'Chestertons',
      title: '2-bed apartment, Tradewinds',
      blurb: 'Popular development; strong rental yield potential.',
    },
    {
      id: 'p-he-b1', type: 'buy', area: 'Hesperus', beds: 1, baths: 1,
      price: 415000, agent: 'BMI',
      title: '1-bed apartment, Hesperus',
      blurb: 'Competitively priced entry-level purchase in a quiet residential block.',
    },
    {
      id: 'p-bw-b1', type: 'buy', area: 'Both Worlds', beds: 4, baths: 3,
      price: 2100000, agent: 'Seekers',
      title: '4-bed villa, Both Worlds',
      blurb: 'One of Gibraltar\'s rare standalone villas — generous plot, views of Spain.',
    },
    {
      id: 'p-cb-b1', type: 'buy', area: 'Catalan Bay', beds: 2, baths: 1,
      price: 580000, agent: 'BFA',
      title: '2-bed apartment, Catalan Bay (La Caleta)',
      blurb: 'East-side fishing-village charm; beach on your doorstep.',
    },
    {
      id: 'p-to-b1', type: 'buy', area: 'Town / Upper Town', beds: 2, baths: 1,
      price: 520000, agent: 'Chestertons',
      title: '2-bed period flat, Upper Town',
      blurb: 'Converted 19th-century building with original features and courtyards.',
    },
    {
      id: 'p-to-b2', type: 'buy', area: 'Town / Upper Town', beds: 3, baths: 2,
      price: 875000, agent: 'BMI',
      title: '3-bed townhouse, Main Street quarter',
      blurb: 'Historic Main Street townhouse — character living at the heart of Gibraltar.',
    },
  ];

  var byId = {};
  LISTINGS.forEach(function (l) { byId[l.id] = l; });

  // ---- helpers ----
  function fmtPrice(listing) {
    if (listing.type === 'rent') {
      return money(listing.price) + '/mo';
    }
    // sales prices are large; format as £XXXk or £X.Xm
    var p = listing.price;
    if (p >= 1000000) {
      return '£' + (p / 1000000).toFixed(1).replace('.0', '') + 'm';
    }
    return '£' + Math.round(p / 1000) + 'k';
  }

  function bedsLabel(n) { return n === 1 ? '1 bed' : n + ' beds'; }
  function bathsLabel(n) { return n === 1 ? '1 bath' : n + ' baths'; }

  function isSaved(id) {
    RW.S.savedProperties = RW.S.savedProperties || [];
    return RW.S.savedProperties.indexOf(id) !== -1;
  }

  // ---- list view ----
  function list(tab) {
    var activeTab = tab || 'rent';
    RW.S.savedProperties = RW.S.savedProperties || [];
    RW.S.viewings = RW.S.viewings || [];

    var filtered = LISTINGS.filter(function (l) { return l.type === activeTab; });

    var seg = '<div class="seg" style="margin-bottom:16px">' +
      '<button data-act="propertyTab" data-tab="rent" class="' + (activeTab === 'rent' ? 'active' : '') + '">Rent</button>' +
      '<button data-act="propertyTab" data-tab="buy" class="' + (activeTab === 'buy' ? 'active' : '') + '">Buy</button>' +
      '</div>';

    var cards = filtered.map(function (l) {
      var saved = isSaved(l.id);
      return '<div class="card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:800;font-size:15px;margin-bottom:2px">' + esc(l.title) + '</div>' +
        '<div class="muted tiny" style="margin-bottom:6px">📍 ' + esc(l.area) + ' · ' + esc(l.agent) + '</div>' +
        '<div style="font-size:13px;color:var(--ink60);margin-bottom:8px">' + esc(l.blurb) + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<span class="chip">🛏 ' + esc(bedsLabel(l.beds)) + '</span>' +
        '<span class="chip">🚿 ' + esc(bathsLabel(l.baths)) + '</span>' +
        '</div></div>' +
        '<div style="text-align:right;margin-left:12px;flex-shrink:0">' +
        '<div style="font-weight:900;font-size:17px;color:var(--brand)">' + esc(fmtPrice(l)) + '</div>' +
        (saved ? '<span class="pill-status ok" style="font-size:11px;margin-top:4px;display:inline-block">Saved</span>' : '') +
        '</div></div>' +
        '<div style="margin-top:12px;display:flex;gap:8px">' +
        '<button class="btn sm ghost" data-act="propertyView" data-id="' + esc(l.id) + '">View details</button>' +
        '</div>' +
        '</div>';
    }).join('');

    var savedSection = '';
    if (RW.S.savedProperties.length > 0) {
      var savedListings = RW.S.savedProperties.map(function (id) { return byId[id]; }).filter(Boolean);
      if (savedListings.length > 0) {
        var savedRows = savedListings.map(function (l) {
          return RW.ui.row({
            lead: l.type === 'rent' ? '🏢' : '🏠',
            leadBg: '#e6effc',
            name: esc(l.title),
            sub: esc(l.area) + ' · ' + esc(fmtPrice(l)),
            trail: '<button class="btn sm ghost" data-act="propertyView" data-id="' + esc(l.id) + '">View</button>',
          });
        }).join('');
        savedSection = RW.ui.sectionTitle('Saved Properties') +
          '<div class="card">' + savedRows + '</div>';
      }
    }

    var viewingsSection = '';
    if (RW.S.viewings.length > 0) {
      var vRows = RW.S.viewings.slice().reverse().map(function (v) {
        return RW.ui.row({
          lead: '📅',
          leadBg: '#fff3cd',
          name: esc(v.title),
          sub: 'Requested ' + esc(fmtDate(v.t)),
          trail: '<span class="pill-status ok">Pending</span>',
        });
      }).join('');
      viewingsSection = RW.ui.sectionTitle('Viewing Requests') +
        '<div class="card">' + vRows + '</div>';
    }

    var body = seg +
      RW.ui.sectionTitle(activeTab === 'rent' ? 'Properties to Rent' : 'Properties for Sale') +
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

    var alreadyRequested = RW.S.viewings.some(function (v) { return v.listingId === id; });

    var hero = '<div style="background:linear-gradient(135deg,#1a4ea3,#2d6fe8);color:#fff;padding:20px 18px 24px">' +
      '<div style="font-size:42px">' + (l.type === 'rent' ? '🏢' : '🏠') + '</div>' +
      '<div style="font-size:20px;font-weight:900;margin-top:8px;line-height:1.25">' + esc(l.title) + '</div>' +
      '<div style="opacity:.85;font-size:13px;margin-top:4px">📍 ' + esc(l.area) + '</div>' +
      '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">🛏 ' + esc(bedsLabel(l.beds)) + '</span>' +
      '<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">🚿 ' + esc(bathsLabel(l.baths)) + '</span>' +
      '<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">' + esc(l.type === 'rent' ? 'To Rent' : 'For Sale') + '</span>' +
      '</div></div>';

    var priceBlock = '<div class="kv total" style="margin-bottom:0">' +
      '<span>' + (l.type === 'rent' ? 'Monthly Rent' : 'Asking Price') + '</span>' +
      '<span>' + esc(fmtPrice(l)) + '</span>' +
      '</div>';

    var details = '<div class="card" style="margin-bottom:12px">' +
      priceBlock +
      '<div class="kv"><span>Agent</span><span>' + esc(l.agent) + '</span></div>' +
      '<div class="kv"><span>Area</span><span>' + esc(l.area) + '</span></div>' +
      '<div class="kv"><span>Bedrooms</span><span>' + l.beds + '</span></div>' +
      '<div class="kv"><span>Bathrooms</span><span>' + l.baths + '</span></div>' +
      '<div class="kv"><span>Type</span><span>' + esc(l.type === 'rent' ? 'Rental' : 'Sale') + '</span></div>' +
      '</div>';

    var blurbBlock = '<div class="card" style="margin-bottom:12px">' +
      '<div style="font-size:14px;line-height:1.55;color:var(--ink)">' + esc(l.blurb) + '</div>' +
      '</div>';

    var saveLabel = saved ? 'Unsave' : 'Save property';
    var saveClass = saved ? 'btn ghost' : 'btn';

    var actions = '<div style="display:flex;gap:10px;margin-top:4px">' +
      '<button class="' + esc(saveClass) + '" data-act="propertySave" data-id="' + esc(id) + '" style="flex:1">' + saveLabel + '</button>' +
      (alreadyRequested
        ? '<button class="btn ghost" disabled style="flex:1;opacity:.55">Viewing requested</button>'
        : '<button class="btn sea" data-act="propertyViewing" data-id="' + esc(id) + '" style="flex:1">Request viewing</button>') +
      '</div>';

    var body = details + blurbBlock + actions;

    return RW.ui.screen({ title: 'Property', hero: hero, body: body });
  }

  // ---- render dispatcher ----
  function render(parts) {
    if (parts && parts[0]) {
      return detail(parts[0]);
    }
    // restore last tab from state
    var tab = (RW.S.propertyTab) || 'rent';
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
        RW.navigate('#/property/' + id);
      },

      propertySave: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.S.savedProperties = RW.S.savedProperties || [];
        var idx = RW.S.savedProperties.indexOf(id);
        if (idx === -1) {
          RW.S.savedProperties.push(id);
          RW.util.toast('Property saved.');
        } else {
          RW.S.savedProperties.splice(idx, 1);
          RW.util.toast('Property removed from saved.');
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
        // prevent duplicate requests
        var already = RW.S.viewings.some(function (v) { return v.listingId === id; });
        if (already) {
          RW.util.toast('You have already requested a viewing for this property.');
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
        RW.util.toast('Viewing request sent to ' + listing.agent + '.');
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
          '<div class="muted tiny" style="margin-top:4px">Requested ' + esc(fmtDate(v.t)) + '</div>' +
          '</div>',
      };
    });
  });
})(window.RW);
