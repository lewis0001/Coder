/* Rockway core — persistent state store (localStorage backed).
 * Feature modules read/write via RW.store.* and RW.S.
 * IMPORTANT: when adding new persisted state, extend defaults() so older
 * saved blobs are forward-compatible (Object.assign merge on load). */
(function (RW) {
  'use strict';
  const { uid } = RW.util;
  const KEY = 'rockway.v1';

  function defaults() {
    return {
      name: 'Gibraltarian',
      lang: 'en',
      wallet: 75.0,
      points: 320,                 // Rockway Rewards points
      cart: [],                    // [{key,type,name,price,emoji,vendorId,vendorName,qty}]
      orders: [],                  // food/shop orders
      parcels: [],                 // send
      appointments: [],            // gov + health
      tickets: [],                 // events + explore
      contacts: [                  // pay / split
        { id: 'c1', name: 'Mum', emoji: '👩' },
        { id: 'c2', name: 'Dwayne', emoji: '🧑🏽' },
        { id: 'c3', name: 'Lucia', emoji: '👩🏻' },
        { id: 'c4', name: 'Kayan', emoji: '🧑🏼' },
      ],
      chats: {},                   // chatId -> { id,name,emoji,messages:[{from,text,t}] }
      listings: [],                // marketplace items the user posted
      savings: 0,                  // savings pot
      // ---- per-feature persisted collections (pre-added so feature modules
      //      never need to edit core; guard reads with `|| []` regardless) ----
      parking: [],                 // parking pay-and-display sessions
      parkingPermits: [],          // residential parking permits
      propertyTab: 'rent',         // property rent/buy toggle
      prescriptions: [],           // health repeat prescriptions
      jobApps: [],                 // job applications
      savedProperties: [],         // saved property listings
      viewings: [],                // property viewing requests
      redemptions: [],             // rewards redeemed
      topups: [],                  // mobile/eSIM top-ups
      payRequests: [],             // P2P money requests
      bills: {},                   // billerId -> { paidAt, amount }
      savedListings: [],           // marketplace saved items
      newsBookmarks: [],           // saved news items
      txns: [
        { id: uid(), t: Date.now() - 86400000, label: 'Top-up · Visa ••42', amt: +50, kind: 'in' },
        { id: uid(), t: Date.now() - 43200000, label: "Roy's Cod Plaice", amt: -13.5, kind: 'out' },
      ],
    };
  }

  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { S = defaults(); }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function reset() { localStorage.removeItem(KEY); S = defaults(); save(); RW.S = S; }

  // ---- wallet helpers (single source of truth for money movement) ----
  function debit(amt, label) {
    amt = Math.round(amt * 100) / 100;
    if (S.wallet < amt) return false;
    S.wallet = Math.round((S.wallet - amt) * 100) / 100;
    if (amt > 0) S.txns.push({ id: uid(), t: Date.now(), label, amt: -amt, kind: 'out' });
    // earn 1 point per £1 spent
    S.points += Math.floor(amt);
    save();
    return true;
  }
  function credit(amt, label) {
    amt = Math.round(amt * 100) / 100;
    S.wallet = Math.round((S.wallet + amt) * 100) / 100;
    S.txns.push({ id: uid(), t: Date.now(), label, amt: +amt, kind: 'in' });
    save();
    return true;
  }

  // ---- cart helpers ----
  const cartCount = () => RW.util.sum(S.cart.map((i) => i.qty));
  const cartTotal = () => RW.util.sum(S.cart.map((i) => i.qty * i.price));
  function addToCart(item) {
    const found = S.cart.find((i) => i.key === item.key);
    if (found) found.qty += 1;
    else S.cart.push(Object.assign({ qty: 1 }, item));
    save();
  }
  function setQty(key, delta) {
    const it = S.cart.find((i) => i.key === key);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) S.cart = S.cart.filter((i) => i.key !== key);
    save();
  }
  function clearCart() { S.cart = []; save(); }

  RW.S = S;
  RW.store = {
    save, reset, defaults,
    debit, credit,
    cartCount, cartTotal, addToCart, setQty, clearCart,
  };
})(window.RW);
