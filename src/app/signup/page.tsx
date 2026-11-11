"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { resendSignupCode, signup, verifySignup } from "@/app/actions";
import type { ActionState } from "@/app/actions";
import { Toast, type ToastTone } from "@/components/toast";

type Step = "signup" | "verify" | "resend";

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
  // QuÃ© formulario se enviÃ³ Ãºltimo: define de dÃ³nde sale la alerta, asÃ­ un
  // mensaje viejo no tapa al nuevo.
  const [lastAction, setLastAction] = useState<Step>("signup");
  // Cambia en cada envÃ­o: la alerta repite la animaciÃ³n aunque el mensaje se repita.
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();

  const email = verifyState?.email ?? signupState?.email ?? resendState?.email ?? "";
  const showVerify =
    verifyState?.ok ||
    verifyState?.step === "verify" ||
    signupState?.step === "verify" ||
    resendState?.step === "verify";

  // Al confirmar el cÃ³digo: mostramos la alerta arriba y reciÃ©n despuÃ©s navegamos.
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
            EmpezÃ¡ a trackear tus finanzas. Te mandamos un cÃ³digo para confirmar tu correo.
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
            <div>
              <label className="label" htmlFor="password">
                ContraseÃ±a
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
              <p className="mt-1 text-[11px] text-muted">MÃ­nimo 6 caracteres.</p>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={signupPending}>
              {signupPending ? "Enviando cÃ³digoâ€¦" : "Crear cuenta"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight">ConfirmÃ¡ tu correo</h1>
          <p className="mt-1 text-sm text-muted">
            Mandamos un cÃ³digo de 6 dÃ­gitos a{" "}
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
                CÃ³digo
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
              {verifyPending ? "Confirmandoâ€¦" : "Confirmar cuenta"}
            </button>

            {devCode ? (
              <p className="rounded-lg border border-line bg-surface-2 p-2 text-center text-[11px] text-muted">
                Modo desarrollo: el cÃ³digo es{" "}
                <span className="font-mono text-foreground">{devCode}</span>
              </p>
            ) : null}
          </form>

          <form
            action={resendAction}
            onSubmit={() => handleSubmit("resend")}
            className="mt-3"
          >
            <input type="hidden" name="email" value={email} />
            <button type="submit" className="btn btn-ghost w-full" disabled={resendPending}>
              {resendPending ? "Enviandoâ€¦" : "Enviar otro cÃ³digo"}
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-[13px] text-muted">
        Â¿Ya tenÃ©s cuenta?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          IngresÃ¡
        </Link>
      </p>
    </div>
  );
}
