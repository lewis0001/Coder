/* Rockway feature — Eat (food delivery from Gibraltar restaurants). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  // Cuisine filter definitions
  const CUISINE_FILTERS = [
    { label: 'All', value: 'all' },
    { label: '🍳 Brunch', value: 'Brunch' },
    { label: '🐟 Fish & Chips', value: 'Fish & Chips' },
    { label: '🍔 Burgers', value: 'Burgers' },
    { label: '🥗 Vegan', value: 'Vegan' },
    { label: '🍕 Pizza', value: 'Pizza' },
    { label: '🥩 Steak', value: 'Steak' },
  ];

  const restaurants = [
    { id: 'r-sacarellos', name: "Sacarello's", cuisine: 'Café · British · Brunch', area: 'Irish Town', emoji: '☕️', accent: '#6b4c2a', rating: 4.7, reviews: 1280, etaMin: 20, etaMax: 35, deliveryFee: 2.0, tags: ['Brunch', 'Coffee'], menu: [
      { id: 'm1', name: 'Full Gibraltarian Breakfast', desc: 'Eggs, bacon, sausage, beans, fried bread', price: 9.5, emoji: '🍳', kcal: 820 },
      { id: 'm2', name: 'Calentita Slice', desc: 'Gibraltar’s national dish — baked chickpea bread', price: 3.2, emoji: '🫓', kcal: 210 },
      { id: 'm3', name: 'Flat White', desc: 'Locally roasted beans, whole or oat milk', price: 2.8, emoji: '☕️', kcal: 110 },
      { id: 'm4', name: 'Carrot Cake', desc: 'House recipe, cream cheese frosting', price: 4.5, emoji: '🍰', kcal: 430 } ] },
    { id: 'r-roys', name: "Roy's Cod Plaice", cuisine: 'Fish & Chips · Takeaway', area: 'Casemates Square', emoji: '🐟', accent: '#1a5fa8', rating: 4.6, reviews: 2110, etaMin: 15, etaMax: 30, deliveryFee: 1.8, tags: ['Fish & Chips', 'Family'], menu: [
      { id: 'm1', name: 'Cod & Chips', desc: 'Beer-battered cod, hand-cut chips', price: 11.0, emoji: '🍟', kcal: 950 },
      { id: 'm2', name: 'Scampi & Chips', desc: 'Whole-tail scampi, tartare sauce', price: 12.5, emoji: '🦐', kcal: 780 },
      { id: 'm3', name: 'Mushy Peas', desc: 'A proper British side', price: 2.5, emoji: '🟢', kcal: 120 },
      { id: 'm4', name: 'Battered Sausage', desc: 'Saveloy in crispy batter', price: 4.0, emoji: '🌭', kcal: 380 } ] },
    { id: 'r-charlies', name: "Charlie's Steakhouse Grill", cuisine: 'Steak · Grill · Mediterranean', area: 'Marina Bay', emoji: '🥩', accent: '#8b1a1a', rating: 4.5, reviews: 870, etaMin: 30, etaMax: 50, deliveryFee: 3.0, tags: ['Steak', 'Date night'], menu: [
      { id: 'm1', name: 'Ribeye 300g', desc: 'Grass-fed, served with chimichurri', price: 24.0, emoji: '🥩', kcal: 680 },
      { id: 'm2', name: 'Grilled Sea Bream', desc: 'Caught fresh in the Bay of Gibraltar', price: 18.5, emoji: '🐠', kcal: 420 },
      { id: 'm3', name: 'Patatas Bravas', desc: 'Spicy aioli, smoked paprika', price: 5.5, emoji: '🥔', kcal: 310 },
      { id: 'm4', name: 'Crema Catalana', desc: 'Torched custard, Catalan Bay classic', price: 6.0, emoji: '🍮', kcal: 290 } ] },
    { id: 'r-gauchos', name: 'Gaucho Grill Ocean Village', cuisine: 'Argentinian · Burgers', area: 'Ocean Village', emoji: '🍔', accent: '#c47c1a', rating: 4.4, reviews: 640, etaMin: 25, etaMax: 40, deliveryFee: 2.5, tags: ['Burgers', 'Late night'], menu: [
      { id: 'm1', name: 'Rock Double Burger', desc: 'Two patties, smoked cheddar, streaky bacon', price: 13.5, emoji: '🍔', kcal: 1050 },
      { id: 'm2', name: 'Chorizo Choripán', desc: 'Argentinian street sandwich — a proper classic', price: 8.0, emoji: '🌭', kcal: 540 },
      { id: 'm3', name: 'Loaded Fries', desc: 'Cheese sauce, jalapeño, chipotle mayo', price: 6.5, emoji: '🍟', kcal: 620 },
      { id: 'm4', name: 'Dulce de Leche Shake', desc: 'Thick, sweet, Argentine-style', price: 5.0, emoji: '🥤', kcal: 480 } ] },
    { id: 'r-verdura', name: 'Verdura Vegan Kitchen', cuisine: 'Vegan · Healthy · Bowls', area: 'Main Street', emoji: '🥗', accent: '#2d7a3a', rating: 4.8, reviews: 410, etaMin: 20, etaMax: 35, deliveryFee: 2.2, tags: ['Vegan', 'Healthy'], menu: [
      { id: 'm1', name: 'Levanter Buddha Bowl', desc: 'Quinoa, roasted veg, tahini dressing', price: 10.5, emoji: '🥗', kcal: 490 },
      { id: 'm2', name: 'Jackfruit Bao x2', desc: 'Steamed buns, sticky jackfruit, pickled slaw', price: 7.5, emoji: '🥟', kcal: 360 },
      { id: 'm3', name: 'Green Levante Smoothie', desc: 'Spinach, apple, ginger, lime', price: 4.5, emoji: '🥤', kcal: 130 },
      { id: 'm4', name: 'Raw Cacao Brownie', desc: 'Gluten-free, dates & walnuts', price: 4.0, emoji: '🍫', kcal: 240 } ] },
    { id: 'r-nunos', name: "Nuno's Italian Trattoria", cuisine: 'Italian · Pizza · Pasta', area: 'Catalan Bay', emoji: '🍕', accent: '#c42929', rating: 4.6, reviews: 990, etaMin: 30, etaMax: 45, deliveryFee: 2.8, tags: ['Pizza', 'Pasta'], menu: [
      { id: 'm1', name: 'Pizza Rock Diavola', desc: 'Spicy salami, nduja, fresh chilli', price: 12.0, emoji: '🍕', kcal: 860 },
      { id: 'm2', name: 'Linguine alle Vongole', desc: 'Clams from the Bay, white wine, garlic', price: 14.5, emoji: '🍝', kcal: 640 },
      { id: 'm3', name: 'Burrata & Tomato', desc: 'Creamy burrata, basil oil, sea salt', price: 8.5, emoji: '🧀', kcal: 380 },
      { id: 'm4', name: 'Tiramisù', desc: 'Classic — mascarpone, espresso, cocoa', price: 5.5, emoji: '🍰', kcal: 420 } ] },
  ];
  const byId = {}; restaurants.forEach((r) => (byId[r.id] = r));

  // publish to cart catalog
  RW.api.registerCatalog('food', (vid, iid) => {
    const r = byId[vid]; const m = r && r.menu.find((x) => x.id === iid);
    return m ? { key: 'food:' + vid + ':' + iid, type: 'food', name: m.name, price: m.price, emoji: m.emoji, vendorId: r.id, vendorName: r.name } : null;
  });

  // ---- helpers ----
  function ratingPill(rating) {
    // ok (green) for 4.5+, warn (amber) for 4.0–4.49
    const cls = rating >= 4.5 ? 'ok' : 'warn';
    return '<span class="pill-status ' + cls + '">★ ' + rating + '</span>';
  }

  function reviewStr(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n);
  }

  function getFilter() {
    return RW.S.eatFilter || 'all';
  }

  // ---- list view ----
  function list() {
    const filter = getFilter();
    const visible = filter === 'all'
      ? restaurants
      : restaurants.filter((r) => r.tags.some((t) => t === filter));

    const filterChips = RW.ui.chips(CUISINE_FILTERS, filter, 'eatFilter', true);

    // Llanito-flavoured intro banner
    const intro = (
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:11px 13px;' +
      'background:var(--cloud);border-radius:14px">' +
      '<span style="font-size:22px">🛵</span>' +
      '<div>' +
        '<div style="font-weight:700;font-size:13px">Delivering across the Rock</div>' +
        '<div class="muted tiny">Powered by local riders · ¿Qué quieres comer hoy?</div>' +
      '</div>' +
      '</div>'
    );

    let cards;
    if (visible.length === 0) {
      cards = RW.ui.empty('🍽️', 'No restaurants in that category just now.\nMore cocinas joining soon — check back mañana!');
    } else {
      cards = visible.map((r) => {
        const reviews = reviewStr(r.reviews);
        return (
          '<div class="card" data-act="nav" data-route="#/eat/' + esc(r.id) + '" ' +
          'style="cursor:pointer;margin-bottom:12px;padding:14px 14px 12px">' +
          // Row: tinted icon badge + details
          '<div style="display:flex;align-items:flex-start;gap:12px">' +
            '<div style="width:52px;height:52px;border-radius:16px;background:' + esc(r.accent) + '20;' +
            'display:grid;place-items:center;font-size:28px;flex:0 0 auto">' + r.emoji + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:800;font-size:15px;letter-spacing:-.2px;margin-bottom:1px">' + esc(r.name) + '</div>' +
              '<div class="muted tiny" style="font-weight:600">' + esc(r.cuisine) + '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">' +
                ratingPill(r.rating) +
                '<span class="muted tiny" style="font-weight:600">' + esc(reviews) + ' reviews</span>' +
                '<span class="muted tiny">· 📍 ' + esc(r.area) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          // Chips: ETA + delivery fee + cuisine tags
          '<div class="chips" style="margin-top:10px;margin-bottom:0">' +
            '<span class="chip">🕐 ' + r.etaMin + '–' + r.etaMax + ' min</span>' +
            '<span class="chip"><span class="num">' + money(r.deliveryFee) + '</span> delivery</span>' +
            r.tags.map((t) => '<span class="chip">' + esc(t) + '</span>').join('') +
          '</div>' +
          '</div>'
        );
      }).join('');
    }

    const body = intro + filterChips + cards;
    return RW.ui.screen({ title: 'Eat in Gibraltar', body });
  }

  // ---- detail view ----
  function detail(id) {
    const r = byId[id];
    if (!r) return list();

    // Note: RW.ui.hero internally escapes title, sub and chip strings — pass raw values
    const heroHtml = RW.ui.hero({
      emoji: r.emoji,
      title: r.name,
      sub: r.cuisine + ' · 📍 ' + r.area,
      accent: r.accent,
      chips: [
        '★ ' + r.rating + ' (' + reviewStr(r.reviews) + ' reviews)',
        '🕐 ' + r.etaMin + '–' + r.etaMax + ' min',
        money(r.deliveryFee) + ' delivery',
      ],
    });

    let menuRows;
    if (!r.menu || r.menu.length === 0) {
      menuRows = RW.ui.empty('🍽️', 'Menu not available right now.\nLlama al restaurante directamente.');
    } else {
      menuRows = '<div class="card" style="padding:0 4px">' + r.menu.map((m) => {
        const key = 'food:' + r.id + ':' + m.id;
        const inCart = RW.S.cart.find((i) => i.key === key);
        const ctrl = inCart
          ? (
            '<div class="qty">' +
              '<button data-act="eatQty" data-key="' + esc(key) + '" data-d="-1">−</button>' +
              '<span class="num">' + inCart.qty + '</span>' +
              '<button data-act="eatQty" data-key="' + esc(key) + '" data-d="1">+</button>' +
            '</div>'
          )
          : '<button class="btn sm" data-act="eatAdd" data-key="' + esc(key) + '">Add</button>';
        const kcalBadge = m.kcal
          ? '<span class="pill-status neutral" style="font-size:11px;padding:3px 7px">' + m.kcal + ' kcal</span>'
          : '';
        return (
          '<div class="row" style="padding:14px 8px;align-items:flex-start">' +
            // Tinted emoji tile matching restaurant accent
            '<div class="lead" style="background:' + esc(r.accent) + '18;border-radius:14px;font-size:24px;' +
            'width:50px;height:50px;flex:0 0 50px;align-self:center">' + m.emoji + '</div>' +
            '<div class="body" style="padding-right:8px">' +
              '<div class="name" style="font-weight:800;font-size:14px">' + esc(m.name) + '</div>' +
              '<div class="sub" style="margin-top:2px;line-height:1.4">' + esc(m.desc) + '</div>' +
              '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">' +
                '<span class="num" style="font-weight:800;font-size:14px;color:var(--ink)">' + money(m.price) + '</span>' +
                kcalBadge +
              '</div>' +
            '</div>' +
            '<div class="trail" style="align-self:center">' + ctrl + '</div>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    // Subtle contextual note under section title
    const areaNote = (
      '<div class="muted tiny" style="text-align:center;margin-bottom:14px">' +
      '📍 Delivering from ' + esc(r.area) + ' · Powered by local riders' +
      '</div>'
    );

    const body = RW.ui.sectionTitle('Menu') + areaNote + menuRows;
    return RW.ui.screen({ title: r.name, hero: heroHtml, body });
  }

  RW.register({
    id: 'eat', title: 'Eat', emoji: '🍔', tileBg: '#fde7ea', section: 'daily', order: 10,
    render: (parts) => (parts[0] ? detail(parts[0]) : list()),
    actions: {
      eatFilter: (el) => {
        RW.S.eatFilter = el.dataset.v || 'all';
        RW.store.save();
        RW.render();
      },
      eatAdd: (el) => {
        const key = el.dataset.key || '';
        // key format: food:<rid>:<mid>
        const parts = key.split(':');
        if (parts.length !== 3) return;
        const item = RW.api.catalogItem('food', parts[1], parts[2]);
        if (!item) return;
        RW.store.addToCart(item);
        RW.toast('¡Añadido! ' + item.emoji + ' ' + item.name);
        RW.render();
      },
      eatQty: (el) => {
        const key = el.dataset.key || '';
        const d = parseInt(el.dataset.d, 10) || 0;
        if (!key || !d) return;
        RW.store.setQty(key, d);
        RW.render();
      },
    },
  });
})(window.RW);
