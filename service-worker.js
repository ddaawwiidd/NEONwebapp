// Bump this when you change anything important so clients get the update
const CACHE = 'led-scroller-v15';

const CORE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Google Fonts CSS we want to pre-cache for DotGothic16
const GF_CSS_URL = 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // 1) Cache app shell
    await cache.addAll(CORE);

    // 2) Fetch + cache Google Fonts CSS and referenced WOFF2
    try {
      const cssResp = await fetch(GF_CSS_URL, { cache: 'no-store' });
      if (cssResp.ok) {
        const cssText = await cssResp.clone().text();
        await cache.put(GF_CSS_URL, cssResp);

        const fontUrls = Array.from(cssText.matchAll(/https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2/g)).map(m => m[0]);
        await Promise.all(fontUrls.map(async (url) => {
          try {
            const fontResp = await fetch(url, { mode: 'cors', cache: 'no-store' });
            if (fontResp.ok) await cache.put(url, fontResp.clone());
          } catch {}
        }));
      }
    } catch {
      // If fonts can't be fetched now, runtime fetch handler will cache them later.
    }
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
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isGoogleFonts =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  event.respondWith((async () => {
    // Cache-first for everything — great for static apps
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const resp = await fetch(req);
      if (resp.ok && (url.origin === location.origin || isGoogleFonts)) {
        const cache = await caches.open(CACHE);
        cache.put(req, resp.clone());
      }
      return resp;
    } catch {
      if (req.mode === 'navigate') return caches.match('./index.html');
      return new Response('', { status: 200 });
    }
  })());
});



