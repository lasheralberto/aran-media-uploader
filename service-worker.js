// self is a global variable in service workers.
const CACHE_NAME = 'media-cache-v1';
const FIREBASE_STORAGE_URL_PREFIX = 'https://firebasestorage.googleapis.com/';

self.addEventListener('install', (event) => {
  // The service worker is being installed.
  // We can pre-cache assets here if needed.
  console.log('Service Worker: Install');
});

self.addEventListener('activate', (event) => {
  // The service worker is being activated.
  // This is a good time to clean up old caches.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only apply cache-first strategy for GET requests to Firebase Storage
  if (request.method === 'GET' && request.url.startsWith(FIREBASE_STORAGE_URL_PREFIX)) {
    event.respondWith(
      (async () => {
        // 1. Try to find the response in the cache.
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          // console.log('Service Worker: Serving from cache:', request.url);
          return cachedResponse;
        }

        // 2. If not in cache, fetch from the network.
        try {
          // console.log('Service Worker: Fetching from network:', request.url);
          const response = await fetch(request);

          // 3. If the fetch is successful, clone the response and store it in the cache.
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            // We must clone the response as it's a one-time-use stream
            cache.put(request, response.clone());
          }
          
          return response;

        } catch (error) {
            console.error('Service Worker: Fetch failed:', error);
            // You could return a fallback offline image here if you had one.
            throw error;
        }
      })()
    );
  }
});
