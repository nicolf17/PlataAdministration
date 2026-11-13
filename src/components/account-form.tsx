"use client";

import { useActionState } from "react";

import { createAccount, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { IconWallet } from "@/components/icons";

export function AccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAccount,
    null,
  );

  return (
    <details className="card group p-5 open:pb-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <IconWallet className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold leading-tight sm:text-lg">
              Agregar tarjeta débito
            </span>
            <span className="mt-0.5 block text-[11.5px] font-normal text-muted">
              Cuenta de ahorros
            </span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-normal text-muted group-open:hidden">
          Abrir
        </span>
      </summary>

      <form action={formAction} className="mt-5 grid gap-3 sm:grid-cols-2">
        {/* Tipo fijo: el efectivo es nativo y no se crea desde acá. */}
        <input type="hidden" name="type" value="SAVINGS" />

        <div className="sm:col-span-2">
          <label className="label" htmlFor="account-name">
            Nombre
          </label>
          <input
            id="account-name"
            name="name"
            placeholder="Ej: Cuenta de ahorros Bancolombia"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="account-initial">
            Saldo actual
          </label>
          <AmountInput
            id="account-initial"
            name="initial"
            placeholder="0"
            className="input tabular-nums"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            La plata que tenés hoy en esa cuenta. Si no la sabés, dejalo en cero.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="btn btn-primary w-full sm:w-auto"
            disabled={pending}
          >
            {pending ? "Creando…" : "Crear cuenta"}
          </button>
        </div>

        {state ? (
          <p
            className={`text-[11px] font-medium sm:col-span-2 ${
              state.ok ? "text-accent" : "text-danger"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </details>
  );
}
