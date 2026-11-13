"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { createTransaction, updateTransaction, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { IconPlus } from "@/components/icons";
import { formatAmountInput, parseAmountToMinor } from "@/lib/money";
import type { TransactionRow } from "@/lib/queries";

type AccountOption = { id: string; name: string };
type CardOption = { id: string; name: string };
type CategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  parentId: string | null;
  color?: string | null;
};

type MovementEdit = {
  id: string;
  type: TxType;
  amountMinor: number;
  description: string;
  date: string;
  notes: string | null;
  categoryId: string | null;
  payer: string;
  destination: string;
};

type TxType = "EXPENSE" | "INCOME" | "TRANSFER";

const TYPES: Array<{ value: TxType; label: string }> = [
  { value: "EXPENSE", label: "Gasto" },
  { value: "INCOME", label: "Ingreso" },
  { value: "TRANSFER", label: "Transferir" },
];

export function TransactionForm({
  accounts,
  cards,
  categories,
  today,
  initialType = "EXPENSE",
  editing = null,
  onSaved,
}: {
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  today: string;
  initialType?: TxType;
  editing?: MovementEdit | null;
  onSaved?: (row: TransactionRow, mode: "create" | "update") => void;
}) {
  const action = editing ? updateTransaction : createTransaction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const initialTypeResolved: TxType =
    initialType === "INCOME" || initialType === "EXPENSE" || initialType === "TRANSFER"
      ? initialType
      : "EXPENSE";
  const initialTypeValue: TxType = editing ? editing.type : initialTypeResolved;
  const [type, setType] = useState<TxType>(initialTypeValue);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // Evita reprocesar el mismo resultado del server action en cada re-render.
  const handledState = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state?.ok) return;
    if (handledState.current === state) return;
    handledState.current = state;

    // Leemos el formulario ANTES de resetearlo: si no, perdemos los valores.
    const fd = formRef.current ? new FormData(formRef.current) : null;
    formRef.current?.reset();
    // Refresca la lista de movimientos de esta pantalla y el dashboard.
    router.refresh();

    // Al editar, el formulario se re-renderiza como lista limpia.
    if (editing) {
      router.replace("/movimientos");
      onSaved?.(
        {
          id: editing.id,
          date: new Date(editing.date),
          type: editing.type,
          amountMinor: editing.amountMinor,
          description: editing.description,
          notes: editing.notes,
          accountName: null,
          transferAccountName: null,
          cardName: null,
          categoryName: null,
          categoryColor: null,
        },
        "update",
      );
      return;
    }

    if (!fd) return;
    const nextType = String(fd.get("type") ?? "EXPENSE") as TxType;
    const amountMinor = parseAmountToMinor(String(fd.get("amount") ?? ""));
    const description = String(fd.get("description") ?? "");
    const dateStr = String(fd.get("date") ?? today);
    const categoryId = (String(fd.get("categoryId") ?? "") || null) as string | null;
    const payer = String(fd.get("payer") ?? "");
    const notes = (String(fd.get("notes") ?? "") || null) as string | null;
    const category = categories.find((c) => c.id === categoryId) ?? null;
    const row: TransactionRow = {
      id: `optimistic-${Date.now()}`,
      date: new Date(`${dateStr}T00:00:00Z`),
      type: nextType,
      amountMinor: amountMinor ?? 0,
      description,
      notes,
      accountName:
        payer === "cash"
          ? "Efectivo"
          : (accounts.find((account) => `account:${account.id}` === payer)?.name ??
            null),
      transferAccountName: null,
      cardName: payer.startsWith("card:") ? payer.slice(5) : null,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
    };
    onSaved?.(row, "create");
  }, [state, router, editing, categories, today, onSaved]);

  function changeType(next: TxType) {
    setType(next);
  }

  const visibleCategories = categories.filter(
    (category) => category.type === type,
  );

  return (
    <form
      id="nuevo"
      ref={formRef}
      action={formAction}
      className="card scroll-mt-20 p-4 sm:p-5"
    >
      <input type="hidden" name="id" value={editing?.id ?? ""} />
      <input type="hidden" name="type" value={type} />

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {editing ? "Editar movimiento" : "Nuevo movimiento"}
        </h2>
        <span className="text-[10px] text-muted">Se guarda al instante</span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-[#0a1119] p-1">
        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => changeType(option.value)}
            className={`rounded-lg py-2 text-[12px] font-medium transition-colors ${
              type === option.value
                ? "bg-surface-2 text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="amount">
          Monto
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted">
            $
          </span>
          <AmountInput
            id="amount"
            name="amount"
            defaultValue={editing ? formatAmountInput(String(editing.amountMinor)) : undefined}
            placeholder="0"
            enterKeyHint="next"
            className="input pl-8 text-2xl font-semibold tabular-nums"
            required
          />
        </div>
      </div>

      {/* En el celular van uno debajo del otro: el input de fecha nativo de
          iOS no baja de su ancho intrínseco y en dos columnas se desbordaba. */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="label" htmlFor="date">
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={editing?.date ?? today}
            className="input w-full min-w-0"
            required
          />
        </div>

        {type !== "TRANSFER" ? (
          <div className="min-w-0">
            <label className="label" htmlFor="categoryId">
              Categoría
            </label>
            <select
              id="categoryId"
              name="categoryId"
              className="input w-full min-w-0 truncate"
              defaultValue={editing?.categoryId ?? ""}
            >
              <option value="">Sin categoría</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="description">
          Descripción
        </label>
        <input
          id="description"
          name="description"
          defaultValue={editing?.description ?? ""}
          placeholder="Ej: mercado del sábado"
          maxLength={80}
          enterKeyHint="done"
          className="input"
          required
        />
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="payer">
          {type === "TRANSFER"
            ? "Desde"
            : type === "INCOME"
              ? "¿Dónde entró?"
              : "¿Con qué pagaste?"}
        </label>
        <select
          id="payer"
          name="payer"
          className="input"
          key={type}
          defaultValue={editing?.payer ?? ""}
          required
        >
          <option value="">Elegir…</option>
          {/* El efectivo es nativo: siempre está disponible y no se configura. */}
          {type !== "TRANSFER" ? <option value="cash">Efectivo</option> : null}
          {accounts.length > 0 ? (
            <optgroup label="Débito / Ahorros">
              {accounts.map((account) => (
                <option key={account.id} value={`account:${account.id}`}>
                  {account.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {type !== "INCOME" && cards.length > 0 ? (
            <optgroup label="Crédito">
              {cards.map((card) => (
                <option key={card.id} value={`card:${card.id}`}>
                  {card.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      {type === "TRANSFER" ? (
        <div className="mt-3">
          <label className="label" htmlFor="destination">
            Hacia
          </label>
          <select
            id="destination"
            name="destination"
            className="input"
            key={type}
            defaultValue={editing?.destination ?? ""}
            required
          >
            <option value="">Elegir…</option>
            <optgroup label="Débito / Ahorros">
              {accounts.map((account) => (
                <option key={account.id} value={`account:${account.id}`}>
                  {account.name}
                </option>
              ))}
            </optgroup>
            {cards.length > 0 ? (
              <optgroup label="Pago de tarjeta">
                {cards.map((card) => (
                  <option key={card.id} value={`card:${card.id}`}>
                    {card.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
      ) : null}

      <div className="mt-4">
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={pending}
        >
          <IconPlus className="size-4" />
          {pending
            ? "Guardando…"
            : editing
              ? "Guardar cambios"
              : "Agregar movimiento"}
        </button>

        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {editing
            ? "Guardá los cambios. El saldo se recalcula solo."
            : type === "EXPENSE"
              ? "Efectivo se acumula aparte (sin tope). Con tarjeta queda como deuda."
              : type === "TRANSFER"
                ? "Entre tus cuentas no es gasto. Hacia una tarjeta, es pago de deuda."
                : "Suma al saldo de la cuenta o del efectivo."}
        </p>

        {visibleCategories.length === 0 && type !== "TRANSFER" ? (
          <p className="mt-1 text-[11px] text-warning">
            No tenés categorías de{" "}
            {type === "EXPENSE" ? "gasto" : "ingreso"}.{" "}
            <Link href="/categorias" className="underline">
              Crear una
            </Link>
          </p>
        ) : null}

        {editing ? (
          <Link href="/movimientos" className="btn mt-2 w-full sm:w-auto">
            Cancelar
          </Link>
        ) : null}

        {state ? (
          <p
            role="status"
            className={`mt-2 text-[12px] font-medium ${
              state.ok ? "text-accent" : "text-danger"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
