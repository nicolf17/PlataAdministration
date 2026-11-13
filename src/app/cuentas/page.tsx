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
  const { cash, accounts, cards, cashMinor, debtMinor, netWorthMinor } =
    await getAccountsPageData();

  return (
    <>
      <PageHeader
        title="Métodos de pago"
        description="Efectivo automático, cuentas de ahorro y tarjetas de crédito. Solo los que usás."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-1">
          <div className="border-b border-line/70 p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Patrimonio neto
            </p>
            <p
              className={`mt-1.5 text-[32px] font-semibold tabular-nums tracking-tight ${
                netWorthMinor < 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {formatMoney(netWorthMinor)}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              Lo que tenés en cuentas y efectivo, menos la deuda de tarjetas.
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line/70">
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                En cuentas
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
                {formatMoney(cashMinor)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Deuda tarjetas
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-danger">
                {formatMoney(debtMinor)}
              </p>
            </div>
          </div>
        </section>

        {/* Efectivo: no se crea, no se edita, no tiene tope. Se calcula solo. */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <IconWallet className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold leading-tight sm:text-lg">
                  Efectivo
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  Método nativo y automático · sin saldo inicial ni tope
                </p>
              </div>
            </div>
            <span className="rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-accent">
              Automático
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line/70 bg-surface-2/50 p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Gastado en efectivo
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-danger">
                {formatMoney(cash.spentMinor)}
              </p>
            </div>
            <div className="rounded-xl border border-line/70 bg-surface-2/50 p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Ingresado en efectivo
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-accent">
                {formatMoney(cash.incomeMinor)}
              </p>
            </div>
            <div className="rounded-xl border border-line/70 bg-surface-2/50 p-3.5">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Balance en efectivo
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  cash.balanceMinor < 0 ? "text-danger" : "text-foreground"
                }`}
              >
                {formatMoney(cash.balanceMinor)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
            Cada movimiento que registrás como «Efectivo» cae acá. No se configura
            y no tiene límite: sirve para ver cuánto y en qué gastás el efectivo.
          </p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <IconWallet className="size-4.5 text-muted" />
              Débito / Ahorros
            </h2>
            <span className="text-[11px] text-muted">
              {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
            </span>
          </div>

          {accounts.length === 0 ? (
            <p className="mt-3 text-[12px] text-muted">
              Todavía no cargaste una cuenta de ahorros. Usá el formulario de abajo.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="rounded-xl border border-line/70 bg-surface-2/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">
                        {account.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        {ACCOUNT_TYPE_LABEL[
                          account.type as keyof typeof ACCOUNT_TYPE_LABEL
                        ] ?? "Cuenta"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-[17px] font-semibold tabular-nums ${
                          account.balanceMinor < 0 ? "text-danger" : "text-foreground"
                        }`}
                      >
                        {formatMoney(account.balanceMinor)}
                      </span>
                      <ConfirmDeleteButton
                        action={deleteAccount}
                        id={account.id}
                        label={account.name}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <IconCreditCard className="size-4.5 text-muted" />
              Crédito
            </h2>
            <span className="text-[11px] text-muted">
              {formatMoney(debtMinor)} de deuda
            </span>
          </div>

          {cards.length === 0 ? (
            <p className="mt-3 text-[12px] text-muted">
              Todavía no cargaste una tarjeta de crédito.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="rounded-xl border border-line/70 bg-surface-2/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{card.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        Corte día {card.closingDay} · pago día {card.dueDay}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-right text-[13px] font-semibold tabular-nums text-danger">
                        {formatMoney(card.debtMinor)}
                      </span>
                      <ConfirmDeleteButton
                        action={deleteCreditCard}
                        id={card.id}
                        label={card.name}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px] text-muted">
                      <span>
                        {formatMoney(card.debtMinor)} de {formatMoney(card.limitMinor)}
                      </span>
                      <span>{formatPercent(card.utilization)} del cupo</span>
                    </div>
                    <ProgressBar
                      ratio={card.utilization}
                      color={card.utilization >= 0.8 ? "#f87171" : "#60a5fa"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Formularios de alta. Cada card es un <details> propio: abrir una no
          toca la otra. `items-start` evita que la cerrada se estire al alto de
          la abierta (eso parecía "la otra también se abrió"). */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <AccountForm />
        <CardForm />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        El efectivo no se agrega como método: se elige directo en Movimientos y su
        panel se actualiza solo.
      </p>
    </>
  );
}
