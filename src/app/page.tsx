import Link from "next/link";
import { connection } from "next/server";

import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTarget,
  IconWallet,
} from "@/components/icons";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { RecommendationsPanel } from "@/components/recommendation-card";
import { StatCard } from "@/components/stat-card";
import { RecentList } from "@/components/transaction-list";
import { currentMonthKey, isValidMonthKey, monthLabel } from "@/lib/dates";
import { ACCOUNT_TYPE_LABEL } from "@/lib/labels";
import { formatMoney, formatPercent } from "@/lib/money";
import { getDashboard } from "@/lib/queries";

export const instant = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  await connection();
  const month = isValidMonthKey(params.mes) ? params.mes : currentMonthKey();
  const data = await getDashboard(month);

  const topCategories = data.categories.slice(0, 8);
  const maxSpend = topCategories[0]?.spentMinor ?? 1;
  const budgets = data.budgets.slice(0, 4);

  return (
    <>
      <PageHeader
        title="Panel"
        description={`Resumen de ${monthLabel(month)}`}
      >
        <MonthPicker month={month} basePath="/" />
        <Link href="/movimientos" className="btn btn-primary">
          <IconPlus className="size-4" />
          Nuevo movimiento
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ingresos"
          value={formatMoney(data.incomeMinor)}
          hint={`${data.txCount} movimientos este mes`}
          tone="positive"
          icon={<IconArrowDown className="size-4" />}
        />
        <StatCard
          label="Gastos"
          value={formatMoney(data.expenseMinor)}
          hint={
            data.incomeMinor > 0
              ? `${formatPercent(data.expenseMinor / data.incomeMinor)} de tus ingresos`
              : "Sin ingresos registrados"
          }
          tone="negative"
          icon={<IconArrowUp className="size-4" />}
        />
        <StatCard
          label="Balance del mes"
          value={formatMoney(data.savedMinor)}
          hint={`Tasa de ahorro ${formatPercent(data.savingsRate)}`}
          tone={data.savedMinor < 0 ? "negative" : "positive"}
        />
        <StatCard
          label="Patrimonio neto"
          value={formatMoney(data.state.netWorthMinor)}
          hint={`${formatMoney(data.state.cashMinor)} en cuentas · ${formatMoney(
            data.state.debtMinor,
          )} en tarjetas`}
          tone={data.state.netWorthMinor < 0 ? "negative" : "accent"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <RecommendationsPanel items={data.recommendations} />

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Últimos movimientos</h2>
              <Link
                href={`/movimientos?mes=${month}`}
                className="text-[11px] font-medium text-muted hover:text-foreground"
              >
                {monthLabel(month)}
              </Link>
            </div>
            <RecentList rows={data.recent} />
          </section>

          <section className="card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Gastos por categoría</h2>
              <Link
                href={`/movimientos?mes=${month}`}
                className="text-[11px] font-medium text-muted hover:text-foreground"
              >
                Ver movimientos
              </Link>
            </div>

            {topCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Todavía no hay gastos este mes.
              </p>
            ) : (
              <ul className="space-y-3">
                {topCategories.map((category) => (
                  <li key={category.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-[12px]">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted">
                        {formatMoney(category.spentMinor)} ·{" "}
                        {formatPercent(category.share)}
                      </span>
                    </div>
                    <ProgressBar
                      ratio={category.spentMinor / maxSpend}
                      color={category.color}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <IconWallet className="size-4 text-muted" />
                Cuentas
              </h2>
              <Link
                href="/cuentas"
                className="text-[11px] font-medium text-muted hover:text-foreground"
              >
                Gestionar
              </Link>
            </div>

            <ul className="space-y-2.5">
              {data.state.accounts
                .filter((account) => !account.archived)
                .map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {account.name}
                      </p>
                      {ACCOUNT_TYPE_LABEL[account.type] !== account.name ? (
                        <p className="text-[11px] text-muted">
                          {ACCOUNT_TYPE_LABEL[account.type]}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                        account.balanceMinor < 0 ? "text-danger" : ""
                      }`}
                    >
                      {formatMoney(account.balanceMinor)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tarjetas</h2>
              <span className="text-[11px] text-muted">
                {formatMoney(data.state.debtMinor)} de deuda
              </span>
            </div>

            {data.state.cards.filter((card) => !card.archived).length === 0 ? (
              <p className="text-[12px] text-muted">No hay tarjetas cargadas.</p>
            ) : (
              <ul className="space-y-3">
                {data.state.cards
                  .filter((card) => !card.archived)
                  .map((card) => (
                    <li key={card.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12px]">{card.name}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted">
                          {formatPercent(card.utilization)} del cupo
                        </span>
                      </div>
                      <ProgressBar
                        ratio={card.utilization}
                        color={card.utilization >= 0.8 ? "#f87171" : "#60a5fa"}
                      />
                      <p className="mt-1 text-[10px] text-muted">
                        {formatMoney(card.debtMinor)} de{" "}
                        {formatMoney(card.limitMinor)}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <IconTarget className="size-4 text-muted" />
                Presupuesto
              </h2>
              <Link
                href={`/presupuestos?mes=${month}`}
                className="text-[11px] font-medium text-muted hover:text-foreground"
              >
                Editar
              </Link>
            </div>

            {budgets.length === 0 ? (
              <p className="text-[12px] text-muted">
                Todavía no definiste presupuestos.
              </p>
            ) : (
              <ul className="space-y-3">
                {budgets.map((budget) => (
                  <li key={budget.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px]">
                        {budget.categoryName}
                      </span>
                      <span
                        className={`shrink-0 text-[11px] tabular-nums ${
                          budget.ratio > 1 ? "text-danger" : "text-muted"
                        }`}
                      >
                        {formatPercent(budget.ratio)}
                      </span>
                    </div>
                    <ProgressBar ratio={budget.ratio} color={budget.color} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
