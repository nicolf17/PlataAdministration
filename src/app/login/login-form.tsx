"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { login } from "@/app/actions";
import type { ActionState } from "@/app/actions";
import { Toast } from "@/components/toast";

export function LoginForm({ loggedOut = false }: { loggedOut?: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(login, null);
  const [salida, setSalida] = useState(loggedOut);
  // Cambia en cada envío: fuerza a la alerta a repetir la animación aunque el
  // mensaje sea el mismo (por ejemplo, dos veces "Email o contraseña inválidos").
  const [attempt, setAttempt] = useState(0);

  // El login exitoso no se queda acá: la action redirige al panel.
  const toast = pending
    ? null
    : state && !state.ok
      ? { message: state.message, tone: "error" as const }
      : salida
        ? { message: "Sesión cerrada.", tone: "success" as const }
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
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
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
