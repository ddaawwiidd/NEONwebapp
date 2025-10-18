const CACHE = 'led-scroller-v3';

// Core assets required to run offline
const CORE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest'
];

// Optional assets (don’t break install if missing)
const OPTIONAL = [
  './icon-192.png',
  './icon-512.png'
];

// The stylesheet we want to pre-cache (DotGothic16)
const GF_CSS_URL = 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache core files; if any one is missing, install would fail
    await cache.addAll(CORE);
    // Try to cache optional files; ignore failures
    await Promise.all(OPTIONAL.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) await cache.put(url, res.clone());
      } catch (_) { /* ignore */ }
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle GET
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    // Cache-first
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      // Cache same-origin GETs in the background
      const url = new URL(request.url);
      if (response.ok && url.origin === location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      // Offline fallback for navigation
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('', { status: 200 });
    }
  })());
});

