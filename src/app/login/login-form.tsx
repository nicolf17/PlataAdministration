"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { login } from "@/app/actions";
import type { ActionState } from "@/app/actions";
import { IconEye, IconEyeOff } from "@/components/icons";
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
      <p className="mt-1 text-sm text-muted">Inicia sesión para ver tus finanzas.</p>

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
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {showPassword ? (
                <IconEyeOff className="h-5 w-5" />
              ) : (
                <IconEye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-semibold text-accent underline">
          Crear una
        </Link>
      </p>
    </div>
  );
}

export default LoginForm;
