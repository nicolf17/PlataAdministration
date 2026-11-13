const CACHE = "plata-static-v7";
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
      .then(() => {
        // claim() seguro: solo si el worker está activo
        if (self.clients && self.clients.claim) {
          self.clients.claim();
        }
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => {
        // claim() seguro: dentro de activate, el worker ya está listo para tomar control
        if (self.clients && self.clients.claim) {
          self.clients.claim();
        }
      }),
  );
});

/**
 * Fetch con timeout corto y un reintento rápido.
 * Evita mostrar "sin conexión" por cold starts de Fly.io.
 * Si falla la red, permite que la navegación continúe o devuelve offline gracefully.
 */
async function fetchWithRetry(request, { timeout = 8000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(request, { signal: AbortSignal.timeout(timeout) });
      // Éxito: status 2xx o redirecciones 3xx para navegaciones
      if (request.mode === "navigate") {
        // Aceptamos 3xx (301, 302, 307, 308) como éxito para no caer al offline
        // por redirecciones del middleware de onboarding, etc.
        if (response.status >= 200 && response.status < 400) return response;
      } else {
        if (response.ok) return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < retries) {
      // Reintento corto (800ms) para sobreponerse a cold starts de ~1.5s de Fly.io.
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw lastError;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciòn: red primero. Si navigator.onLine es falso o falla de verdad, offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Si el navegador reporta que no hay internet, saltamos directo a offline.
        if (!navigator.onLine) {
          const offline = await caches.match(OFFLINE);
          // Retornamos la respuesta offline válida, no error() que bloquea más.
          return offline || new Response("Offline", { status: 503, statusText: "Sin conexión" });
        }
        try {
          const response = await fetchWithRetry(request);
          // Si la respuesta es válida (incluye redirecciones 3xx del middleware),
          // la devolvemos directamente sin caérnos al offline.
          if (response && (response.status >= 200 && response.status < 400)) return response;
          // Si el servidor devolvió 404/500, mostramos offline gracefully.
          const offline = await caches.match(OFFLINE);
          return offline || new Response("Error del servidor", { status: 500, statusText: "Error" });
        } catch (err) {
          // Errores de red reales (TypeError, network denied, etc.)
          // Devolvemos offline gracefully sin lanzar excepciones no capturadas.
          const offline = await caches.match(OFFLINE);
          return offline || newResponse("Sin conexión", { status: 503, statusText: "Sin conexión" });
        }
      })(),
    );
    return;
  }

  // Recursos estáticos: cach primero para carga rápida.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetchWithRetry(request, { timeout: 5000, retries: 0 });
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          // Si falla todo, servimos del cache aunque esté vacío (return Response error)
          return new Response("Resource not cached", { status: 404, statusText: "Not found" });
        }
      }),
    );
  }
});