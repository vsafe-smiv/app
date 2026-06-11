const CACHE_NAME = "v-safe-pwa-v23";

// รายการ App Shell หลัก — เฉพาะไฟล์ขนาดเล็กที่จำเป็นสำหรับ offline
// ลบรูปภาพขนาดใหญ่ออก (EMS, nurse, Police, VSAFE) เพื่อลดเวลา SW install
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css?v=18",
  "./app.js?v=24",
  "./admin.js?v=22",
  "./manifest.webmanifest",
  "./VSAFE2.png",
  "./icon%20app.png",
  "./nph%20logo.png",
  "./กรมสุขภาพจิต.png"
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

  // GAS และ Google APIs — ผ่านตรง ไม่ cache
  if (url.hostname === "script.google.com" || url.hostname === "script.googleusercontent.com") {
    event.respondWith(fetch(request));
    return;
  }

  // Google Fonts — network first, cache fallback
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // รูปภาพขนาดใหญ่ (EMS, nurse, Police, VSAFE) — network first เพื่อไม่บล็อก SW install
  if (url.pathname.match(/\/(EMS|nurse|Police|VSAFE).*\.png$/i)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response("", { status: 404 })))
    );
    return;
  }

  // ทรัพยากรอื่นทั้งหมด — network first, cache fallback
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
