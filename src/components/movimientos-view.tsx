"use client";

import Link from "next/link";
import { useState } from "react";

import { deleteTransaction } from "@/app/actions";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";
import type { TransactionRow } from "@/lib/queries";
import type { TransactionType } from "@/generated/prisma/client";

type AccountOption = { id: string; name: string };
type CardOption = { id: string; name: string };
type CategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  parentId: string | null;
};
type TxType = "EXPENSE" | "INCOME" | "TRANSFER";
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

type MovimientosViewProps = {
  month: string;
  filterValue: string;
  filterLabel?: string;
  filterType?: TransactionType;
  category?: { id: string; name: string } | null;
  income: number;
  expense: number;
  rows: TransactionRow[];
  accounts: AccountOption[];
  cards: CardOption[];
  categories: CategoryOption[];
  today: string;
  initialType?: TxType;
  editing?: MovementEdit | null;
};

export function MovimientosView({
  month,
  filterValue,
  filterLabel,
  category,
  rows,
  accounts,
  cards,
  categories,
  today,
  initialType,
  editing,
}: MovimientosViewProps) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(rows);

  // Cuando el server manda filas nuevas (refresh o cambio de mes), resincronizamos.
  const [serverRows, setServerRows] = useState(rows);
  if (serverRows !== rows) {
    setServerRows(rows);
    setTransactions(rows);
  }

  const FILTERS: Array<{ value: string; label: string; type?: TransactionType }> = [
    { value: "", label: "Todos" },
    { value: "EXPENSE", label: "Gastos", type: "EXPENSE" },
    { value: "INCOME", label: "Ingresos", type: "INCOME" },
    { value: "TRANSFER", label: "Transferencias", type: "TRANSFER" },
  ];

  const handleDelete = async (id: string) => {
    const removed = transactions.find((row) => row.id === id) ?? null;
    // Optimista: quito la fila antes de confirmar con el server.
    setTransactions((prev) => prev.filter((row) => row.id !== id));
    try {
      const fd = new FormData();
      fd.append("id", id);
      await deleteTransaction(fd);
    } catch {
      // Si el server falla, restauramos la fila.
      if (removed) {
        setTransactions((prev) =>
          prev.some((row) => row.id === removed.id) ? prev : [...prev, removed],
        );
      }
    }
  };

  const handleSaved = (row: TransactionRow, mode: "create" | "update") => {
    setTransactions((prev) => {
      if (mode === "create") {
        return [row, ...prev];
      }
      return prev.map((r) => (r.id === row.id ? row : r));
    });
  };

  const incomeSum = transactions
    .filter((row) => row.type === "INCOME")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const expenseSum = transactions
    .filter((row) => row.type === "EXPENSE")
    .reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Registrá lo que entra y lo que sale. Con o sin tarjeta."
      >
        <MonthPicker month={month} basePath="/movimientos" />
      </PageHeader>

      <TransactionForm
        key={editing?.id ?? "nuevo"}
        accounts={accounts}
        cards={cards}
        categories={categories}
        today={today}
        initialType={initialType}
        editing={editing}
        onSaved={handleSaved}
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Movimientos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{transactions.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Ingresos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
            {formatMoney(incomeSum)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Gastos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-danger">
            {formatMoney(expenseSum)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => {
          const active = filterValue === filter.value;
          return (
            <Link
              key={filter.value}
              href={`/movimientos?mes=${month}${filter.value ? `&tipo=${filter.value}` : ""}`}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line text-muted hover:border-line hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}

        {category ? (
          <Link
            href={`/movimientos?mes=${month}`}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] font-medium text-warning"
          >
            Categoría: {category.name}
            <span aria-hidden>×</span>
          </Link>
        ) : null}
      </div>

      <section className="card mt-3 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold capitalize">{monthLabel(month)}</h2>
          <span className="text-[11px] text-muted">{filterLabel ?? "Todos"}</span>
        </div>
        <TransactionList rows={transactions} onDelete={handleDelete} />
      </section>
    </>
  );
}
