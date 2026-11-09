import { connection } from "next/server";

import { deleteAccount, deleteCreditCard } from "@/app/actions";
import { AccountForm } from "@/components/account-form";
import { CardForm } from "@/components/card-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
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
        title="Métodos de pago"
        description="Efectivo, cuenta de ahorros y tarjeta. Solo los que usás."
      />

      <section className="card overflow-hidden">
        <div className="border-b border-line/70 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Patrimonio neto
          </p>
          <p
            className={`mt-1 text-[26px] font-semibold tabular-nums tracking-tight ${
              state.netWorthMinor < 0 ? "text-danger" : "text-foreground"
            }`}
          >
            {formatMoney(state.netWorthMinor)}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line/70">
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">
              En cuentas
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-accent">
              {formatMoney(state.cashMinor)}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">
              Deuda tarjetas
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-danger">
              {formatMoney(state.debtMinor)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <IconWallet className="size-4 text-muted" />
          Efectivo y cuentas
        </h2>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {activeAccounts.map((account) => (
            <article key={account.id} className="card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {account.name}
                  </p>
                  {ACCOUNT_TYPE_LABEL[account.type] !== account.name ? (
                    <p className="text-[11px] text-muted">
                      {ACCOUNT_TYPE_LABEL[account.type]}
                    </p>
                  ) : null}
                </div>
                <ConfirmDeleteButton
                  action={deleteAccount}
                  id={account.id}
                  label={account.name}
                />
              </div>
              <p
                className={`mt-2 text-lg font-semibold tabular-nums ${
                  account.balanceMinor < 0 ? "text-danger" : ""
                }`}
              >
                {formatMoney(account.balanceMinor)}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-2.5">
          <AccountForm />
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <IconCreditCard className="size-4 text-muted" />
          Tarjetas de crédito
        </h2>

        {activeCards.length === 0 ? (
          <div className="card p-6 text-center text-[12px] text-muted">
            No hay tarjetas cargadas.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {activeCards.map((card) => (
              <article
                key={card.id}
                id={`tarjeta-${card.id}`}
                className="card scroll-mt-24 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {card.name}
                    </p>
                    <p className="text-[11px] text-muted">
                      Corte día {card.closingDay} · Pago día {card.dueDay}
                    </p>
                  </div>
                  <ConfirmDeleteButton
                    action={deleteCreditCard}
                    id={card.id}
                    label={card.name}
                  />
                </div>

                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {formatMoney(card.debtMinor)}
                  <span className="ml-1 text-[11px] font-normal text-muted">
                    de {formatMoney(card.limitMinor)}
                  </span>
                </p>

                <div className="mt-1.5">
                  <ProgressBar
                    ratio={card.utilization}
                    color={card.utilization >= 0.8 ? "#f87171" : "#60a5fa"}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
                  <span>{formatPercent(card.utilization)} usado</span>
                  <span className="tabular-nums">
                    Libre {formatMoney(Math.max(0, card.limitMinor - card.debtMinor))}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-2.5">
          <CardForm />
        </div>
      </section>

      <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted">
        Un método con movimientos no se puede eliminar para no romper el
        historial. Podés dejarlo sin saldo o archivarlo más adelante.
      </p>
    </>
  );
}
