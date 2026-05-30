/* Rockway feature — Shop (supermarkets, pharmacy, convenience delivery). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  const stores = [
    { id: 's-morrisons', name: 'Morrisons (Westside)', type: 'Supermarket', emoji: '🛒', etaMin: 40, etaMax: 60, deliveryFee: 3.5, products: [
      { id: 'p1', name: 'Milk 2L', price: 1.85, emoji: '🥛' }, { id: 'p2', name: 'Free-range Eggs (12)', price: 3.2, emoji: '🥚' },
      { id: 'p3', name: 'Sourdough Loaf', price: 2.4, emoji: '🍞' }, { id: 'p4', name: 'Bananas (1kg)', price: 1.3, emoji: '🍌' },
      { id: 'p5', name: 'Chicken Breast (500g)', price: 4.5, emoji: '🍗' }, { id: 'p6', name: 'Olive Oil 1L', price: 6.9, emoji: '🫒' } ] },
    { id: 's-eroski', name: 'Eroski City', type: 'Groceries · Spanish', emoji: '🧺', etaMin: 35, etaMax: 55, deliveryFee: 3.0, products: [
      { id: 'p1', name: 'Jamón Serrano (200g)', price: 5.5, emoji: '🥓' }, { id: 'p2', name: 'Manchego Wedge', price: 4.8, emoji: '🧀' },
      { id: 'p3', name: 'Tomatoes (1kg)', price: 1.9, emoji: '🍅' }, { id: 'p4', name: 'Rioja Reserva', price: 8.5, emoji: '🍷' },
      { id: 'p5', name: 'Patatas Fritas Bag', price: 2.1, emoji: '🥔' }, { id: 'p6', name: 'Naranjas (2kg)', price: 2.8, emoji: '🍊' } ] },
    { id: 's-pharmacy', name: 'Louis Pharmacy', type: 'Pharmacy · Health', emoji: '💊', etaMin: 25, etaMax: 40, deliveryFee: 2.5, products: [
      { id: 'p1', name: 'Paracetamol 500mg (16)', price: 1.5, emoji: '💊' }, { id: 'p2', name: 'SPF50 Sun Cream', price: 9.5, emoji: '🧴' },
      { id: 'p3', name: 'Plasters Pack', price: 2.2, emoji: '🩹' }, { id: 'p4', name: 'Vitamin C (30)', price: 4.0, emoji: '🍊' },
      { id: 'p5', name: 'Seasickness Tablets', price: 3.5, emoji: '⛴️' } ] },
    { id: 's-imperial', name: 'Imperial News & Off-Licence', type: 'Convenience · 24h', emoji: '🏪', etaMin: 15, etaMax: 30, deliveryFee: 1.5, products: [
      { id: 'p1', name: 'Local SIM Top-up', price: 10.0, emoji: '📱' }, { id: 'p2', name: 'Lottery Ticket', price: 2.0, emoji: '🎟️' },
      { id: 'p3', name: 'Crisps Multipack', price: 3.0, emoji: '🥔' }, { id: 'p4', name: 'Cold Cola (6)', price: 4.5, emoji: '🥤' },
      { id: 'p5', name: 'Phone Charger', price: 7.0, emoji: '🔌' } ] },
  ];
  const byId = {}; stores.forEach((s) => (byId[s.id] = s));

  RW.api.registerCatalog('shop', (vid, iid) => {
    const s = byId[vid]; const p = s && s.products.find((x) => x.id === iid);
    return p ? { key: 'shop:' + vid + ':' + iid, type: 'shop', name: p.name, price: p.price, emoji: p.emoji, vendorId: s.id, vendorName: s.name } : null;
  });

  function list() {
    const body = '<div class="muted tiny" style="margin-bottom:10px">Supermarkets, pharmacies & convenience — delivered</div>' +
      stores.map((s) =>
        '<div class="card venue" data-act="nav" data-route="#/shop/' + s.id + '">' +
        '<div class="venue-head"><div class="venue-emoji">' + s.emoji + '</div>' +
        '<div style="flex:1"><div style="font-weight:800;font-size:15.5px">' + esc(s.name) + '</div>' +
        '<div class="muted tiny" style="font-weight:600">' + esc(s.type) + '</div>' +
        '<div class="meta-line"><span class="chip">🛵 ' + s.etaMin + '–' + s.etaMax + ' min</span><span class="chip">' + money(s.deliveryFee) + ' delivery</span></div></div></div></div>').join('');
    return RW.ui.screen({ title: 'Shop & Groceries', body });
  }

  function detail(id) {
    const s = byId[id];
    if (!s) return list();
    const items = s.products.map((p) => {
      const key = 'shop:' + s.id + ':' + p.id;
      const inCart = RW.S.cart.find((i) => i.key === key);
      const ctrl = inCart
        ? '<div class="qty"><button data-act="qty" data-key="' + key + '" data-d="-1">−</button><span>' + inCart.qty + '</span><button data-act="qty" data-key="' + key + '" data-d="1">+</button></div>'
        : '<button class="btn sm" data-act="add" data-key="' + key + '">Add</button>';
      return '<div class="row"><div class="lead">' + p.emoji + '</div>' +
        '<div class="body"><div class="name">' + esc(p.name) + '</div><div style="font-weight:800;margin-top:4px">' + money(p.price) + '</div></div><div class="trail">' + ctrl + '</div></div>';
    }).join('');
    return RW.ui.screen({ title: s.name, body: '<div class="card" style="margin-top:8px">' + items + '</div>' });
  }

  RW.register({
    id: 'shop', title: 'Shop', emoji: '🛒', tileBg: '#e3f7ec', section: 'daily', order: 20,
    render: (parts) => (parts[0] ? detail(parts[0]) : list()),
  });
})(window.RW);
