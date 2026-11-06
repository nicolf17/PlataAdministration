import { connection } from "next/server";

import { AccountForm } from "@/components/account-form";
import { CardForm } from "@/components/card-form";
import { IconCreditCard, IconWallet } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { ACCOUNT_TYPE_LABEL } from "@/lib/labels";
import { formatMoney, formatPercent } from "@/lib/money";
import { getAccountsPageData } from "@/lib/queries";

export const instant = false;

export default async function AccountsPage() {
  await connection();
  const { state } = await getAccountsPageData();

  const activeAccounts = state.accounts.filter((a) => !a.archived);
  const activeCards = state.cards.filter((c) => !c.archived);

  return (
    <>
      <PageHeader
        title="Cuentas y tarjetas"
        description="La foto real de tu plata: lo que tenés menos lo que debés."
      />

      <section className="card overflow-hidden">
        <div className="border-b border-line/70 p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Patrimonio neto
          </p>
          <p
            className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${
              state.netWorthMinor < 0 ? "text-danger" : "text-foreground"
            }`}
          >
            {formatMoney(state.netWorthMinor)}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line/70">
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Disponible en cuentas
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
              {formatMoney(state.cashMinor)}
            </p>
          </div>
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Deuda en tarjetas
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-danger">
              {formatMoney(state.debtMinor)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <IconWallet className="size-4 text-muted" />
          Cuentas
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeAccounts.map((account) => (
            <article key={account.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold">{account.name}</p>
                  <p className="text-[11px] text-muted">
                    {ACCOUNT_TYPE_LABEL[account.type]}
                  </p>
                </div>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                  {account.type}
                </span>
              </div>
              <p
                className={`mt-3 text-xl font-semibold tabular-nums ${
                  account.balanceMinor < 0 ? "text-danger" : ""
                }`}
              >
                {formatMoney(account.balanceMinor)}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-3">
          <AccountForm />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <IconCreditCard className="size-4 text-muted" />
          Tarjetas de crédito
        </h2>

        {activeCards.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            No hay tarjetas cargadas todavía.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeCards.map((card) => (
              <article
                key={card.id}
                id={`tarjeta-${card.id}`}
                className="card scroll-mt-24 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold">{card.name}</p>
                    <p className="text-[11px] text-muted">
                      Corte día {card.closingDay} · Pago día {card.dueDay}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      card.utilization >= 0.8
                        ? "bg-danger/10 text-danger"
                        : card.utilization >= 0.5
                          ? "bg-warning/10 text-warning"
                          : "bg-accent/10 text-accent"
                    }`}
                  >
                    {formatPercent(card.utilization)} usado
                  </span>
                </div>

                <p className="mt-3 text-xl font-semibold tabular-nums">
                  {formatMoney(card.debtMinor)}
                  <span className="ml-1 text-[11px] font-normal text-muted">
                    de {formatMoney(card.limitMinor)}
                  </span>
                </p>

                <div className="mt-2">
                  <ProgressBar
                    ratio={card.utilization}
                    color={card.utilization >= 0.8 ? "#f87171" : "#60a5fa"}
                  />
                </div>

                <p className="mt-2 text-[11px] text-muted">
                  Disponible:{" "}
                  <span className="tabular-nums text-foreground">
                    {formatMoney(Math.max(0, card.limitMinor - card.debtMinor))}
                  </span>
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-3">
          <CardForm />
        </div>
      </section>
    </>
  );
}
