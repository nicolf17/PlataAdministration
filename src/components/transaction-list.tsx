"use client";

import Link from "next/link";

import { IconArrowDown, IconArrowUp, IconPencil, IconTrash } from "@/components/icons";
import { formatDayMonth, weekdayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { TransactionRow } from "@/lib/queries";

function meta(row: TransactionRow): string {
  if (row.type === "TRANSFER") {
    const to = row.transferAccountName ?? row.cardName ?? "—";
    return `${row.accountName ?? "—"} → ${to}`;
  }
  const place = row.cardName ?? row.accountName;
  return [row.categoryName, place].filter(Boolean).join(" · ");
}

type TransactionListProps = {
  rows: TransactionRow[];
  showDelete?: boolean;
  grouped?: boolean;
  onDelete?: (id: string) => Promise<void>;
};

export function TransactionList({
  rows,
  showDelete = true,
  grouped = true,
  onDelete,
}: TransactionListProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No hay movimientos para este período.
      </p>
    );
  }

  const groups = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const deleteAction = async (formData: FormData) => {
    const id = String(formData.get("id") ?? "");
    if (onDelete) {
      await onDelete(id);
    }
  };

  return (
    <div className="divide-y divide-line/70">
      {[...groups.entries()].map(([key, list]) => {
        return (
          <div key={key} className="py-3 first:pt-0 last:pb-0">
            {grouped ? (
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-xs font-semibold capitalize text-foreground">
                  {weekdayLabel(new Date(`${key}T12:00:00.000Z`))}
                </span>
                <span className="text-[11px] text-muted">
                  {formatDayMonth(new Date(`${key}T12:00:00.000Z`))}
                </span>
              </div>
            ) : null}

            <ul className="space-y-1">
              {list.map((row) => {
                const isIncome = row.type === "INCOME";
                const isExpense = row.type === "EXPENSE";
                const color = row.categoryColor ?? "#64748b";

                return (
                  <li
                    key={row.id}
                    className="group flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2/60"
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full border"
                      style={{
                        borderColor: `${color}44`,
                        backgroundColor: `${color}14`,
                        color,
                      }}
                    >
                      {isIncome ? (
                        <IconArrowDown className="size-3.5" />
                      ) : (
                        <IconArrowUp className="size-3.5" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{row.description}</p>
                      <p className="truncate text-[11px] text-muted">{meta(row)}</p>
                    </div>

                    <span
                      className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                        isIncome
                          ? "text-accent"
                          : isExpense
                            ? "text-foreground"
                            : "text-muted"
                      }`}
                    >
                      {isIncome ? "+" : isExpense ? "−" : ""}
                      {formatMoney(row.amountMinor)}
                    </span>

                    {showDelete ? (
                      <form action={deleteAction} className="shrink-0">
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          aria-label={`Eliminar ${row.description}`}
                          className="grid size-9 min-w-9 place-items-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <IconTrash className="size-4" />
                        </button>
                      </form>
                    ) : null}

                    <Link
                      href={`/movimientos?editar=${row.id}#nuevo`}
                      aria-label={`Editar ${row.description}`}
                      className="grid size-9 min-w-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <IconPencil className="size-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function RecentList({ rows }: { rows: TransactionRow[] }) {
  return (
    <div className="space-y-1">
      <TransactionList rows={rows} showDelete={false} grouped={false} />
      <Link
        href="/movimientos"
        className="block pt-2 text-center text-[11px] font-medium text-muted hover:text-foreground"
      >
        Ver todos los movimientos
      </Link>
    </div>
  );
}
