/**
 * Minimal service worker — only exists so the browser considers the site
 * installable as a PWA. Deliberately does NOT cache API calls (Supabase) or
 * the HTML document, so users always see live data and the latest deploy.
 * Static build assets (JS/CSS under /_expo/static/) are content-hashed by
 * Metro, so caching them long-term is always safe.
 */
const STATIC_CACHE = 'enjazaty-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept cross-origin requests (Supabase, etc.) or non-GET.
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  // Hashed static build assets: cache-first (new deploy = new filename).
  if (url.pathname.startsWith('/_expo/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Everything else (HTML document, API-adjacent routes): always network,
  // so the app never shows stale code or stale auth state.
});
