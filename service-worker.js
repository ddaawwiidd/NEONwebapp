/* Simple cache-first service worker for full offline support */
const CACHE_NAME = 'led-scroller-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  // Optional icons – include if you add these files
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      // Network fallback; if offline, this will reject and be caught
      return fetch(req).then((resp) => {
        // Cache a copy of same-origin GETs
        const url = new URL(req.url);
        if (resp.ok && url.origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return resp;
      }).catch(() => {
        // As a last resort, return index.html for navigation requests
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 200 });
      });
    })
  );
});
