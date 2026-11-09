"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { createTransaction, type ActionState } from "@/app/actions";
import { AmountInput } from "@/components/amount-input";
import { IconPlus } from "@/components/icons";

type AccountOption = { id: string; name: string };
type CardOption = { id: string; name: string };
type CategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  parentId: string | null;
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
}: {
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createTransaction,
    null,
  );
  const [type, setType] = useState<TxType>("EXPENSE");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      // Refresca la lista de movimientos de esta pantalla y el dashboard.
      router.refresh();
    }
  }, [state, router]);

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
      <input type="hidden" name="type" value={type} />

      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Nuevo movimiento</h2>
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
            placeholder="0"
            enterKeyHint="next"
            className="input pl-8 text-2xl font-semibold tabular-nums"
            required
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date">
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={today}
            className="input"
            required
          />
        </div>

        {type !== "TRANSFER" ? (
          <div>
            <label className="label" htmlFor="categoryId">
              Categoría
            </label>
            <select
              id="categoryId"
              name="categoryId"
              className="input"
              defaultValue=""
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
          defaultValue=""
          required
        >
          <option value="">Elegir…</option>
          <optgroup label="Efectivo / cuentas">
            {accounts.map((account) => (
              <option key={account.id} value={`account:${account.id}`}>
                {account.name}
              </option>
            ))}
          </optgroup>
          {type !== "INCOME" && cards.length > 0 ? (
            <optgroup label="Tarjetas de crédito">
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
            defaultValue=""
            required
          >
            <option value="">Elegir…</option>
            <optgroup label="Efectivo / cuentas">
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
          {pending ? "Guardando…" : "Agregar movimiento"}
        </button>

        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {type === "EXPENSE"
            ? "Con tarjeta queda como deuda; con efectivo o cuenta sale del saldo."
            : type === "TRANSFER"
              ? "Entre tus cuentas no es gasto. Hacia una tarjeta, es pago de deuda."
              : "Suma al saldo de la cuenta elegida."}
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
