"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { login } from "@/app/actions";
import type { ActionState } from "@/app/actions";
import { Toast } from "@/components/toast";

export function LoginForm({ loggedOut = false, registroExitoso = false }: { loggedOut?: boolean; registroExitoso?: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(login, null);
  const [salida, setSalida] = useState(loggedOut);
  // Cambia en cada envío: fuerza a la alerta a repetir la animación aunque el
  // mensaje sea el mismo (por ejemplo, dos veces "Email o contraseña inválidos").
  const [attempt, setAttempt] = useState(0);
  // Estado para alternar visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);

  // El login exitoso no se queda acá: la action redirige al panel.
  const toast = pending
    ? null
    : state && !state.ok
      ? { message: state.message, tone: "error" as const }
      : salida
        ? { message: "Sesión cerrada.", tone: "success" as const }
        : registroExitoso
          ? { message: "¡Registro exitoso! Ya puedes iniciar sesión con el correo y la contraseña que acabas de crear", tone: "success" as const }
          : null;

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <Toast
        key={`${attempt}:${toast?.message ?? "none"}`}
        message={toast?.message ?? null}
        tone={toast?.tone}
        onClose={() => setSalida(false)}
      />

      <h1 className="text-xl font-semibold tracking-tight">Bienvenido a plata</h1>
      <p className="mt-1 text-sm text-muted">Iniciá sesión para ver tus finanzas.</p>

      <form
        action={formAction}
        onSubmit={() => setAttempt((n) => n + 1)}
        className="card mt-6 space-y-4 p-4"
      >
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div className="relative">
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <button
              id="toggle-password"
              type="button"
              aria-label="Mostrar contraseña"
              className="btn btn-ghost text-[12px] px-2 py-1 rounded-md hover:bg-surface-2"
            >
              {showPassword ? '<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21a5 5 0 0 1 5-5H5a5 5 0 0 1 5 5zM3 13a4 4 0 0 0 4-4H7a4 4 0 0 0 4 4v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a4 4 0 0 0-4 4v-2"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.94 17.94a1 1 0 0 1 0 1.41l-3 3a1 1 0 0 1-1.41 0l-3-3a1 1 0 0 1 0-1.41l3-3a1 1 0 0 1 1.41 0zM7.93 7.93a1 1 0 0 1 1.41 0l3 3a1 1 0 0 1-1.41 1.41l-3-3a1 1 0 0 1-1.41-1.41l3 3zM21 3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3.585l5.015 5.015a.5.5 0 0 1-.708.708l-7.916-7.916a.5.5 0 0 1 0-.822l7.916 7.916a.5.5 0 0 1 .708.708zM3 21a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H3z"/></svg>'
              />
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            aria-describedby="toggle-password"
          />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="font-semibold text-accent underline">
          Crear una
        </Link>
      </p>
    </div>
  );
}

export default LoginForm;
