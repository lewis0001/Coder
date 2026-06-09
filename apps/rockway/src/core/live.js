/* Rockway core — RW.live: tiny client for the /api/* live-data proxies.
 *
 * Usage inside a feature render():
 *   var w = RW.live.get('weather');   // payload object, or null while loading/offline
 *   if (w) { ...render live... } else { ...render seed/fallback... }
 *
 * get() fires the fetch once per session (per name), re-renders when data
 * arrives, and soft-refreshes after a TTL. Degrades to permanent null on
 * file://, in the headless smoke test (no fetch), or when a proxy is down —
 * features MUST always render something sensible from their seed fallback. */
(function (RW) {
  'use strict';

  const TTL = {
    news: 5 * 60 * 1000,
    weather: 15 * 60 * 1000,
    flights: 30 * 60 * 1000,
    pharmacy: 12 * 60 * 60 * 1000,
    holidays: 24 * 60 * 60 * 1000,
    fixtures: 12 * 60 * 60 * 1000,
  };

  const data = {};    // name -> payload (only when ok:true)
  const state = {};   // name -> 'loading' | 'ok' | 'fail'
  const stamp = {};   // name -> fetched-at ms

  let renderQueued = false;
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(() => { renderQueued = false; try { RW.render(); } catch (e) {} }, 40);
  }

  const canFetch = typeof fetch === 'function' && typeof location !== 'undefined' && /^http/.test(location.protocol || '');

  function load(name) {
    state[name] = 'loading';
    fetch('/api/' + name)
      .then((r) => r.json())
      .then((payload) => {
        if (payload && payload.ok) {
          data[name] = payload;
          state[name] = 'ok';
          stamp[name] = Date.now();
          queueRender();
        } else {
          state[name] = 'fail';
        }
      })
      .catch(() => { state[name] = 'fail'; });
  }

  RW.live = {
    // Returns the live payload or null. Kicks off (re)fetching as needed.
    get(name) {
      if (!canFetch) return null;
      const st = state[name];
      const ttl = TTL[name] || 10 * 60 * 1000;
      if (!st || (st === 'ok' && Date.now() - (stamp[name] || 0) > ttl)) load(name);
      return data[name] || null;
    },
    // 'loading' | 'ok' | 'fail' | undefined (never asked)
    status(name) { return canFetch ? state[name] : 'fail'; },
    // Minutes since the payload was fetched server-side (for honest labels).
    ageMin(name) {
      const p = data[name];
      if (!p || !p.fetched) return null;
      return Math.max(0, Math.round((Date.now() - p.fetched) / 60000));
    },
  };
})(window.RW);
