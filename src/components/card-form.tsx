"use client";

import { useActionState } from "react";

import { createCreditCard, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { IconCreditCard } from "@/components/icons";

export function CardForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCreditCard,
    null,
  );

  return (
    <details className="card group p-5 open:pb-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info/15 text-info">
            <IconCreditCard className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold leading-tight sm:text-lg">
              Agregar tarjeta de crédito
            </span>
            <span className="mt-0.5 block text-[11.5px] font-normal text-muted">
              Cupo, corte y pago
            </span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-normal text-muted group-open:hidden">
          Abrir
        </span>
      </summary>

      <form action={formAction} className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="card-name">
            Nombre
          </label>
          <input
            id="card-name"
            name="name"
            placeholder="Ej: Visa Platinum"
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
          <button
            type="submit"
            className="btn btn-primary w-full sm:w-auto"
            disabled={pending}
          >
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
