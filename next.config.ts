import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // better-sqlite3 es un módulo nativo: debe cargarse desde node_modules.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
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
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data:; " +
              "font-src 'self'; " +
              "connect-src 'self'; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "frame-ancestors 'none'; " +
              "worker-src 'self' blob:; " +
              "upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default nextConfig;