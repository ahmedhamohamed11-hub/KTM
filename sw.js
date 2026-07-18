// KTM Service Worker
// Minimal, defensive App-Shell-Cache. Ziel: index.html soll auch offline
// öffnen. Supabase-/API-Aufrufe werden NIE abgefangen, damit Sync und
// Realtime nicht durch den Service Worker gestört werden.

const CACHE_NAME = 'ktm-shell-6ca2ee5011';
const APP_SHELL = ['./', './index.html', './manifest.json', './logo-192.png', './logo-512.png', './logo-maskable-192.png', './logo-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .catch((err) => console.warn('SW: App-Shell-Cache fehlgeschlagen', err))
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
    const url = new URL(event.request.url);

    // Nur eigene GET-Requests auf denselben Origin behandeln. Alles andere
    // (Supabase, CDN-Bibliotheken, POST/PUT/DELETE, Cross-Origin) unangetastet
    // durchreichen, damit Sync/Realtime/CDN-Ladevorgänge nicht beeinträchtigt werden.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {
            // Für App-Dateien (HTML/JS/CSS) NETWORK-FIRST: immer die neueste Version
            // holen, nur bei Offline auf den Cache zurückfallen. Verhindert, dass nach
            // einem Update alte Dateien aus dem Cache angezeigt werden.
            const isAsset = url.pathname.endsWith('.html') || url.pathname.endsWith('.js') ||
                url.pathname.endsWith('.css') || url.pathname === '/' || url.pathname.endsWith('/');
            if (isAsset) {
                try {
                    const response = await fetch(event.request);
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                } catch (e) {
                    const cached = await caches.match(event.request);
                    return cached || Response.error();
                }
            }
            // Übrige Requests: cache-first mit Hintergrund-Update
            const cached = await caches.match(event.request);
            const network = fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })()
    );
});
