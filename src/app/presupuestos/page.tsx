import Link from "next/link";
import { connection } from "next/server";

import { BudgetForm } from "@/components/budget-form";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { StatCard } from "@/components/stat-card";
import { currentMonthKey, isValidMonthKey, monthLabel } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import { getBudgetPageData } from "@/lib/queries";

export const instant = false;

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; editar?: string }>;
}) {
  const params = await searchParams;
  await connection();
  const month = isValidMonthKey(params.mes) ? params.mes : currentMonthKey();
  const data = await getBudgetPageData(month);
  const editing = params.editar
    ? data.budgets.find((budget) => budget.id === params.editar)
    : undefined;

  const totalLimit = data.budgets.reduce((sum, b) => sum + b.limitMinor, 0);
  const totalSpent = data.budgets.reduce((sum, b) => sum + b.spentMinor, 0);
  const budgeted = new Set(data.budgets.map((b) => b.categoryId));

  const unbudgeted = data.slices.filter(
    (slice) => !budgeted.has(slice.id) && !budgeted.has(slice.parentId ?? ""),
  );

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Un límite por categoría. Si lo pasás, la recomendación te lo va a decir."
      >
        <MonthPicker month={month} basePath="/presupuestos" />
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Presupuestado"
          value={formatMoney(totalLimit)}
          hint={`${data.budgets.length} categorías`}
        />
        <StatCard
          label="Gastado"
          value={formatMoney(totalSpent)}
          hint={
            totalLimit > 0
              ? `${formatPercent(totalSpent / totalLimit)} del total`
              : "Sin presupuesto definido"
          }
          tone={totalSpent > totalLimit ? "negative" : "neutral"}
        />
        <StatCard
          label="Disponible"
          value={formatMoney(Math.max(0, totalLimit - totalSpent))}
          hint={
            totalSpent > totalLimit
              ? `Te pasaste ${formatMoney(totalSpent - totalLimit)}`
              : "Margen restante"
          }
          tone={totalSpent > totalLimit ? "negative" : "positive"}
        />
      </div>

      <div className="mt-4">
        {editing ? (
          <h2 className="mb-2 text-sm font-semibold">
            Editar límite de {editing.categoryName}
          </h2>
        ) : null}
        <BudgetForm
          month={month}
          categories={data.categories}
          initial={
            editing
              ? {
                  id: editing.id,
                  categoryId: editing.categoryId,
                  categoryName: editing.categoryName,
                  limitMinor: editing.limitMinor,
                }
              : undefined
          }
        />
      </div>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold capitalize">
          Límites de {monthLabel(month)}
        </h2>

        {data.budgets.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">
              Todavía no hay presupuestos para este mes. Creá el primero arriba.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.budgets.map((budget) => {
              const over = budget.ratio > 1;
              const remaining = budget.limitMinor - budget.spentMinor;

              return (
                <article key={budget.id} className="card p-4">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 text-[13px] font-medium">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: budget.color }}
                      />
                      {budget.categoryName}
                    </span>
                    <span
                      className={`text-[12px] font-semibold tabular-nums ${
                        over ? "text-danger" : "text-muted"
                      }`}
                    >
                      {formatPercent(budget.ratio)}
                    </span>
                  </div>

                  <ProgressBar ratio={budget.ratio} color={budget.color} />

                  <div className="mt-2 flex items-baseline justify-between text-[11px] text-muted">
                    <span className="tabular-nums">
                      {formatMoney(budget.spentMinor)} de{" "}
                      {formatMoney(budget.limitMinor)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span
                        className={`tabular-nums ${over ? "text-danger" : "text-accent"}`}
                      >
                        {over
                          ? `${formatMoney(Math.abs(remaining))} de más`
                          : `${formatMoney(remaining)} libres`}
                      </span>
                      <Link
                        href={`/presupuestos?mes=${month}&editar=${budget.id}#presupuesto-form`}
                        className="font-semibold text-info underline-offset-2 hover:text-info/80 hover:underline"
                      >
                        Editar
                      </Link>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {unbudgeted.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Gastos sin presupuesto</h2>
          <div className="card flex flex-wrap gap-2 p-4">
            {unbudgeted.map((slice) => (
              <span
                key={slice.id}
                className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[11px]"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.name}
                <span className="tabular-nums text-muted">
                  {formatMoney(slice.spentMinor)}
                </span>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
