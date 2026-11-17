"use client";

import { useEffect, useRef, useState } from "react";

// Alerta emergente (toast) única, anclada arriba a la derecha para que no tape
// títulos ni contenido principal de la pantalla. En mobile respeta el safe area.
// Entra desde arriba hacia abajo y sale de vuelta hacia arriba, así no tapa los
// controles de abajo (en el celular ahí vive la barra de navegación).
export type ToastTone = "success" | "error";

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4000,
  error: 6000,
};

const EXIT_MS = 240;

export function Toast({
  message,
  tone = "success",
  duration,
  onClose,
}: {
  message: string | null;
  tone?: ToastTone;
  duration?: number;
  onClose?: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    const stay = duration ?? DEFAULT_DURATION[tone];
    const exitTimer = setTimeout(() => setLeaving(true), stay);
    const closeTimer = setTimeout(() => {
      setGone(true);
      closeRef.current?.();
    }, stay + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [message, tone, duration]);

  if (!message || gone) return null;

  const palette =
    tone === "success"
      ? "border-accent/35 bg-surface text-accent"
      : "border-danger/40 bg-surface text-danger";

  return (
    <div className="pointer-events-none fixed top-[max(1rem,calc(env(safe-area-inset-top)+0.75rem))] right-4 z-50 flex justify-end">
      <div
        role={tone === "error" ? "alert" : "status"}
        aria-live={tone === "error" ? "assertive" : "polite"}
        className={`pointer-events-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border p-3 text-left text-[13px] font-medium shadow-lg ${palette} ${
          leaving ? "animate-toast-out" : "animate-toast-in"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

export default Toast;
