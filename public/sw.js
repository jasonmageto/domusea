// public/sw.js
const CACHE_NAME = 'domusea-v2'; // ⬅️ Bumped version for this update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
      } catch (err) {
        console.error('❌ [SW] Install cache failed:', err);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      } catch (err) {
        console.error('❌ [SW] Activate cleanup failed:', err);
      }
    })()
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API/Supabase requests
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // SPA routing fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Network-first for JS/CSS
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response.clone());
            } catch (err) {
              console.warn('⚠️ [SW] Failed to cache asset:', request.url);
            }
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for images/fonts
  if (['image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // Default fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ✅ Handle SKIP_WAITING message from App.jsx
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});