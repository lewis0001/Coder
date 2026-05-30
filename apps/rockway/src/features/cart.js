/* Rockway feature — Basket, checkout & order tracking.
 * Owns the #/cart and #/order/:id routes and the placeOrder action. */
(function (RW) {
  'use strict';
  const { esc, money, uid, ref, pick } = RW.util;

  /* Step icons for the tracking timeline */
  const STEP_ICON = ['🧾', '👨‍🍳', '🛵', '🎉'];

  /* Courier-card accent colours (subtle) */
  const COURIER_BG = 'linear-gradient(135deg,#1455c0,#0a3d8a)';

  function cart() {
    if (!RW.S.cart.length) {
      return RW.ui.screen({
        title: 'Your basket',
        fab: false,
        body: RW.ui.empty(
          '🧺',
          'Your basket is empty — add something tasty or some groceries.',
          'Explore food & drink',
          '#/eat'
        ),
      });
    }

    const rows = RW.S.cart.map(function (i) {
      const lineTotal = money(i.price * i.qty);
      return (
        '<div class="row" style="align-items:flex-start;padding:14px 0">' +
        '<div class="lead" style="font-size:26px;border-radius:14px">' + i.emoji + '</div>' +
        '<div class="body">' +
        '<div class="name">' + esc(i.name) + '</div>' +
        '<div class="sub" style="margin-top:2px">' + esc(i.vendorName) + '</div>' +
        '<div class="qty" style="margin-top:10px">' +
        '<button data-act="qty" data-key="' + i.key + '" data-d="-1">&#8722;</button>' +
        '<span>' + i.qty + '</span>' +
        '<button data-act="qty" data-key="' + i.key + '" data-d="1">&#43;</button>' +
        '</div>' +
        '</div>' +
        '<div class="trail" style="padding-top:2px">' +
        '<span class="num" style="font-size:15px;font-weight:800">' + esc(lineTotal) + '</span>' +
        '<div class="muted tiny" style="margin-top:4px;text-align:right">' +
        esc(money(i.price)) + ' ea.' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    const sub      = RW.store.cartTotal();
    const delivery = 2.5;
    const promo    = RW.S.cart.some(function (i) { return i.type === 'food'; }) ? Math.min(5, sub) : 0;
    const total    = Math.round((sub + delivery - promo) * 100) / 100;

    const promoRow = promo
      ? '<div class="kv" style="color:var(--green)">' +
        '<span style="display:inline-flex;align-items:center;gap:6px">' +
        '<span class="pill-status ok" style="padding:3px 8px;font-size:11px">ROCK5</span>' +
        'Promo</span>' +
        '<span class="num">&#8722;' + esc(money(promo)) + '</span></div>'
      : '';

    const body =
      '<div class="card">' + rows + '</div>' +

      '<div class="card" style="margin-top:12px">' +
      '<label class="fld" style="margin-top:0">Deliver to</label>' +
      '<div class="row" style="padding:10px 0;border:0;align-items:center">' +
      '<div class="lead" style="background:var(--sea-soft)">🏠</div>' +
      '<div class="body">' +
      '<div class="name">12 Main Street, Gibraltar</div>' +
      '<div class="sub">GX11 1AA · Leave at door</div>' +
      '</div>' +
      '<span class="link" style="color:var(--brand);font-weight:700;font-size:13px;flex-shrink:0">Change</span>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="kv"><span class="muted">Subtotal</span><span class="num">' + esc(money(sub)) + '</span></div>' +
      '<div class="kv"><span class="muted">Delivery</span><span class="num">' + esc(money(delivery)) + '</span></div>' +
      promoRow +
      '<div class="kv total"><span>Total</span><span class="num">' + esc(money(total)) + '</span></div>' +
      '<div class="muted tiny" style="margin-top:10px;display:flex;align-items:center;gap:6px">' +
      '<span>💳</span>' +
      '<span>Rockway Wallet · <span class="num">' + esc(money(RW.S.wallet)) + '</span> available</span>' +
      '</div>' +
      '</div>';

    const sticky =
      '<div class="checkout-bar">' +
      '<button class="btn" data-act="placeOrder" data-total="' + total + '" style="font-size:16px">' +
      'Pay <span class="num">' + esc(money(total)) + '</span> with Wallet' +
      '</button>' +
      '<div class="muted tiny" style="text-align:center;margin-top:6px">' +
      'Secure payment via Rockway Wallet' +
      '</div>' +
      '</div>';

    return RW.ui.screen({ title: 'Your basket', body: body, sticky: sticky, fab: false });
  }

  function order(id) {
    const o = RW.S.orders.find(function (x) { return x.id === id; });
    if (!o) return RW.getFeature('activity').render([]);

    const steps = [
      'Order confirmed',
      'Being prepared',
      'Courier on the way',
      'Delivered',
    ];
    const stage = Math.min(3, Math.floor((Date.now() - o.t) / 240000));

    const stepHtml = steps.map(function (st, i) {
      const isDone   = i < stage;
      const isActive = i === stage;
      const isLast   = i === steps.length - 1;
      const cls      = isDone ? 'done' : isActive ? 'active' : '';
      const ballContent = isDone ? '&#10003;' : STEP_ICON[i];
      const subLabel = isActive
        ? '<span style="color:var(--brand);font-weight:700">In progress…</span>'
        : isDone
          ? '<span style="color:var(--green)">Done</span>'
          : '<span style="color:var(--fog)">Pending</span>';

      return (
        '<div class="track-step ' + cls + '" style="padding-bottom:' + (isLast ? '4px' : '0') + '">' +
        '<div class="ico">' +
        '<div class="ball" style="font-size:' + (isDone ? '12px' : '13px') + '">' + ballContent + '</div>' +
        (isLast ? '' : '<div class="line"></div>') +
        '</div>' +
        '<div class="txt">' +
        '<div class="t">' + esc(st) + '</div>' +
        '<div class="tiny" style="margin-top:2px">' + subLabel + '</div>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    /* ETA hero card */
    const etaCard =
      '<div class="card" style="background:linear-gradient(135deg,#0a9d4a,#066b30);color:#fff;overflow:hidden;position:relative">' +
      '<div style="font-size:12px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.5px">Estimated arrival</div>' +
      '<div style="font-size:36px;font-weight:900;line-height:1.1;margin:6px 0 4px">' +
      '<span class="num">' + esc(o.eta) + '</span>' +
      '</div>' +
      '<div style="opacity:.9;font-size:13px;display:flex;align-items:center;gap:8px">' +
      '<span>' + esc(o.vendorName) + '</span>' +
      '<span style="opacity:.6">·</span>' +
      '<span class="num">' + esc(money(o.total)) + '</span>' +
      '</div>' +
      '<div style="position:absolute;right:-16px;bottom:-16px;font-size:80px;opacity:.12;line-height:1">🛵</div>' +
      '</div>';

    /* Timeline card */
    const timelineCard =
      '<div class="card" style="margin-top:12px">' +
      RW.ui.sectionTitle('Delivery progress') +
      '<div style="margin-top:4px">' + stepHtml + '</div>' +
      '</div>';

    /* Courier card */
    const courierCard =
      '<div class="card" style="margin-top:12px;background:' + COURIER_BG + ';color:#fff">' +
      '<div style="font-size:11px;font-weight:700;opacity:.8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Your courier</div>' +
      '<div class="row" style="border:0;padding:0;align-items:center">' +
      '<div class="lead" style="background:rgba(255,255,255,0.15);font-size:22px">🛵</div>' +
      '<div class="body">' +
      '<div class="name" style="color:#fff">' + esc(o.courier) + '</div>' +
      '<div class="sub" style="color:rgba(255,255,255,0.7)">Rockway delivery partner</div>' +
      '</div>' +
      '<button class="btn sm ghost" style="border-color:rgba(255,255,255,0.5);color:#fff;background:rgba(255,255,255,0.12)" data-act="toast" data-msg="Calling courier…">Call</button>' +
      '</div>' +
      '</div>';

    /* Order ref footer */
    const refFooter =
      '<div class="muted tiny" style="text-align:center;margin-top:16px;padding-bottom:4px">' +
      'Order ref: <span class="num" style="font-weight:700">' + esc(o.ref) + '</span>' +
      '</div>';

    const body = etaCard + timelineCard + courierCard + refFooter;

    return RW.ui.screen({ title: 'Track order', body: body, tab: 'activity', fab: false });
  }

  RW.register({
    id: 'cart',
    title: 'Basket',
    emoji: '🧺',
    showTile: false,
    render: function () { return cart(); },
    actions: {
      placeOrder: function (el) {
        const total      = parseFloat(el.dataset.total);
        const vendorName = RW.S.cart[0].vendorName +
          (new Set(RW.S.cart.map(function (i) { return i.vendorId; })).size > 1 ? ' + more' : '');
        const type = RW.S.cart[0].type;
        if (!RW.store.debit(total, vendorName)) {
          RW.toast('Not enough balance — top up first');
          RW.go('#/wallet');
          return;
        }
        const o = {
          id:         uid(),
          ref:        ref('RK'),
          t:          Date.now(),
          vendorName: vendorName,
          type:       type,
          total:      total,
          eta:        (15 + Math.floor(Math.random() * 20)) + ' min',
          courier:    pick(['Mario', 'Lucia', 'Dwayne', 'Anaïs']) + ' on a scooter',
        };
        RW.S.orders.push(o);
        RW.store.clearCart();
        RW.toast('Order placed! 🎉');
        RW.go('#/order/' + o.id);
      },
    },
  });

  RW.register({
    id: 'order',
    title: 'Order',
    emoji: '🧾',
    showTile: false,
    render: function (parts) { return order(parts[0]); },
  });
})(window.RW);
