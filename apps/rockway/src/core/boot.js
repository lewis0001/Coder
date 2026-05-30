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
    // marketplace spine: discover & book local businesses + the business side
    'src/features/discover.js',
    'src/features/business.js',
    // automatable local features
    'src/features/frontier.js',   // live cameras + community crowd-reports
    'src/features/marketplace.js',
    'src/features/jobs.js',
    'src/features/property.js',
    'src/features/events.js',
    'src/features/explore.js',
    'src/features/news.js',        // live Gibraltar Chronicle RSS (with fallback)
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
