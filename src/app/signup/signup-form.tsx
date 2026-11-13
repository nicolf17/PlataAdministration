"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { resendSignupCode, signup, verifySignup } from "@/app/actions";
import type { ActionState } from "@/app/actions";
import { Toast, type ToastTone } from "@/components/toast";

type Step = "signup" | "verify" | "resend";

export function SignupForm() {
  const [signupState, signupAction, signupPending] = useActionState<ActionState, FormData>(
    signup,
    null,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState<ActionState, FormData>(
    verifySignup,
    null,
  );
  const [resendState, resendAction, resendPending] = useActionState<ActionState, FormData>(
    resendSignupCode,
    null,
  );
  // Qué formulario se envió último: define de dónde sale la alerta, así un
  // mensaje viejo no tapa al nuevo.
  const [lastAction, setLastAction] = useState<Step>("signup");
  // Cambia en cada envío: la alerta repite la animación aunque el mensaje se repita.
  const [attempt, setAttempt] = useState(0);
  // Estado para alternar visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const email = verifyState?.email ?? signupState?.email ?? resendState?.email ?? "";
  const showVerify =
    verifyState?.ok ||
    verifyState?.step === "verify" ||
    signupState?.step === "verify" ||
    resendState?.step === "verify";

  // Al confirmar el código: mostramos la alerta arriba y recién después navegamos.
  useEffect(() => {
    if (verifyState?.ok) {
      const t = setTimeout(() => router.push("/"), 1800);
      return () => clearTimeout(t);
    }
  }, [verifyState, router]);

  const activeState =
    lastAction === "resend" ? resendState : lastAction === "verify" ? verifyState : signupState;

  const pending = signupPending || verifyPending || resendPending;
  const toast: { message: string; tone: ToastTone } | null =
    pending || !activeState
      ? null
      : { message: activeState.message, tone: activeState.ok ? "success" : "error" };

  const devCode = activeState?.devCode ?? null;

  function handleSubmit(step: Step) {
    setLastAction(step);
    setAttempt((n) => n + 1);
  }

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <Toast
        key={`${attempt}:${toast?.message ?? "none"}`}
        message={toast?.message ?? null}
        tone={toast?.tone}
      />

      {!showVerify ? (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted">
            Empezá a trackear tus finanzas. Te mandamos un código para confirmar tu correo.
          </p>

          <form
            action={signupAction}
            onSubmit={() => handleSubmit("signup")}
            className="card mt-6 space-y-4 p-4"
          >
            <div>
              <label className="label" htmlFor="name">
                Nombre
              </label>
              <input id="name" name="name" type="text" autoComplete="name" required className="input" />
            </div>
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
                  }'
                />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="input"
                aria-describedby="toggle-password"
              />
              <p className="mt-1 text-[11px] text-muted">Mínimo 6 caracteres.</p>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={signupPending}>
              {signupPending ? "Enviando código…" : "Crear cuenta"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Confirmá tu correo</h1>
          <p className="mt-1 text-sm text-muted">
            Mandamos un código de 6 dígitos a{" "}
            <span className="font-medium text-foreground">{email}</span>. Vence en 10 minutos.
          </p>

          <form
            action={verifyAction}
            onSubmit={() => handleSubmit("verify")}
            className="card mt-6 space-y-4 p-4"
          >
            <input type="hidden" name="email" value={email} />
            <div>
              <label className="label" htmlFor="code">
                Código
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                className="input text-center text-2xl tracking-[0.6em] tabular-nums"
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={verifyPending}>
              {verifyPending ? "Confirmando…" : "Confirmar cuenta"}
            </button>

            {devCode ? (
              <p className="rounded-lg border border-line bg-surface-2 p-2 text-center text-[11px] text-muted">
                Modo desarrollo: el código es{" "}
                <span className="font-mono text-foreground">{devCode}</span>
              </p>
            ) : null}
          </form>

          <form action={resendAction} onSubmit={() => handleSubmit("resend")} className="mt-3">
            <input type="hidden" name="email" value={email} />
            <button type="submit" className="btn btn-ghost w-full" disabled={resendPending}>
              {resendPending ? "Enviando…" : "Enviar otro código"}
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-[13px] text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
