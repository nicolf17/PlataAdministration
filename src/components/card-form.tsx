"use client";

import { useActionState } from "react";

import { createCreditCard, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";

export function CardForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCreditCard,
    null,
  );

  return (
    <details className="card group p-4 open:pb-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        Agregar tarjeta de crédito
        <span className="text-xs font-normal text-muted group-open:hidden">
          Cupo, corte y pago
        </span>
      </summary>

      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="card-name">
            Nombre
          </label>
          <input
            id="card-name"
            name="name"
            placeholder="Ej: Tarjeta de crédito"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="card-limit">
            Cupo total
          </label>
          <AmountInput
            id="card-limit"
            name="limit"
            placeholder="3.000.000"
            className="input tabular-nums"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="card-closing">
              Día de corte
            </label>
            <input
              id="card-closing"
              name="closingDay"
              type="number"
              min={1}
              max={31}
              defaultValue={25}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="card-due">
              Día de pago
            </label>
            <input
              id="card-due"
              name="dueDay"
              type="number"
              min={1}
              max={31}
              defaultValue={10}
              className="input"
              required
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
            {pending ? "Creando…" : "Crear tarjeta"}
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
