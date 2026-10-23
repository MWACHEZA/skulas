// Skulas Gate Scanner PWA Service Worker - Zimbabwe Offline Resilience
const CACHE_NAME = 'skulas-gate-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/gate',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache prefetch warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls directly with CacheStorage (they are handled by IndexedDB offline queue)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first with cache fallback for shell assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For HTML navigation requests, return the cached index
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/gate');
          }
          return new Response('Offline: Asset not available', { status: 503 });
        });
      })
  );
});
