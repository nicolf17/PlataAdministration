"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { signup } from "@/app/actions";
import type { ActionState } from "@/app/actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signup, null);
  const router = useRouter();

  // Al registrarse con éxito: mostramos la alerta (del state) y navegamos al panel.
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push("/"), 2000);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <h1 className="text-xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted">Empezá a trackear tus finanzas.</p>

      <form action={formAction} className="card mt-6 space-y-4 p-4">
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <input id="name" name="name" type="text" autoComplete="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>

        {state?.ok ? (
          <div
            role="status"
            className="animate-rise fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-line bg-surface p-4 text-center text-[13px] font-medium text-accent shadow-lg"
          >
            {state.message}
          </div>
        ) : null}

        {state && !state.ok ? (
          <p role="status" className="text-[12px] font-medium text-danger">
            {state.message}
          </p>
        ) : null}
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
