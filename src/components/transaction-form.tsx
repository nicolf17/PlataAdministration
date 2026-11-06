"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createTransaction, type ActionState } from "@/app/actions";
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
  { value: "TRANSFER", label: "Transferencia" },
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
  const [payer, setPayer] = useState("");
  const [destination, setDestination] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPayer("");
      setDestination("");
    }
  }, [state]);

  function changeType(next: TxType) {
    setType(next);
    setPayer("");
    setDestination("");
  }

  const byParent = new Map<string, CategoryOption>();
  for (const category of categories) {
    byParent.set(category.id, category);
  }

  const visibleCategories = categories
    .filter((category) => category.type === type)
    .map((category) => ({
      ...category,
      label: category.parentId
        ? `${byParent.get(category.parentId)?.name ?? "Otra"} · ${category.name}`
        : category.name,
    }));

  return (
    <form ref={formRef} action={formAction} className="card p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold">Nuevo movimiento</h2>
        <input type="hidden" name="type" value={type} />
        <div className="flex rounded-xl border border-line bg-[#0a1119] p-1">
          {TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeType(option.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                type === option.value
                  ? "bg-surface-2 text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="amount">
            Monto
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="45000"
            autoComplete="off"
            className="input tabular-nums"
            required
          />
        </div>

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

        <div className="lg:col-span-2">
          <label className="label" htmlFor="description">
            Descripción
          </label>
          <input
            id="description"
            name="description"
            placeholder="Ej: mercado del sábado"
            maxLength={80}
            className="input"
            required
          />
        </div>

        {type !== "TRANSFER" ? (
          <div>
            <label className="label" htmlFor="categoryId">
              Categoría
            </label>
            <select id="categoryId" name="categoryId" className="input" defaultValue="">
              <option value="">Sin categoría</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={type === "TRANSFER" ? "sm:col-span-1" : "sm:col-span-1 lg:col-span-2"}>
          <label className="label" htmlFor="payer">
            {type === "TRANSFER" ? "Desde" : "Cuenta o tarjeta"}
          </label>
          <select
            id="payer"
            name="payer"
            className="input"
            value={payer}
            onChange={(event) => setPayer(event.target.value)}
            required
          >
            <option value="">Elegir…</option>
            <optgroup label="Cuentas">
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
          <div className="sm:col-span-1">
            <label className="label" htmlFor="destination">
              Hacia
            </label>
            <select
              id="destination"
              name="destination"
              className="input"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              required
            >
              <option value="">Elegir…</option>
              <optgroup label="Cuentas">
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
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <IconPlus className="size-4" />
          {pending ? "Guardando…" : "Agregar"}
        </button>

        <p className="text-[11px] leading-relaxed text-muted">
          {type === "EXPENSE"
            ? "Con tarjeta queda como deuda; con cuenta sale del saldo."
            : type === "TRANSFER"
              ? "Entre cuentas propias no es gasto. Hacia una tarjeta, es pago de deuda."
              : "Suma al saldo de la cuenta elegida."}
        </p>

        {state ? (
          <p
            role="status"
            className={`ml-auto text-[11px] font-medium ${
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
