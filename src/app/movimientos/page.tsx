import { connection } from "next/server";

import { MovimientosView } from "@/components/movimientos-view";
import { currentMonthKey, isValidMonthKey, toInputDate } from "@/lib/dates";
import { getTransactionById, getTransactionFormData, getTransactions } from "@/lib/queries";
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
  searchParams: Promise<{ mes?: string; tipo?: string; categoria?: string; editar?: string }>;
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
  const editing = params.editar
    ? await getTransactionById(params.editar)
    : null;

  const activeCategory = formData.categories.find((c) => c.id === categoryId);
  const income = rows
    .filter((row) => row.type === "INCOME")
    .reduce((sum, row) => sum + row.amountMinor, 0);
  const expense = rows
    .filter((row) => row.type === "EXPENSE")
    .reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <MovimientosView
      month={month}
      filterValue={params.tipo ?? ""}
      filterLabel={activeFilter?.label ?? "Todos"}
      category={activeCategory ? { id: activeCategory.id, name: activeCategory.name } : null}
      income={income}
      expense={expense}
      rows={rows}
      accounts={formData.accounts}
      cards={formData.cards}
      categories={formData.categories}
      today={toInputDate(new Date())}
      initialType={activeFilter?.type ?? "EXPENSE"}
      editing={editing}
    />
  );
}
