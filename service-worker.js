const CACHE_NAME = 'storyscribe-v1';
const SHELL_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (url.pathname.endsWith('manifest.json')) {
        event.respondWith(
            caches.match('./manifest.json').then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    const corrected = new Response(response.body, {
                        status: response.status,
                        headers: new Headers({
                            'Content-Type': 'application/manifest+json'
                        })
                    });
                    caches.open(CACHE_NAME).then(cache =>
                        cache.put('./manifest.json', corrected.clone())
                    );
                    return corrected;
                });
            })
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok && event.request.method === 'GET' 
                    && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => 
                        cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});