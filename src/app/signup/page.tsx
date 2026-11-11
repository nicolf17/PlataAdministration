"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { resendSignupCode, signup, verifySignup } from "@/app/actions";
import type { ActionState } from "@/app/actions";

const TOAST =
  "animate-rise fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-line bg-surface p-4 text-center text-[13px] font-medium text-accent shadow-lg";

export default function SignupPage() {
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
  const router = useRouter();

  const email = verifyState?.email ?? signupState?.email ?? resendState?.email ?? "";
  const step: "form" | "verify" =
    verifyState?.ok ||
    verifyState?.step === "verify" ||
    signupState?.step === "verify" ||
    resendState?.step === "verify"
      ? "verify"
      : "form";

  // Al confirmar el código: mostramos la alerta (del state) y navegamos al panel.
  useEffect(() => {
    if (verifyState?.ok) {
      const t = setTimeout(() => router.push("/"), 2000);
      return () => clearTimeout(t);
    }
  }, [verifyState, router]);

  const errorMessage =
    (verifyState && !verifyState.ok && verifyState.message) ||
    (resendState && !resendState.ok && resendState.message) ||
    (signupState && !signupState.ok && !signupState.step ? signupState.message : null);

  const infoMessage =
    (verifyState?.ok && verifyState.message) ||
    (resendState?.ok && resendState.message) ||
    (signupState?.ok && signupState.message) ||
    null;

  const devCode =
    (verifyState?.devCode ?? resendState?.devCode ?? signupState?.devCode) || null;

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      {verifyState?.ok ? (
        <div role="status" className={TOAST}>
          {verifyState.message}
        </div>
      ) : null}

      {step === "form" ? (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted">
            Empezá a trackear tus finanzas. Te mandamos un código para confirmar tu correo.
          </p>

          <form action={signupAction} className="card mt-6 space-y-4 p-4">
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
            <div>
              <label className="label" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="input"
              />
              <p className="mt-1 text-[11px] text-muted">Mínimo 6 caracteres.</p>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={signupPending}>
              {signupPending ? "Enviando código…" : "Crear cuenta"}
            </button>

            {errorMessage ? (
              <p role="alert" className="text-[12px] font-medium text-danger">
                {errorMessage}
              </p>
            ) : null}
          </form>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Confirmá tu correo</h1>
          <p className="mt-1 text-sm text-muted">
            Mandamos un código de 6 dígitos a{" "}
            <span className="font-medium text-foreground">{email}</span>. Vence en 10 minutos.
          </p>

          <form action={verifyAction} className="card mt-6 space-y-4 p-4">
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

            {infoMessage && !verifyState?.ok ? (
              <p role="status" className="text-[12px] font-medium text-accent">
                {infoMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p role="alert" className="text-[12px] font-medium text-danger">
                {errorMessage}
              </p>
            ) : null}

            {devCode ? (
              <p className="rounded-lg border border-line bg-surface-2 p-2 text-center text-[11px] text-muted">
                Modo desarrollo: el código es <span className="font-mono text-foreground">{devCode}</span>
              </p>
            ) : null}
          </form>

          <form action={resendAction} className="mt-3">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="btn btn-ghost w-full"
              disabled={resendPending}
            >
              {resendPending ? "Enviando…" : "Enviar otro código"}
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-[13px] text-muted">
        Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          Ingresá
        </Link>
      </p>
    </div>
  );
}
