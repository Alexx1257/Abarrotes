/**
 * sw.js — Service Worker manual para AbarroteSaaS PWA
 *
 * Estrategia de caché implementada:
 *  - 'install': precachea archivos críticos.
 *  - 'fetch':   responde desde red, y si falla desde caché (Network First).
 */

const CACHE_NAME = 'abarrotesaas-cache-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorar fetch a la API de Supabase, porque Supabase-js maneja su propio cache/offline requests
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Network First, fallback a Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Opcional: Almacenar en caché las respuestas exitosas de assets estáticos
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // En caso de estar offline, buscar en caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es una navegación (SPA routing), fallback al index.html cacheado
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
