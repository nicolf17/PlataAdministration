"use client";

import { useActionState } from "react";

import { createAccount, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";

const TYPES = [
  { value: "CASH", label: "Efectivo" },
];

export function AccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAccount,
    null,
  );

  return (
    <details className="card group p-4 open:pb-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        Agregar método de pago
        <span className="text-xs font-normal text-muted group-open:hidden">
          Efectivo
        </span>
      </summary>

      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="account-name">
            Nombre
          </label>
          <input
            id="account-name"
            name="name"
            placeholder="Ej: Efectivo"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="account-type">
            Tipo
          </label>
          <select
            id="account-type"
            name="type"
            className="input"
            defaultValue="CASH"
          >
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="account-initial">
            Saldo inicial
          </label>
          <AmountInput
            id="account-initial"
            name="initial"
            placeholder="0"
            className="input tabular-nums"
          />
        </div>

        <div className="flex items-end gap-3">
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
            {pending ? "Creando…" : "Crear"}
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
