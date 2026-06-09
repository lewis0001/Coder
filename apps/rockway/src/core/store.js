/* Rockway core — persistent state store (localStorage backed).
 * Feature modules read/write via RW.store.* and RW.S.
 *
 * Rockway is a local-business discovery + booking marketplace for Gibraltar.
 * No in-app payments (no wallet) for the MVP — bookings are requests/reservations
 * confirmed by the business; payment happens in person (card processing comes
 * later via a PSP, not a home-grown wallet).
 *
 * IMPORTANT: when adding new persisted state, extend defaults() so older saved
 * blobs are forward-compatible (Object.assign merge on load). Always guard reads
 * with `|| []` / `|| {}` so a missing field never throws. */
(function (RW) {
  'use strict';
  const KEY = 'rockway.v2';

  function defaults() {
    return {
      name: 'Gibraltarian',
      lang: 'en',

      // ---- marketplace spine ----
      bookings: [],                // customer bookings: {id,ref,t,bizId,bizName,service,price,when,status}
      myBusiness: null,            // the user's own business listing (supply side) or null
      bizBookings: [],            // demo bookings received by the user's business
      savedBusinesses: [],         // saved/favourite business ids

      // ---- community + listings (all user-generated / automatable) ----
      frontierReports: [],         // crowd-sourced border reports: {id,t,lane,level,note}
      listings: [],                // marketplace classifieds the user posted
      savedListings: [],           // marketplace saved items
      jobApps: [],                 // job applications
      savedProperties: [],         // saved property listings
      viewings: [],                // property viewing requests
      propertyTab: 'rent',         // property rent/buy toggle
      reservations: [],            // events + explore reservations: {id,ref,t,kind,name,when}
      newsFilter: {},              // news source/category filter
      newsNotices: [],             // community noticeboard posts
      newsBookmarks: [],           // saved news items
      evtCat: '',                  // events category filter
      evtMon: '',                  // events month filter
      _exploreFilter: 'all',       // explore category filter
      _cableCarNotify: false,      // explore cable-car reopening notify flag
      _bizDraftCat: null,          // business onboarding draft category

      // ---- chat (customer ⇄ business / friends) ----
      contacts: [
        { id: 'c1', name: 'Paws & Claws Grooming', emoji: '🐩' },
        { id: 'c2', name: 'Rock Barbers', emoji: '💈' },
        { id: 'c3', name: 'Lucia', emoji: '👩🏻' },
        { id: 'c4', name: 'Dwayne', emoji: '🧑🏽' },
      ],
      chats: {},                   // chatId -> { id,name,emoji,messages:[{from,text,t}] }
    };
  }

  let S;
  try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { S = defaults(); }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function reset() { localStorage.removeItem(KEY); S = defaults(); save(); RW.S = S; }

  RW.S = S;
  RW.store = { save, reset, defaults };
})(window.RW);
