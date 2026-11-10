"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // En desarrollo un service worker con caché confunde más de lo que ayuda.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la app sigue funcionando online.
    });
  }, []);

  return null;
}
