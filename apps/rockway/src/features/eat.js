/* Rockway feature — Eat (food delivery from Gibraltar restaurants). */
(function (RW) {
  'use strict';
  const { esc, money } = RW.util;

  const restaurants = [
    { id: 'r-sacarellos', name: "Sacarello's", cuisine: 'Café · British · Brunch', area: 'Irish Town', emoji: '☕️', rating: 4.7, reviews: 1280, etaMin: 20, etaMax: 35, deliveryFee: 2.0, tags: ['Brunch', 'Coffee'], menu: [
      { id: 'm1', name: 'Full Gibraltarian Breakfast', desc: 'Eggs, bacon, sausage, beans, fried bread', price: 9.5, emoji: '🍳' },
      { id: 'm2', name: 'Calentita Slice', desc: 'Gibraltar’s national dish — baked chickpea bread', price: 3.2, emoji: '🫓' },
      { id: 'm3', name: 'Flat White', desc: 'Locally roasted beans', price: 2.8, emoji: '☕️' },
      { id: 'm4', name: 'Carrot Cake', desc: 'House recipe, cream cheese frosting', price: 4.5, emoji: '🍰' } ] },
    { id: 'r-roys', name: "Roy's Cod Plaice", cuisine: 'Fish & Chips · Takeaway', area: 'Casemates Square', emoji: '🐟', rating: 4.6, reviews: 2110, etaMin: 15, etaMax: 30, deliveryFee: 1.8, tags: ['Fish & Chips', 'Family'], menu: [
      { id: 'm1', name: 'Cod & Chips', desc: 'Beer-battered cod, hand-cut chips', price: 11.0, emoji: '🍟' },
      { id: 'm2', name: 'Scampi & Chips', desc: 'Whole-tail scampi', price: 12.5, emoji: '🦐' },
      { id: 'm3', name: 'Mushy Peas', desc: 'A proper side', price: 2.5, emoji: '🟢' },
      { id: 'm4', name: 'Battered Sausage', desc: 'Saveloy, battered', price: 4.0, emoji: '🌭' } ] },
    { id: 'r-charlies', name: "Charlie's Steakhouse Grill", cuisine: 'Steak · Grill · Mediterranean', area: 'Marina Bay', emoji: '🥩', rating: 4.5, reviews: 870, etaMin: 30, etaMax: 50, deliveryFee: 3.0, tags: ['Steak', 'Date night'], menu: [
      { id: 'm1', name: 'Ribeye 300g', desc: 'Grass-fed, chimichurri', price: 24.0, emoji: '🥩' },
      { id: 'm2', name: 'Grilled Sea Bream', desc: 'Caught in the Bay', price: 18.5, emoji: '🐠' },
      { id: 'm3', name: 'Patatas Bravas', desc: 'Spicy aioli', price: 5.5, emoji: '🥔' },
      { id: 'm4', name: 'Crema Catalana', desc: 'Torched custard', price: 6.0, emoji: '🍮' } ] },
    { id: 'r-gauchos', name: 'Gaucho Grill Ocean Village', cuisine: 'Argentinian · Burgers', area: 'Ocean Village', emoji: '🍔', rating: 4.4, reviews: 640, etaMin: 25, etaMax: 40, deliveryFee: 2.5, tags: ['Burgers', 'Late night'], menu: [
      { id: 'm1', name: 'Rock Double Burger', desc: 'Two patties, smoked cheese, bacon', price: 13.5, emoji: '🍔' },
      { id: 'm2', name: 'Chorizo Choripán', desc: 'Argentinian street classic', price: 8.0, emoji: '🌭' },
      { id: 'm3', name: 'Loaded Fries', desc: 'Cheese, jalapeño, chipotle', price: 6.5, emoji: '🍟' },
      { id: 'm4', name: 'Dulce de Leche Shake', desc: 'Thick & sweet', price: 5.0, emoji: '🥤' } ] },
    { id: 'r-verdura', name: 'Verdura Vegan Kitchen', cuisine: 'Vegan · Healthy · Bowls', area: 'Main Street', emoji: '🥗', rating: 4.8, reviews: 410, etaMin: 20, etaMax: 35, deliveryFee: 2.2, tags: ['Vegan', 'Healthy'], menu: [
      { id: 'm1', name: 'Levanter Buddha Bowl', desc: 'Quinoa, roast veg, tahini', price: 10.5, emoji: '🥗' },
      { id: 'm2', name: 'Jackfruit Bao x2', desc: 'Steamed buns, sticky jackfruit', price: 7.5, emoji: '🥟' },
      { id: 'm3', name: 'Green Levante Smoothie', desc: 'Spinach, apple, ginger', price: 4.5, emoji: '🥤' },
      { id: 'm4', name: 'Raw Cacao Brownie', desc: 'Gluten free', price: 4.0, emoji: '🍫' } ] },
    { id: 'r-nunos', name: "Nuno's Italian Trattoria", cuisine: 'Italian · Pizza · Pasta', area: 'Catalan Bay', emoji: '🍕', rating: 4.6, reviews: 990, etaMin: 30, etaMax: 45, deliveryFee: 2.8, tags: ['Pizza', 'Pasta'], menu: [
      { id: 'm1', name: 'Pizza Rock Diavola', desc: 'Spicy salami, nduja, chilli', price: 12.0, emoji: '🍕' },
      { id: 'm2', name: 'Linguine alle Vongole', desc: 'Clams from the Bay', price: 14.5, emoji: '🍝' },
      { id: 'm3', name: 'Burrata & Tomato', desc: 'Creamy, basil oil', price: 8.5, emoji: '🧀' },
      { id: 'm4', name: 'Tiramisù', desc: 'Classic', price: 5.5, emoji: '🍰' } ] },
  ];
  const byId = {}; restaurants.forEach((r) => (byId[r.id] = r));

  // publish to cart catalog
  RW.api.registerCatalog('food', (vid, iid) => {
    const r = byId[vid]; const m = r && r.menu.find((x) => x.id === iid);
    return m ? { key: 'food:' + vid + ':' + iid, type: 'food', name: m.name, price: m.price, emoji: m.emoji, vendorId: r.id, vendorName: r.name } : null;
  });

  function list() {
    const body = '<div class="muted tiny" style="margin-bottom:10px">Delivering across the Rock — Main Street to Catalan Bay</div>' +
      restaurants.map((r) =>
        '<div class="card venue" data-act="nav" data-route="#/eat/' + r.id + '">' +
        '<div class="venue-head"><div class="venue-emoji">' + r.emoji + '</div>' +
        '<div style="flex:1"><div style="font-weight:800;font-size:15.5px">' + esc(r.name) + '</div>' +
        '<div class="muted tiny" style="font-weight:600">' + esc(r.cuisine) + '</div>' +
        '<div class="meta-line"><span class="rate">★ ' + r.rating + '</span><span>' + r.reviews + '+ reviews</span><span>📍 ' + esc(r.area) + '</span></div></div></div>' +
        '<div class="meta-line" style="margin-top:10px"><span class="chip">🛵 ' + r.etaMin + '–' + r.etaMax + ' min</span><span class="chip">' + money(r.deliveryFee) + ' delivery</span>' +
        r.tags.map((t) => '<span class="chip">' + esc(t) + '</span>').join('') + '</div></div>').join('');
    return RW.ui.screen({ title: 'Eat in Gibraltar', body });
  }

  function detail(id) {
    const r = byId[id];
    if (!r) return list();
    const items = r.menu.map((m) => {
      const key = 'food:' + r.id + ':' + m.id;
      const inCart = RW.S.cart.find((i) => i.key === key);
      const ctrl = inCart
        ? '<div class="qty"><button data-act="qty" data-key="' + key + '" data-d="-1">−</button><span>' + inCart.qty + '</span><button data-act="qty" data-key="' + key + '" data-d="1">+</button></div>'
        : '<button class="btn sm" data-act="add" data-key="' + key + '">Add</button>';
      return '<div class="row"><div class="lead">' + m.emoji + '</div>' +
        '<div class="body"><div class="name">' + esc(m.name) + '</div><div class="sub">' + esc(m.desc) + '</div>' +
        '<div style="font-weight:800;margin-top:4px">' + money(m.price) + '</div></div><div class="trail">' + ctrl + '</div></div>';
    }).join('');
    const hero = '<div style="background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:#fff;padding:18px 18px 22px">' +
      '<div style="font-size:46px">' + r.emoji + '</div>' +
      '<div style="font-size:22px;font-weight:900;margin-top:6px">' + esc(r.name) + '</div>' +
      '<div style="opacity:.9;font-size:13px">' + esc(r.cuisine) + ' · ' + esc(r.area) + '</div>' +
      '<div class="chips" style="margin-top:10px"><span class="chip" style="background:rgba(255,255,255,.2);color:#fff">★ ' + r.rating + '</span>' +
      '<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">🛵 ' + r.etaMin + '–' + r.etaMax + ' min</span>' +
      '<span class="chip" style="background:rgba(255,255,255,.2);color:#fff">' + money(r.deliveryFee) + ' delivery</span></div></div>';
    return RW.ui.screen({ title: r.name, hero, body: RW.ui.sectionTitle('Menu') + '<div class="card">' + items + '</div>' });
  }

  RW.register({
    id: 'eat', title: 'Eat', emoji: '🍔', tileBg: '#fde7ea', section: 'daily', order: 10,
    render: (parts) => (parts[0] ? detail(parts[0]) : list()),
  });
})(window.RW);
