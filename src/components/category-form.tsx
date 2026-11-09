"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createCategory, type ActionState } from "@/app/actions";

type CategoryType = "EXPENSE" | "INCOME";

const TYPES: Array<{ value: CategoryType; label: string }> = [
  { value: "EXPENSE", label: "Gasto" },
  { value: "INCOME", label: "Ingreso" },
];

export function CategoryForm() {
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCategory,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="card p-4"
    >
      <input type="hidden" name="type" value={type} />

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Nueva categoría</h2>
        <div className="flex rounded-lg border border-line bg-[#0a1119] p-0.5">
          {TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                type === option.value
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          placeholder="Ej: Mascotas, Salud, Café…"
          maxLength={30}
          className="input flex-1"
          required
        />
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={pending}
        >
          {pending ? "Creando…" : "Agregar"}
        </button>
      </div>

      {state ? (
        <p
          className={`mt-2 text-[11px] font-medium ${
            state.ok ? "text-accent" : "text-danger"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
