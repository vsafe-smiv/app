const CACHE_NAME = "v-safe-pwa-v20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css?v=14",
  "./app.js?v=20",
  "./admin.js?v=17",
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
  const url = new URL(request.url);

  if (url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com") {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});
โ
