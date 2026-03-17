// Service Worker for MeetEasier
// Network-first strategy for app assets, cache-first only for vendor libs

const CACHE_NAME = 'meeteasier-17fe82e00db6f618';
const RUNTIME_CACHE = 'meeteasier-runtime';

// Vendor assets that never change — cache-first is safe
const IMMUTABLE_PREFIXES = [
  '/css/6.2.3/',
  '/css/3.0.0/',
  '/js/1.12.4/',
  '/js/6.2.3/',
  '/css/font.css',
];

function isImmutableAsset(url) {
  return IMMUTABLE_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
}

// Install event - skip waiting immediately
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});


// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip socket.io
  if (url.pathname.startsWith('/socket.io')) return;

  // Skip API requests entirely — let them go straight to network
  if (url.pathname.startsWith('/api')) return;

  // Vite hashed assets (/assets/index-DtpW3qYv.js) — cache-first, they're immutable
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Vendor libs (foundation, jquery) — cache-first, they never change
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (HTML, styles.css, app JS) — NETWORK FIRST
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, try to serve cached index.html
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Message event - handle commands from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});
