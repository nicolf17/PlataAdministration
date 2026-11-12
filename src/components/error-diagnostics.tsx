"use client";

import { useEffect } from "react";

// Diagnóstico en cliente: captura errores no manejados (window.onerror) y
// promesas rechazadas sin catch (unhandledrejection) para que ningún fallo
// silencioso quede invisible. Se loguea con console.error para poder verlo en
// la consola del navegador del usuario.
export function ErrorDiagnostics() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error("[plata] Error de página:", event.message, event.error);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("[plata] Promesa rechazada sin manejo:", event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

export default ErrorDiagnostics;
