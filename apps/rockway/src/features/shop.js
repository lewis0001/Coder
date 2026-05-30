/* Rockway feature — Shop (supermarkets, pharmacy, convenience delivery). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  // ---- store catalogue ----
  const stores = [
    {
      id: 's-morrisons',
      name: 'Morrisons',
      tagline: 'Queensway Road · Hypermarket',
      type: 'Supermarket',
      emoji: '🛒',
      accent: '#007500',
      etaMin: 40, etaMax: 60,
      deliveryFee: 3.5,
      minOrder: 15,
      note: 'UK brands · in-store café · pharmacy · petrol station',
      products: [
        { id: 'p1', name: 'Milk 2L',                  price: 1.85, emoji: '🥛', aisle: 'Dairy' },
        { id: 'p2', name: 'Free-range Eggs (12)',      price: 3.20, emoji: '🥚', aisle: 'Dairy' },
        { id: 'p3', name: 'Cheddar Block 400g',        price: 2.90, emoji: '🧀', aisle: 'Dairy' },
        { id: 'p4', name: 'Sourdough Loaf',            price: 2.40, emoji: '🍞', aisle: 'Bakery' },
        { id: 'p5', name: 'Croissants (4)',            price: 1.80, emoji: '🥐', aisle: 'Bakery' },
        { id: 'p6', name: 'Bananas (1kg)',             price: 1.30, emoji: '🍌', aisle: 'Fruit & Veg' },
        { id: 'p7', name: 'Salad Bag',                price: 1.20, emoji: '🥗', aisle: 'Fruit & Veg' },
        { id: 'p8', name: 'Chicken Breast (500g)',     price: 4.50, emoji: '🍗', aisle: 'Meat' },
        { id: 'p9', name: 'Smoked Salmon (120g)',      price: 3.80, emoji: '🐟', aisle: 'Meat' },
        { id: 'p10', name: 'Olive Oil 1L',             price: 6.90, emoji: '🫒', aisle: 'Cupboard' },
        { id: 'p11', name: 'Pasta 500g',               price: 0.90, emoji: '🍝', aisle: 'Cupboard' },
        { id: 'p12', name: 'Baked Beans (4-pack)',     price: 2.10, emoji: '🫘', aisle: 'Cupboard' },
      ],
    },
    {
      id: 's-eroski',
      name: 'Eroski City',
      tagline: '12 Winston Churchill Ave · Home delivery',
      type: 'Groceries · Spanish',
      emoji: '🧺',
      accent: '#d4112a',
      etaMin: 35, etaMax: 55,
      deliveryFee: 3.0,
      minOrder: 20,
      note: 'Waitrose lines · Spanish specialities · home delivery available',
      products: [
        { id: 'p1', name: 'Jamón Serrano (200g)',      price: 5.50, emoji: '🥓', aisle: 'Deli' },
        { id: 'p2', name: 'Manchego Wedge',            price: 4.80, emoji: '🧀', aisle: 'Deli' },
        { id: 'p3', name: 'Chorizo Picante (150g)',    price: 3.60, emoji: '🌶️', aisle: 'Deli' },
        { id: 'p4', name: 'Tomatoes (1kg)',            price: 1.90, emoji: '🍅', aisle: 'Fruit & Veg' },
        { id: 'p5', name: 'Naranjas (2kg)',            price: 2.80, emoji: '🍊', aisle: 'Fruit & Veg' },
        { id: 'p6', name: 'Rioja Reserva 75cl',       price: 8.50, emoji: '🍷', aisle: 'Wine & Beer' },
        { id: 'p7', name: 'Cava Brut 75cl',           price: 6.20, emoji: '🥂', aisle: 'Wine & Beer' },
        { id: 'p8', name: 'Patatas Fritas Bag',        price: 2.10, emoji: '🥔', aisle: 'Snacks' },
        { id: 'p9', name: 'Tortilla Chips & Salsa',   price: 3.40, emoji: '🌽', aisle: 'Snacks' },
        { id: 'p10', name: 'Extra Virgin Olive Oil 1L', price: 7.40, emoji: '🫒', aisle: 'Cupboard' },
        { id: 'p11', name: 'Gazpacho Carton 1L',       price: 2.60, emoji: '🍅', aisle: 'Cupboard' },
      ],
    },
    {
      id: 's-pharmacy',
      name: 'Louis Pharmacy',
      tagline: 'Main Street · Open Mon–Sat 9–19h',
      type: 'Pharmacy · Health',
      emoji: '💊',
      accent: '#1455c0',
      etaMin: 25, etaMax: 40,
      deliveryFee: 2.5,
      minOrder: 0,
      note: 'OTC medicines · sun care · vitamins · travel health',
      products: [
        { id: 'p1', name: 'Paracetamol 500mg (16)',    price: 1.50, emoji: '💊', aisle: 'Pain Relief' },
        { id: 'p2', name: 'Ibuprofen 200mg (16)',      price: 2.00, emoji: '💊', aisle: 'Pain Relief' },
        { id: 'p3', name: 'SPF50 Sun Cream 200ml',     price: 9.50, emoji: '🧴', aisle: 'Sun Care' },
        { id: 'p4', name: 'After-Sun Lotion 250ml',    price: 6.80, emoji: '🧴', aisle: 'Sun Care' },
        { id: 'p5', name: 'Vitamin C 1000mg (30)',     price: 4.00, emoji: '🍊', aisle: 'Vitamins' },
        { id: 'p6', name: 'Vitamin D3 (60)',           price: 5.50, emoji: '☀️', aisle: 'Vitamins' },
        { id: 'p7', name: 'Plasters Assorted Pack',    price: 2.20, emoji: '🩹', aisle: 'First Aid' },
        { id: 'p8', name: 'Seasickness Tablets (12)',  price: 3.50, emoji: '⛴️', aisle: 'Travel Health' },
        { id: 'p9', name: 'Insect Repellent Spray',   price: 4.80, emoji: '🌿', aisle: 'Travel Health' },
      ],
    },
    {
      id: 's-imperial',
      name: 'Imperial News & Off-Licence',
      tagline: 'Main Street · Open 24 hours',
      type: 'Convenience · 24h',
      emoji: '🏪',
      accent: '#e08a00',
      etaMin: 15, etaMax: 30,
      deliveryFee: 1.5,
      minOrder: 0,
      note: 'Open 24h · lottery · SIM top-ups · cold drinks · snacks',
      products: [
        { id: 'p1', name: 'Cold Cola (6-pack)',        price: 4.50, emoji: '🥤', aisle: 'Drinks' },
        { id: 'p2', name: 'Still Water 1.5L',          price: 1.20, emoji: '💧', aisle: 'Drinks' },
        { id: 'p3', name: 'Energy Drink',              price: 2.00, emoji: '⚡', aisle: 'Drinks' },
        { id: 'p4', name: 'Crisps Multipack (6)',      price: 3.00, emoji: '🥔', aisle: 'Snacks' },
        { id: 'p5', name: 'Chocolate Bar',             price: 1.50, emoji: '🍫', aisle: 'Snacks' },
        { id: 'p6', name: 'Chewing Gum Pack',          price: 1.20, emoji: '🟢', aisle: 'Snacks' },
        { id: 'p7', name: 'Local SIM Top-up £10',      price: 10.00, emoji: '📱', aisle: 'Services' },
        { id: 'p8', name: 'Gibraltar Lottery Ticket',  price: 2.00, emoji: '🎟️', aisle: 'Services' },
        { id: 'p9', name: 'Phone Charger Cable',       price: 7.00, emoji: '🔌', aisle: 'Services' },
        { id: 'p10', name: 'The Gibraltar Chronicle',  price: 0.70, emoji: '📰', aisle: 'Services' },
      ],
    },
  ];

  const byId = {};
  stores.forEach((s) => (byId[s.id] = s));

  // ---- catalog registration ----
  RW.api.registerCatalog('shop', (vid, iid) => {
    const s = byId[vid];
    const p = s && s.products.find((x) => x.id === iid);
    return p
      ? { key: 'shop:' + vid + ':' + iid, type: 'shop', name: p.name, price: p.price, emoji: p.emoji, vendorId: s.id, vendorName: s.name }
      : null;
  });

  // ---- aisle filter state (transient — reset on nav; guarded read) ----
  function getAisle(sid) {
    RW.S.shopAisle = RW.S.shopAisle || {};
    return RW.S.shopAisle[sid] || 'All';
  }
  function setAisle(sid, value) {
    RW.S.shopAisle = RW.S.shopAisle || {};
    RW.S.shopAisle[sid] = value;
    // no need to persist this — it's ephemeral filter state
  }

  // ---- store list ----
  function list() {
    const intro = '<div class="muted tiny" style="margin-bottom:14px;font-weight:600;line-height:1.5">' +
      '🛵 Supermarkets, pharmacy &amp; convenience — delivered across the Rock</div>';

    const cards = stores.map((s) => {
      const deliveryLabel = s.deliveryFee > 0
        ? '<span class="num">' + money(s.deliveryFee) + '</span> delivery'
        : 'Free delivery';
      const etaLabel = '<span class="num">' + s.etaMin + '–' + s.etaMax + '</span> min';
      const minLabel = s.minOrder > 0
        ? '<span class="chip">Min <span class="num">' + money(s.minOrder) + '</span></span>'
        : '<span class="chip">No min</span>';
      return (
        '<div class="card venue" data-act="nav" data-route="#/shop/' + s.id + '" style="margin-top:10px">' +
          '<div class="venue-head">' +
            '<div class="venue-emoji" style="background:' + esc(s.accent) + '22;font-size:28px">' + s.emoji + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:800;font-size:15.5px;letter-spacing:-0.2px">' + esc(s.name) + '</div>' +
              '<div class="muted tiny" style="font-weight:600;margin-top:1px">' + esc(s.tagline) + '</div>' +
              '<div class="meta-line" style="margin-top:6px">' +
                '<span class="chip">🛵 ' + etaLabel + '</span>' +
                '<span class="chip">🚪 ' + deliveryLabel + '</span>' +
                minLabel +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return RW.ui.screen({ title: 'Shop & Groceries', body: intro + cards });
  }

  // ---- store detail ----
  function detail(id) {
    const s = byId[id];
    if (!s) return list();

    const activeAisle = getAisle(id);

    // Build aisle list dynamically from products
    const aisles = ['All'].concat(
      s.products.reduce(function (acc, p) {
        if (acc.indexOf(p.aisle) === -1) acc.push(p.aisle);
        return acc;
      }, [])
    );

    const filterItems = aisles.map(function (a) { return { label: a, value: a }; });
    const filterChips = RW.ui.chips(filterItems, activeAisle, 'shopAisleFilter', true);

    const visible = activeAisle === 'All'
      ? s.products
      : s.products.filter(function (p) { return p.aisle === activeAisle; });

    // Group products by aisle when showing "All"
    let productRows;
    if (activeAisle === 'All') {
      // Group by aisle
      const groups = {};
      const order = [];
      visible.forEach(function (p) {
        if (!groups[p.aisle]) { groups[p.aisle] = []; order.push(p.aisle); }
        groups[p.aisle].push(p);
      });
      productRows = order.map(function (aisle) {
        const rows = groups[aisle].map(function (p) { return productRow(s, p); }).join('');
        return '<div class="section-title" style="font-size:13px;font-weight:700;color:var(--ash);margin:16px 0 4px;text-transform:uppercase;letter-spacing:.5px">' +
          esc(aisle) + '</div>' +
          '<div class="card" style="padding:4px 14px">' + rows + '</div>';
      }).join('');
    } else {
      if (visible.length === 0) {
        productRows = RW.ui.empty('🛒', 'Nothing here right now in ' + esc(activeAisle) + '.<br>Try another aisle or check back later.');
      } else {
        productRows = '<div class="card" style="padding:4px 14px">' +
          visible.map(function (p) { return productRow(s, p); }).join('') +
          '</div>';
      }
    }

    const deliveryInfo =
      '<div class="card" style="margin-top:8px;padding:12px 14px">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          '<span class="pill-status ok">🛵 ' + s.etaMin + '–' + s.etaMax + ' min</span>' +
          '<span class="pill-status' + (s.deliveryFee === 0 ? ' ok' : ' warn') + '">' +
            (s.deliveryFee > 0 ? '🚪 Delivery <span class="num">' + money(s.deliveryFee) + '</span>' : '🎉 Free delivery') +
          '</span>' +
          (s.minOrder > 0
            ? '<span class="pill-status neutral">Min order <span class="num">' + money(s.minOrder) + '</span></span>'
            : '') +
        '</div>' +
        '<div class="muted tiny" style="margin-top:8px;line-height:1.5">' + esc(s.note) + '</div>' +
      '</div>';

    const heroHtml = RW.ui.hero({
      emoji: s.emoji,
      title: s.name,
      sub: s.tagline,
      accent: s.accent,
      chips: [s.type],
    });

    const body =
      deliveryInfo +
      '<div style="margin-top:16px">' + filterChips + '</div>' +
      productRows;

    return RW.ui.screen({ title: s.name, hero: heroHtml, body });
  }

  function productRow(s, p) {
    const key = 'shop:' + s.id + ':' + p.id;
    const inCart = RW.S.cart.find(function (i) { return i.key === key; });
    const ctrl = inCart
      ? '<div class="qty">' +
          '<button data-act="shopQty" data-key="' + esc(key) + '" data-d="-1">−</button>' +
          '<span class="num">' + inCart.qty + '</span>' +
          '<button data-act="shopQty" data-key="' + esc(key) + '" data-d="1">+</button>' +
        '</div>'
      : '<button class="btn sm ghost" data-act="shopAdd" data-key="' + esc(key) + '">Add</button>';

    return (
      '<div class="row">' +
        '<div class="lead">' + p.emoji + '</div>' +
        '<div class="body">' +
          '<div class="name">' + esc(p.name) + '</div>' +
          '<div class="sub"><span class="num">' + money(p.price) + '</span></div>' +
        '</div>' +
        '<div class="trail">' + ctrl + '</div>' +
      '</div>'
    );
  }

  // ---- actions ----
  function shopAdd(el) {
    const key = el.dataset.key;                    // 'shop:<sid>:<pid>'
    const parts = key.split(':');                  // ['shop', sid, pid]
    const s = byId[parts[1]];
    const p = s && s.products.find(function (x) { return x.id === parts[2]; });
    if (!p) return;
    const item = {
      key: key, type: 'shop', name: p.name, price: p.price, emoji: p.emoji,
      vendorId: s.id, vendorName: s.name,
    };
    RW.store.addToCart(item);
    RW.toast(esc(p.emoji) + ' ' + esc(p.name) + ' added to basket');
    RW.render();
  }

  function shopQty(el) {
    const key = el.dataset.key;
    const d = parseInt(el.dataset.d, 10) || 0;
    RW.store.setQty(key, d);
    RW.render();
  }

  function shopAisleFilter(el) {
    // key format: 'shop:<sid>:<pid>' → we need the sid from the current route
    const hash = location.hash || '';             // e.g. '#/shop/s-morrisons'
    const parts = hash.split('/');
    const sid = parts[2] || '';
    setAisle(sid, el.dataset.v || 'All');
    RW.render();
  }

  RW.register({
    id: 'shop',
    title: 'Shop',
    emoji: '🛒',
    tileBg: '#e3f7ec',
    section: 'daily',
    order: 20,
    render: function (parts) {
      return parts[0] ? detail(parts[0]) : list();
    },
    actions: {
      shopAdd,
      shopQty,
      shopAisleFilter,
    },
  });
})(window.RW);
