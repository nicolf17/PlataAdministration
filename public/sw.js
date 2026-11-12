const CACHE = "plata-static-v4";
const OFFLINE = "/offline.html";
const PRECACHE = [
  OFFLINE,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: siempre red primero; si no hay conexión, pantalla offline.
  // El AbortSignal evita que una navegación nunca resuelta congele la pantalla.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { signal: AbortSignal.timeout(10000) }).catch(async () => {
        const offline = await caches.match(OFFLINE);
        return offline || Response.error();
      }),
    );
    return;
  }

  // Estáticos: caché primero para que la app cargue rápido.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request, { signal: AbortSignal.timeout(10000) });
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
