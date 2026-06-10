/* Rockway core — RW.FICON: the hand-drawn service icon set.
 * One consistent voice: 24-grid, 1.8 stroke, round caps, ink lines with at
 * most ONE brand-red or gold accent per glyph. These replace emoji on every
 * service tile — emoji read as placeholder; a drawn set reads as designed. */
(function (RW) {
  'use strict';

  const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const A = 'fill="none" stroke="var(--brand)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const G = 'fill="none" stroke="var(--gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const wrap = (inner) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';

  RW.FICON = {
    home: wrap(
      '<path d="M4.4 11.2L12 4.6l7.6 6.6" ' + S + '/>' +
      '<path d="M6.4 10.2v9.4h11.2v-9.4" ' + S + '/>' +
      '<path d="M10.4 19.6v-5h3.2v5" ' + G + '/>'
    ),
    lostfound: wrap(
      '<path d="M10.4 10.4m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" ' + S + '/>' +
      '<path d="M14 14l5 5" ' + A + '/>' +
      '<path d="M8 10.4h4.8M10.4 8v4.8" ' + G + '/>'
    ),
    carpool: wrap(
      '<path d="M4.6 14.4l1.4-4.2a2 2 0 0 1 1.9-1.4h8.2a2 2 0 0 1 1.9 1.4l1.4 4.2" ' + S + '/>' +
      '<path d="M4 14.4h16v3.4a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-.8H7.6v.8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" ' + S + '/>' +
      '<path d="M7.2 16.1h.01M16.8 16.1h.01" stroke="var(--brand)" stroke-width="2.4" stroke-linecap="round"/>'
    ),
    // The Gibraltar key — brand mark, used on the Discover hero tile.
    key: wrap(
      '<circle cx="6.4" cy="12" r="3.1" ' + S + '/>' +
      '<path d="M9.5 12H20.2" ' + S + '/>' +
      '<path d="M15.6 12v3.2M19 12v2.4" ' + S + '/>'
    ),
    discover: wrap(
      '<circle cx="10.6" cy="10.6" r="5.6" ' + S + '/>' +
      '<path d="M14.9 14.9L20 20" ' + A + '/>'
    ),
    frontier: wrap(
      '<path d="M4 8.6h12.6" ' + S + '/><path d="M13.4 5.4l3.2 3.2-3.2 3.2" ' + S + '/>' +
      '<path d="M20 15.4H7.4" ' + A + '/><path d="M10.6 12.2l-3.2 3.2 3.2 3.2" ' + A + '/>'
    ),
    weather: wrap(
      '<path d="M4.6 19.5L11.8 9.2l7 10.3" ' + S + '/>' +
      '<path d="M7.4 7.4a3.2 3.2 0 0 1 5.6-1.6 2.8 2.8 0 0 1 4.6 2.1c0 .6-.2 1.1-.5 1.6" ' + G + '/>'
    ),
    runway: wrap(
      '<path d="M3.8 18.6h16.4" stroke-dasharray="3 2.6" ' + S + '/>' +
      '<path d="M6.4 12.6l11.4-4-4.5 4.1 1.5 3.4-2.3-1.7-3.3 1.2 1-2.2z" fill="var(--brand)" stroke="var(--brand)" stroke-width="1.2" stroke-linejoin="round"/>'
    ),
    today: wrap(
      '<path d="M4 16.6h16" ' + S + '/>' +
      '<path d="M8 16.6a4 4 0 0 1 8 0" ' + G + '/>' +
      '<path d="M12 8.8V6.6M7 11.4 5.6 10M17 11.4 18.4 10" ' + S + '/>'
    ),
    events: wrap(
      '<path d="M4 6.2q8 2.6 16 0" ' + S + '/>' +
      '<path d="M7.2 7l1.4 2.9 1.5-2.6" ' + S + '/>' +
      '<path d="M13.6 7.3l1.4 2.8 1.5-2.6" ' + A + '/>'
    ),
    explore: wrap(
      '<path d="M9.6 20l.9-10h3l.9 10M7.6 20h8.8M9.9 10h4.2" ' + S + '/>' +
      '<path d="M10.4 10L12 6.4 13.6 10" ' + S + '/>' +
      '<path d="M16.6 6.6l2.2-1.2M7.4 6.6L5.2 5.4" ' + G + '/>'
    ),
    news: wrap(
      '<path d="M4.6 6h12v13h-12z" ' + S + '/>' +
      '<path d="M16.6 9h2.8v8.2a1.8 1.8 0 0 1-1.8 1.8H6.4" ' + S + '/>' +
      '<path d="M7.2 9.6h6.8M7.2 12.4h6.8M7.2 15.2h4.2" ' + S + '/>'
    ),
    chat: wrap(
      '<rect x="4.4" y="5.4" width="15.2" height="10.6" rx="3" ' + S + '/>' +
      '<path d="M9 16v3.4L12.6 16" ' + S + '/>' +
      '<path d="M8.4 10.7h.01M12 10.7h.01M15.6 10.7h.01" stroke="var(--brand)" stroke-width="2.4" stroke-linecap="round"/>'
    ),
    jobs: wrap(
      '<rect x="4.4" y="8" width="15.2" height="10.6" rx="2" ' + S + '/>' +
      '<path d="M9.4 8V6.8A1.8 1.8 0 0 1 11.2 5h1.6a1.8 1.8 0 0 1 1.8 1.8V8" ' + S + '/>' +
      '<path d="M4.4 12.4h6M13.6 12.4h6" ' + S + '/><path d="M10.4 12.4h3.2" ' + G + '/>'
    ),
    property: wrap(
      '<path d="M4.4 20h15.2" ' + S + '/>' +
      '<rect x="7" y="4.6" width="10" height="15.4" rx="1.2" ' + S + '/>' +
      '<circle cx="14.2" cy="12.6" r="1" fill="var(--gold)" stroke="none"/>'
    ),
    marketplace: wrap(
      '<path d="M12.8 4.6h6.6v6.6l-8.4 8.4-6.6-6.6z" ' + S + '/>' +
      '<circle cx="16.3" cy="7.7" r="1.3" ' + A + '/>'
    ),
    business: wrap(
      '<path d="M5.4 9.2L6.8 5.4h10.4l1.4 3.8" ' + S + '/>' +
      '<path d="M4.6 9.2h14.8" ' + G + '/>' +
      '<path d="M6.2 9.2V19.6h11.6V9.2M10.4 19.6v-5.4h3.2v5.4" ' + S + '/>'
    ),
    activity: wrap(
      '<rect x="4.4" y="6" width="15.2" height="13.4" rx="2" ' + S + '/>' +
      '<path d="M4.4 10h15.2M8.6 4.4v3M15.4 4.4v3" ' + S + '/>' +
      '<path d="M9 14.4l2 2 4-4" ' + A + '/>'
    ),
    account: wrap(
      '<circle cx="12" cy="8.4" r="3.4" ' + S + '/>' +
      '<path d="M5.4 19.6a6.8 5.8 0 0 1 13.2 0" ' + S + '/>'
    ),
  };
})(window.RW);
