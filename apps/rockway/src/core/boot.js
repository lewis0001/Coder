/* Rockway core — boot loader.
 *
 * Loads every feature module from the manifest below by injecting <script>
 * tags (works on file:// unlike fetch). The manifest is PRE-DECLARED with all
 * planned features, including ones not built yet: a missing file simply fails
 * its onerror and is skipped, so the app always runs and features light up as
 * their files land. This decoupling is what lets parallel agents each create
 * one feature file without ever editing a shared file.
 *
 * To add a feature: create src/features/<id>.js that calls RW.register(...),
 * and ensure its filename is in MANIFEST below. */
(function (RW) {
  'use strict';

  const MANIFEST = [
    // shared cross-feature data / read APIs
    'src/features/_shared.js',
    // core surfaces
    'src/features/home.js',
    'src/features/activity.js',
    'src/features/account.js',
    'src/features/cart.js',
    // daily life
    'src/features/eat.js',
    'src/features/shop.js',
    'src/features/send.js',
    'src/features/frontier.js',
    'src/features/move.js',
    'src/features/parking.js',
    // money
    'src/features/wallet.js',
    'src/features/pay.js',
    'src/features/bills.js',
    'src/features/topup.js',
    'src/features/rewards.js',
    // services
    'src/features/gov.js',
    'src/features/health.js',
    'src/features/jobs.js',
    'src/features/property.js',
    'src/features/marketplace.js',
    // explore & connect
    'src/features/events.js',
    'src/features/explore.js',
    'src/features/news.js',
    'src/features/chat.js',
  ];

  function loadSeq(i) {
    if (i >= MANIFEST.length) { ready(); return; }
    const s = document.createElement('script');
    s.src = MANIFEST[i];
    s.onload = () => loadSeq(i + 1);
    s.onerror = () => { /* feature not built yet — skip gracefully */ loadSeq(i + 1); };
    document.head.appendChild(s);
  }

  function ready() {
    RW.userEmail = RW.userEmail || 'hello@rockway.gi';
    RW.bootRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadSeq(0));
  } else {
    loadSeq(0);
  }
})(window.RW);
