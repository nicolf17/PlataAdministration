import Link from "next/link";
import { connection } from "next/server";

import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import {
  currentMonthKey,
  isValidMonthKey,
  monthLabel,
  toInputDate,
} from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getTransactionFormData, getTransactions } from "@/lib/queries";
import type { TransactionType } from "@/generated/prisma/client";

export const instant = false;

const FILTERS: Array<{ value: string; label: string; type?: TransactionType }> = [
  { value: "", label: "Todos" },
  { value: "EXPENSE", label: "Gastos", type: "EXPENSE" },
  { value: "INCOME", label: "Ingresos", type: "INCOME" },
  { value: "TRANSFER", label: "Transferencias", type: "TRANSFER" },
];

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; tipo?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  await connection();
  const month = isValidMonthKey(params.mes) ? params.mes : currentMonthKey();
  const activeFilter = FILTERS.find((f) => f.value === (params.tipo ?? ""));
  const categoryId = params.categoria;

  const [formData, rows] = await Promise.all([
    getTransactionFormData(),
    getTransactions({ month, type: activeFilter?.type, categoryId }),
  ]);

  const activeCategory = formData.categories.find((c) => c.id === categoryId);
  const income = rows
    .filter((row) => row.type === "INCOME")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const expense = rows
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
        accounts={formData.accounts}
        cards={formData.cards}
        categories={formData.categories}
        today={toInputDate(new Date())}
        initialType={activeFilter?.type ?? "EXPENSE"}
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Movimientos
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{rows.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Ingresos
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
            {formatMoney(income)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Gastos
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-danger">
            {formatMoney(expense)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => {
          const active = (params.tipo ?? "") === filter.value;
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

        {activeCategory ? (
          <Link
            href={`/movimientos?mes=${month}`}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] font-medium text-warning"
          >
            Categoría: {activeCategory.name}
            <span aria-hidden>×</span>
          </Link>
        ) : null}
      </div>

      <section className="card mt-3 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold capitalize">
            {monthLabel(month)}
          </h2>
          <span className="text-[11px] text-muted">
            {activeFilter?.label ?? "Todos"}
          </span>
        </div>
        <TransactionList rows={rows} />
      </section>
    </>
  );
}
