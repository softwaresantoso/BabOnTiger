const CACHE = "barber-online-v3";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // SPA navigation
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Clone IMMEDIATELY before the browser consumes the response body.
            const responseClone = response.clone();

            caches
              .open(CACHE)
              .then((cache) => cache.put("/index.html", responseClone))
              .catch(() => {
                // Cache failure must never break the main response.
              });
          }

          return response;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then((cached) => cached || caches.match("/"))
        )
    );

    return;
  }

  // Static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          // Clone immediately before returning the original response.
          const responseClone = response.clone();

          caches
            .open(CACHE)
            .then((cache) => cache.put(request, responseClone))
            .catch(() => {
              // Cache failure must never break the main response.
            });
        }

        return response;
      });
    })
  );
});