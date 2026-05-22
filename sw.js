// ── sw.js — Service Worker ──────────────────────────────────────────────
const CACHE = 'netpulse-v1.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/network.js',
  '/js/gauge.js',
  '/js/speedtest.js',
  '/js/diagnostics.js',
  '/js/history-chart.js',
  '/js/app.js',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Pass through test/measurement requests
  const url = event.request.url;
  if (url.includes('cloudflare') || url.includes('httpbin') || url.includes('google') || url.includes('gstatic')) {
    return; // network only
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
