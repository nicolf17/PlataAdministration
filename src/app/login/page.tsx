"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { login } from "@/app/actions";
import type { ActionState } from "@/app/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(login, null);
  const router = useRouter();

  // Al loguearse con éxito: mostramos la alerta (del state) y navegamos al panel.
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push("/"), 2000);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <h1 className="text-xl font-semibold tracking-tight">Bienvenido a plata</h1>
      <p className="mt-1 text-sm text-muted">
        Iniciá sesión para ver tus finanzas.
      </p>

      <form action={formAction} className="card mt-6 space-y-4 p-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>

        {state?.ok ? (
          <p role="status" className="text-[12px] font-medium text-accent">
            Sesión iniciada. ¡Bienvenido!
          </p>
        ) : null}

        {state && !state.ok ? (
          <p role="status" className="text-[12px] font-medium text-danger">
            {state.message}
          </p>
        ) : null}
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
