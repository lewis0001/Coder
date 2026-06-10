/* Rockway core — hash router + global action bus.
 * Routes are driven by the feature registry: the first hash segment selects a
 * feature and the rest is passed to its render(parts). A handful of built-in
 * actions (nav/back/toast/add/qty) are handled here; features add their own. */
(function (RW) {
  'use strict';

  let root;
  let frontierTimer = null; // generic per-screen ticker slot

  let lastHash = null;
  function render() {
    if (!root) root = document.getElementById('app');
    if (frontierTimer) { clearInterval(frontierTimer); frontierTimer = null; }

    const hash = location.hash || '#/';
    // animate screen transitions only on real navigation — live-data refreshes
    // re-render in place and must not flash the fade-in again
    RW.navAnim = hash !== lastHash;
    lastHash = hash;
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const id = parts[0] || 'home';
    const feature = RW.getFeature(id) || RW.getFeature('home');

    let html;
    try {
      html = feature.render(parts.slice(1));
    } catch (e) {
      console.error('Rockway render error in', id, e);
      html = RW.ui.screen({ title: 'Oops', body: '<div class="empty"><div class="e">⚠️</div><p>Something went wrong loading this screen.</p></div>' });
    }
    root.innerHTML = html;
    const scr = root.querySelector('.screen');
    if (scr) scr.scrollTop = 0;

    // Let a feature opt into a live refresh tick (e.g. Frontier).
    if (feature.tick) {
      frontierTimer = setInterval(() => {
        if ((location.hash || '#/').indexOf(id) > -1) render();
      }, feature.tick);
    }
  }
  RW.render = render;

  // ---------------- built-in action handlers ----------------
  const builtins = {
    nav: (el) => RW.go(el.dataset.route),
    back: () => (history.length > 1 ? history.back() : RW.go('#/')),
    toast: (el) => RW.toast(el.dataset.msg),
  };

  document.addEventListener('click', function (ev) {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const handler = builtins[act] || RW.getAction(act);
    if (handler) { handler(el, ev); }
  });

  // Exposed so the headless smoke test can exercise built-in actions.
  RW.getBuiltin = (name) => builtins[name];

  window.addEventListener('hashchange', render);
  RW.bootRender = render;
})(window.RW);
