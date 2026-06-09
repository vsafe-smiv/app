const CACHE_NAME = "v-safe-pwa-v14";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css?v=13",
  "./app.js?v=13",
  "./admin.js?v=14",
  "./manifest.webmanifest",
  "./VSAFE.png",
  "./VSAFE2.png",
  "./icon%20app.png",
  "./nph%20logo.png",
  "./กรมสุขภาพจิต.png",
  "./nurse.png",
  "./EMS.png",
  "./Police.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
