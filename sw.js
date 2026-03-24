// Story Scribe Service Worker v1.1
const CACHE_NAME = 'story-scribe-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// Install — cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clear old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Supabase, Gemini, Pixabay APIs → network only (never cache)
// - Everything else → network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always network for API calls
  const isApi = url.hostname.includes('supabase.co') ||
                url.hostname.includes('googleapis.com') ||
                url.hostname.includes('generativelanguage.google') ||
                url.hostname.includes('pixabay.com') ||
                url.hostname.includes('incompetech.com') ||
                url.hostname.includes('freemusicarchive.org') ||
                url.hostname.includes('wikimedia.org') ||
                url.hostname.includes('archive.org') ||
                url.hostname.includes('xai.com') ||
                url.hostname.includes('anthropic.com');

  if (isApi || event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache fresh responses for static assets
        if (response.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Force update when new SW is available
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});