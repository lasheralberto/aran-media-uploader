// Fix: Add a reference to the 'webworker' library to get correct types for Service Worker APIs.
/// <reference lib="webworker" />

// This tells TypeScript that this is a Service Worker file
// Fix: Replaced the problematic 'declare const self' with a correctly typed constant 'swScope'.
// This avoids redeclaration errors and ensures that TypeScript understands this is a Service Worker context,
// which in turn fixes type errors on event handlers and their event objects (e.g., event.waitUntil).
const swScope = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = 'media-cache-v1';
const FIREBASE_STORAGE_URL_PREFIX = 'https://firebasestorage.googleapis.com/';

swScope.addEventListener('install', (event) => {
  // The service worker is being installed.
  // We can pre-cache assets here if needed.
  console.log('Service Worker: Install');
});

swScope.addEventListener('activate', (event) => {
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

swScope.addEventListener('fetch', (event) => {
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
