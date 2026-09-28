const CACHE_NAME = "pagosmp-shell-v7";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/router.js",
  "./js/state.js",
  "./js/categorias.js",
  "./js/api.js",
  "./js/db.js",
  "./js/data.js",
  "./js/format.js",
  "./js/charts.js",
  "./js/views/inicio.js",
  "./js/views/movimientos.js",
  "./js/views/resumen.js",
  "./js/views/ajustes.js",
  "./js/views/form.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

// Estrategia: cache-first (con actualización en segundo plano) SOLO para el app shell
// (mismo origen). Las llamadas al Apps Script (otro origen, GET action=list y los POST)
// pasan directo a la red: la copia offline de los datos vive en IndexedDB (js/db.js),
// no en el Service Worker.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
