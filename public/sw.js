const CACHE = "plata-static-v6";
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

/**
 * Fetch con timeout y un reintento.
 *
 * La máquina de Fly puede estar arrancando (cold start): el primer intento
 * queda colgado o vuelve 502/503. Un reintento corto evita mostrar "sin
 * conexión" por un reinicio del servidor, que era lo que se veía al entrar.
 */
async function fetchWithRetry(request, { timeout = 15000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(request, { signal: AbortSignal.timeout(timeout) });
      if (response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
  throw lastError;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: siempre red primero; si no hay conexión, pantalla offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetchWithRetry(request).catch(async () => {
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
        const response = await fetchWithRetry(request, { timeout: 10000, retries: 1 });
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
