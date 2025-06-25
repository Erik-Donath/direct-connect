// Direct Connect Service Worker
// Modern, privacy-first peer-to-peer chat app (WebRTC, PeerJS)
// https://github.com/Erik-Donath/direct-connect

/*

const CACHE_NAME = "direct-connect-cache-dev"; // Will be set overwritten by github action (deploy.yml)
const URLS_TO_CACHE = [
  ".",
  "index.html",
  "icon.svg",
  "manifest.json"
];

// On install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.error("[Service Worker] cache.addAll failed:", err);
      })
    )
  );
  self.skipWaiting();
});

// On activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) =>
          cache !== CACHE_NAME ? caches.delete(cache) : null
        )
      )
    )
  );
  self.clients.claim();
});

// Caching
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Exclude dev tools, websockets, and PeerJS assets/endpoints
  if (
    request.url.includes('/sockjs-node') || 
    request.url.includes('/@vite/') ||
    request.url.startsWith('ws:') ||
    request.url.startsWith('wss:') ||
    request.url.includes('peerjs') ||
    request.url.includes('unpkg.com/peerjs')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((response) => {
      if (response) return response;

      return fetch(request).then((networkResponse) => {
        if (
          request.url.startsWith("http://") ||
          request.url.startsWith("https://")
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    })
  );
});

// Skip Waiting
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

*/