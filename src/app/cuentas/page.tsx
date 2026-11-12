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
  const { cashMinor, debtMinor, state } = await getAccountsPageData();

  const activeCash = state.cash.filter((c) => true); // All cash is active since we don't archive accounts in this simplified version
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
              debtMinor < 0 ? "text-danger" : "text-foreground"}
            }`}
          >
            {formatMoney(cashMinor - debtMinor)}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line/70">
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">
              En cuentas
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-accent">
              {formatMoney(cashMinor)}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted">
              Deuda tarjetas
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-danger">
              {formatMoney(debtMinor)}
            </p>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-[10px] uppercase tracking-wider text-muted mb-2">Efectivo</h3>
          <div className="grid grid-cols-2 divide-y divide-line/70">
            {activeCash.map((account) => (
              <div key={account.id} className="p-2 border-b border-line/70">
                <p className="text-[11px] font-medium">{account.name}</p>
                <p className="text-[12px] text-muted">{formatMoney(account.balanceMinor)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-[10px] uppercase tracking-wider text-muted mb-2">Tarjetas</h3>
          <div className="grid grid-cols-2 divide-y divide-line/70">
            {activeCards.map((card) => (
              <div key={card.id} className="p-2 border-b border-line/70">
                <p className="text-[11px] font-medium">{card.name}</p>
                <p className="text-[12px] text-danger">
                  Deuda: {formatMoney(card.debtMinor)} / {formatMoney(card.limitMinor)}
                </p>
                <ProgressBar
                  ratio={card.limitMinor > 0 ? card.debtMinor / card.limitMinor : 0}
                  color={card.debtMinor > card.limitMinor ? "danger" : "accent"}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}