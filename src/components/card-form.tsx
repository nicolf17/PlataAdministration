"use client";

import { useActionState } from "react";

import { createCreditCard, type ActionState } from "@/app/actions";

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
        <div>
          <label className="label" htmlFor="card-name">
            Nombre
          </label>
          <input
            id="card-name"
            name="name"
            placeholder="Ej: Visa Davivienda"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="card-limit">
            Cupo total
          </label>
          <input
            id="card-limit"
            name="limit"
            inputMode="decimal"
            placeholder="3000000"
            className="input tabular-nums"
            required
          />
        </div>

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

        <div className="flex items-end gap-3 sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Creando…" : "Crear tarjeta"}
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
