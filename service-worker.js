// Service worker for Shree RK iTeraHERTZ Care.
// Caches the app shell so it opens instantly and works fully offline
// (all real data still lives in the browser's localStorage, same as before —
// this only makes the app FILES themselves available without internet).
//
// IMPORTANT: the HTML page uses a NETWORK-FIRST strategy. Every time you
// open the app with internet available, it fetches the latest index.html
// first (so updates like renamed buttons show up immediately, no hard
// refresh needed) and only falls back to the cached copy when there's no
// internet at all.

const CACHE_NAME = 'rk-clinic-cache-v2';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isPageLoad = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isPageLoad) {
    // Network-first: always try to get the freshest index.html when
    // online; only use the cached copy if there's genuinely no internet.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (icons, manifest): serve from cache instantly if
  // available, but refresh the cache in the background either way.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

