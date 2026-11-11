"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

// Mide lo que realmente siente la persona en su celular:
//   LCP  = cuándo aparece el contenido principal (objetivo < 2500 ms)
//   INP  = latencia de la interacción (objetivo < 200 ms)
//   CLS  = cuánto salta el layout (objetivo < 0.1)
export function WebVitals() {
  useEffect(() => {
    const report = (metric: Metric) => {
      const payload = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        path: window.location.pathname,
      });

      // sendBeacon no bloquea la navegación; fetch keepalive es el fallback.
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon("/api/vitals", blob)) return;
      }
      void fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
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
