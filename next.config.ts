import type { NextConfig } from "next";

// Content Security Policy baseada: scripts/estilos self, img data:, connect a nuestra API,
// fonts self, frame-ancestors none (evita framing), worker-src self blob:.
// En desarrollo React necesita eval() para reconstruir callstacks; sin él la
// hidratación falla y Next deja el HTML del stream oculto (pantalla en blanco).
// En producción esa excepción no hace falta, así que no se incluye.
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  // Solo en producción: en dev rompería el HMR y los assets en http.
  !isDev ? "upgrade-insecure-requests" : null,
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // El driver de Postgres usa APIs de Node (sockets, tls): no lo bundleamos.
  serverExternalPackages: ["pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Headers de seguridad añadidos en runtime por Next.js.
  // Next 16 permite headers en la config mediante la sección `headers`.
  // Los colocamos aquí para que se injecten en cada respuesta.
  async headers() {
    return [
      // HSTS: forzar HTTPS durante 1 año (31536000 s). Incluir subdominios.
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Evitar que el navegador adivine el MIME type basado en el contenido.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Controlar a dónde se refiere el navegador al salir del sitio.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Prohibir que la app se incruste en frames (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Restringir qué APIs del navegador están disponibles.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // Content Security Policy baseada: scripts/estilos self, img data:, connect a nuestra API,
          // fonts self, frame-ancestors none (evita framing), worker-src self blob:.
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;