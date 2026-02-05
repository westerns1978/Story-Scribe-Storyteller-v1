// basic sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network for API and authentication calls
  if (event.request.url.includes('.run.app') || 
      event.request.url.includes('supabase.co') || 
      event.request.url.includes('googleSearch')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});