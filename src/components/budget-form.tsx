"use client";

import Link from "next/link";
import { useActionState } from "react";

import { upsertBudget, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";

type BudgetInitial = {
  id: string;
  categoryId: string;
  categoryName: string;
  limitMinor: number;
};

export function BudgetForm({
  month,
  categories,
  initial,
}: {
  month: string;
  categories: Array<{ id: string; name: string; parentId: string | null }>;
  initial?: BudgetInitial;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    upsertBudget,
    null,
  );

  return (
    <form
      id="presupuesto-form"
      action={formAction}
      className="card grid scroll-mt-20 gap-3 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
    >
      <input type="hidden" name="month" value={month} />
      {initial ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="categoryId" value={initial.categoryId} />
        </>
      ) : null}

      <div>
        <label
          className="label"
          htmlFor={initial ? undefined : "budget-category"}
        >
          Categoría
        </label>
        {initial ? (
          <p className="input flex items-center text-muted">
            {initial.categoryName}
          </p>
        ) : (
          <select
            id="budget-category"
            name="categoryId"
            className="input"
            required
            defaultValue=""
          >
            <option value="">Elegir…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="label" htmlFor="budget-limit">
          Límite del mes
        </label>
        <AmountInput
          key={initial?.id ?? "nuevo"}
          id="budget-limit"
          name="limit"
          placeholder="500.000"
          defaultValue={initial?.limitMinor}
          className="input tabular-nums"
          required
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={pending}
        >
          {pending
            ? "Guardando…"
            : initial
              ? "Actualizar límite"
              : "Guardar límite"}
        </button>
        {initial ? (
          <Link
            href={`/presupuestos?mes=${month}`}
            className="btn btn-ghost w-full sm:w-auto"
          >
            Cancelar
          </Link>
        ) : null}
      </div>

      {state ? (
        <p
          role="status"
          className={`text-[11px] font-medium sm:col-span-3 ${
            state.ok ? "text-accent" : "text-danger"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
