// ── sw.js — Service Worker v2 ───────────────────────────────────────────
const CACHE_NAME = 'netpulse-v2';
const BASE = '/netpulse';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/css/style.css',
  BASE + '/js/storage.js',
  BASE + '/js/network.js',
  BASE + '/js/gauge.js',
  BASE + '/js/speedtest.js',
  BASE + '/js/diagnostics.js',
  BASE + '/js/history-chart.js',
  BASE + '/js/app.js',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
];

// Install — cache all app shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for app shell, network-only for speed tests
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always go to network for speed test endpoints
  if (
    url.includes('cloudflare.com') ||
    url.includes('httpbin.org') ||
    url.includes('gstatic.com/generate_204') ||
    url.includes('fonts.googleapis') ||
    url.includes('fonts.gstatic')
  ) {
    return;
  }

  // Cache-first strategy for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (
            response.ok &&
            event.request.method === 'GET' &&
            !url.includes('chrome-extension')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          if (event.request.mode === 'navigate') {
            return caches.match(BASE + '/index.html');
          }
        });
    })
  );
});
