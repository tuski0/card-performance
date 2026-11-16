// Minimal service worker: makes the app installable and keeps the last-seen pages for offline viewing.
const CACHE = 'card-performance-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only same-origin GETs; Supabase API calls always go to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network first, falling back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || url.pathname.startsWith('/_next/static/'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
  );
});
