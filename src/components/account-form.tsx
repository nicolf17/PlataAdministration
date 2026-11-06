"use client";

import { useActionState } from "react";

import { createAccount, type ActionState } from "@/app/actions";

const TYPES = [
  { value: "CASH", label: "Efectivo" },
  { value: "BANK", label: "Cuenta bancaria" },
  { value: "SAVINGS", label: "Ahorros" },
  { value: "WALLET", label: "Billetera digital" },
];

export function AccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAccount,
    null,
  );

  return (
    <details className="card group p-4 open:pb-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        Agregar cuenta
        <span className="text-xs font-normal text-muted group-open:hidden">
          Efectivo, banco, ahorros…
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
            placeholder="Ej: Cuenta Davivienda"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="account-type">
            Tipo
          </label>
          <select id="account-type" name="type" className="input" defaultValue="BANK">
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
          <input
            id="account-initial"
            name="initial"
            inputMode="decimal"
            placeholder="0"
            className="input tabular-nums"
          />
        </div>

        <div className="flex items-end gap-3">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Creando…" : "Crear cuenta"}
          </button>
          {state ? (
            <p
              className={`text-[11px] font-medium ${
                state.ok ? "text-accent" : "text-danger"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </details>
  );
}
