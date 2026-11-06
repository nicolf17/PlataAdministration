"use client";

import { useActionState } from "react";

import { upsertBudget, type ActionState } from "@/app/actions";

export function BudgetForm({
  month,
  categories,
}: {
  month: string;
  categories: Array<{ id: string; name: string; parentId: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    upsertBudget,
    null,
  );

  return (
    <form action={formAction} className="card grid gap-3 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
      <input type="hidden" name="month" value={month} />

      <div>
        <label className="label" htmlFor="budget-category">
          Categoría
        </label>
        <select id="budget-category" name="categoryId" className="input" required defaultValue="">
          <option value="">Elegir…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="budget-limit">
          Límite del mes
        </label>
        <input
          id="budget-limit"
          name="limit"
          inputMode="decimal"
          placeholder="500000"
          className="input tabular-nums"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>

      {state ? (
        <p
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
