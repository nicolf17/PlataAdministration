"use client";

import { useEffect, useRef } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

// Mide lo que realmente siente la persona en su celular:
//   LCP  = cuándo aparece el contenido principal (objetivo < 2500 ms)
//   INP  = latencia de la interacción (objetivo < 200 ms)
//   CLS  = cuánto salta el layout (objetivo < 0.1)
//
// Hardening: cada métrica se reporta como máximo una vez por tipo por carga de
// página y con un tope global de reportes. Evita que un fallo o un re-render
// dispare un bucle infinito de POST a /api/vitals (que terminaba en 429 y
// saturando el servidor).
const MAX_REPORTS_PER_PAGE = 30;

export function WebVitals() {
  const reportedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const report = (metric: Metric) => {
      const name = metric.name;
      // Dedupe: una misma métrica no se vuelve a reportar.
      if (reportedRef.current.has(name)) return;
      if (reportedRef.current.size >= MAX_REPORTS_PER_PAGE) return;
      reportedRef.current.add(name);

      const payload = JSON.stringify({
        name,
        value: metric.value,
        rating: metric.rating,
        path: window.location.pathname,
      });

      // sendBeacon no bloquea la navegación; fetch keepalive es el fallback.
      // Ambas toleran fallar sin reintentos: un error de red no debe disparar
      // un bucle ni afectar la sesión del usuario.
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          if (navigator.sendBeacon("/api/vitals", blob)) return;
        }
        void fetch("/api/vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Sin reintentos: un fallo no debe escalar.
        });
      } catch {
        // Sin reintentos: un error no debe escalar.
      }
    };

    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  }, []);

  return null;
}

export default WebVitals;
