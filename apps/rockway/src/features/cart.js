/* Rockway feature — Basket, checkout & order tracking.
 * Owns the #/cart and #/order/:id routes and the placeOrder action. */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref, pick } = RW.util;

  function cart() {
    if (!RW.S.cart.length) {
      return RW.ui.screen({ title: 'Your basket', fab: false,
        body: RW.ui.empty('🧺', 'Your basket is empty.<br>Add something tasty or some groceries.', 'Browse food', '#/eat') });
    }
    const rows = RW.S.cart.map((i) =>
      '<div class="row"><div class="lead">' + i.emoji + '</div>' +
      '<div class="body"><div class="name">' + esc(i.name) + '</div><div class="sub">' + esc(i.vendorName) + '</div></div>' +
      '<div class="trail"><div style="margin-bottom:6px">' + money(i.price * i.qty) + '</div>' +
      '<div class="qty"><button data-act="qty" data-key="' + i.key + '" data-d="-1">−</button><span>' + i.qty + '</span><button data-act="qty" data-key="' + i.key + '" data-d="1">+</button></div></div></div>').join('');
    const sub = RW.store.cartTotal();
    const delivery = 2.5;
    const promo = RW.S.cart.some((i) => i.type === 'food') ? Math.min(5, sub) : 0;
    const total = Math.round((sub + delivery - promo) * 100) / 100;
    const body =
      '<div class="card">' + rows + '</div>' +
      '<div class="card" style="margin-top:12px"><label class="fld" style="margin-top:0">Deliver to</label>' +
      '<div class="row" style="padding:8px 0;border:0"><div class="lead">🏠</div><div class="body"><div class="name">Home · 12 Main Street</div><div class="sub">Gibraltar · Leave at door</div></div><span class="link" style="color:var(--brand);font-weight:700">Change</span></div>' +
      '<div class="divider"></div>' +
      '<div class="kv"><span>Subtotal</span><span>' + money(sub) + '</span></div>' +
      '<div class="kv"><span>Delivery</span><span>' + money(delivery) + '</span></div>' +
      (promo ? '<div class="kv" style="color:var(--green)"><span>Promo ROCK5</span><span>−' + money(promo) + '</span></div>' : '') +
      '<div class="kv total"><span>Total</span><span>' + money(total) + '</span></div>' +
      '<div class="muted tiny" style="margin-top:8px">Paying with Rockway Wallet · ' + money(RW.S.wallet) + ' available</div></div>';
    const sticky = '<div class="checkout-bar"><button class="btn" data-act="placeOrder" data-total="' + total + '">Pay ' + money(total) + ' with Wallet</button></div>';
    return RW.ui.screen({ title: 'Your basket', body, sticky, fab: false });
  }

  function order(id) {
    const o = RW.S.orders.find((x) => x.id === id);
    if (!o) return RW.getFeature('activity').render([]);
    const steps = ['Order confirmed', 'Being prepared', 'Courier on the way', 'Delivered'];
    const stage = Math.min(3, Math.floor((Date.now() - o.t) / 240000));
    const stepHtml = steps.map((st, i) => {
      const cls = i < stage ? 'done' : i === stage ? 'active' : '';
      const last = i === steps.length - 1;
      return '<div class="track-step ' + cls + '"><div class="ico"><div class="ball">' + (i < stage ? '✓' : '') + '</div>' +
        (last ? '' : '<div class="line"></div>') + '</div>' +
        '<div class="txt"><div class="t">' + st + '</div><div class="muted tiny">' + (i === stage ? 'In progress…' : i < stage ? 'Done' : 'Pending') + '</div></div></div>';
    }).join('');
    const body =
      '<div class="card" style="background:linear-gradient(135deg,#0a9d4a,#0a7d34);color:#fff">' +
      '<div style="font-size:13px;opacity:.9">Estimated arrival</div><div style="font-size:30px;font-weight:900">' + o.eta + '</div>' +
      '<div style="opacity:.9;font-size:13px">' + esc(o.vendorName) + ' · ' + money(o.total) + '</div></div>' +
      '<div class="card" style="margin-top:12px">' + stepHtml + '</div>' +
      '<div class="card" style="margin-top:12px"><div class="row" style="border:0;padding:6px 0"><div class="lead">🛵</div>' +
      '<div class="body"><div class="name">' + esc(o.courier) + '</div><div class="sub">Your Rockway courier</div></div>' +
      '<button class="btn sm ghost" data-act="toast" data-msg="Calling courier…">Call</button></div></div>';
    return RW.ui.screen({ title: 'Order ' + o.ref, body, tab: 'activity', fab: false });
  }

  RW.register({ id: 'cart', title: 'Basket', emoji: '🧺', showTile: false, render: () => cart(),
    actions: {
      placeOrder: (el) => {
        const total = parseFloat(el.dataset.total);
        const vendorName = RW.S.cart[0].vendorName + (new Set(RW.S.cart.map((i) => i.vendorId)).size > 1 ? ' + more' : '');
        const type = RW.S.cart[0].type;
        if (!RW.store.debit(total, vendorName)) { RW.toast('Not enough balance — top up first'); RW.go('#/wallet'); return; }
        const o = { id: uid(), ref: ref('RK'), t: Date.now(), vendorName, type, total,
          eta: (15 + Math.floor(Math.random() * 20)) + ' min', courier: pick(['Mario', 'Lucia', 'Dwayne', 'Anaïs']) + ' on a scooter' };
        RW.S.orders.push(o); RW.store.clearCart();
        RW.toast('Order placed! 🎉'); RW.go('#/order/' + o.id);
      },
    },
  });
  RW.register({ id: 'order', title: 'Order', emoji: '🧾', showTile: false, render: (parts) => order(parts[0]) });
})(window.RW);
