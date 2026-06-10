/* Rockway service worker — installable + offline shell.
 *
 * Strategy:
 *  - /api/*           → network-first, fall back to last cached payload
 *                       (RW.live already labels freshness, so stale is honest)
 *  - same-origin GET  → stale-while-revalidate (instant loads, quiet updates)
 *  - navigations      → cached index.html when offline
 * Bump VERSION on any breaking shell change to invalidate old caches. */
'use strict';
const VERSION = 'rw-v1';
const SHELL = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/core/util.js',
  '/src/core/icons.js',
  '/src/core/store.js',
  '/src/core/registry.js',
  '/src/core/ui.js',
  '/src/core/rock.js',
  '/src/core/live.js',
  '/src/core/router.js',
  '/src/core/boot.js',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts/CDNs: browser default

  // live data: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || new Response('{"ok":false}', { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // navigations: cache, then network, then cached shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // static: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
