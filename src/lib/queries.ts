import "server-only";

import { prisma } from "@/lib/db";
import { monthRange, previousMonths } from "@/lib/dates";
import { buildRecommendations } from "@/lib/recommendations";
import type {
  AccountType,
  TransactionType,
} from "@/generated/prisma/client";

export type AccountBalance = {
  id: string;
  name: string;
  type: AccountType;
  initialMinor: number;
  balanceMinor: number;
  archived: boolean;
};

export type CardBalance = {
  id: string;
  name: string;
  limitMinor: number;
  debtMinor: number;
  utilization: number;
  closingDay: number;
  dueDay: number;
  archived: boolean;
};

type BalanceTx = {
  type: TransactionType;
  amountMinor: number;
  accountId: string | null;
  transferAccountId: string | null;
  creditCardId: string | null;
};

/**
 * El saldo de una cuenta es: saldo inicial + ingresos - gastos - transferencias
 * enviadas + transferencias recibidas. Los gastos con tarjeta no la tocan.
 */
export function computeAccountBalance(
  initialMinor: number,
  accountId: string,
  transactions: BalanceTx[],
): number {
  return transactions.reduce((balance, tx) => {
    if (tx.type === "INCOME" && tx.accountId === accountId) {
      return balance + tx.amountMinor;
    }
    if (tx.type === "EXPENSE" && tx.accountId === accountId) {
      return balance - tx.amountMinor;
    }
    if (tx.type === "TRANSFER") {
      if (tx.accountId === accountId) return balance - tx.amountMinor;
      if (tx.transferAccountId === accountId) return balance + tx.amountMinor;
    }
    return balance;
  }, initialMinor);
}

/**
 * La deuda de una tarjeta es: compras con tarjeta - pagos a la tarjeta.
 * Un pago es una TRANSFER que sale de una cuenta y apunta a la tarjeta.
 */
export function computeCardDebt(
  cardId: string,
  transactions: BalanceTx[],
): number {
  return transactions.reduce((debt, tx) => {
    if (tx.creditCardId !== cardId) return debt;
    if (tx.type === "EXPENSE") return debt + tx.amountMinor;
    if (tx.type === "TRANSFER") return debt - tx.amountMinor;
    return debt;
  }, 0);
}

export async function getFinancialState() {
  const [accounts, cards, transactions] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ archived: "asc" }, { createdAt: "asc" }] }),
    prisma.creditCard.findMany({ orderBy: [{ archived: "asc" }, { createdAt: "asc" }] }),
    prisma.transaction.findMany({
      select: {
        type: true,
        amountMinor: true,
        accountId: true,
        transferAccountId: true,
        creditCardId: true,
      },
    }),
  ]);

  const accountBalances: AccountBalance[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    initialMinor: account.initialBalanceMinor,
    balanceMinor: computeAccountBalance(
      account.initialBalanceMinor,
      account.id,
      transactions,
    ),
    archived: account.archived,
  }));

  const cardBalances: CardBalance[] = cards.map((card) => {
    const debtMinor = Math.max(0, computeCardDebt(card.id, transactions));
    return {
      id: card.id,
      name: card.name,
      limitMinor: card.limitMinor,
      debtMinor,
      utilization: card.limitMinor > 0 ? debtMinor / card.limitMinor : 0,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      archived: card.archived,
    };
  });

  const cashMinor = accountBalances
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + a.balanceMinor, 0);
  const debtMinor = cardBalances
    .filter((c) => !c.archived)
    .reduce((sum, c) => sum + c.debtMinor, 0);

  return {
    accounts: accountBalances,
    cards: cardBalances,
    cashMinor,
    debtMinor,
    netWorthMinor: cashMinor - debtMinor,
  };
}

export type CategorySlice = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  spentMinor: number;
  baselineMinor: number;
  share: number;
};

export type BudgetProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  color: string;
  limitMinor: number;
  spentMinor: number;
  ratio: number;
};

export type TransactionRow = {
  id: string;
  date: Date;
  type: TransactionType;
  amountMinor: number;
  description: string;
  notes: string | null;
  accountName: string | null;
  transferAccountName: string | null;
  cardName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

type TxWithRelations = {
  id: string;
  date: Date;
  type: TransactionType;
  amountMinor: number;
  description: string;
  notes: string | null;
  account: { name: string } | null;
  transferAccount: { name: string } | null;
  creditCard: { name: string } | null;
  category: { name: string; color: string } | null;
};

function toRow(tx: TxWithRelations): TransactionRow {
  return {
    id: tx.id,
    date: tx.date,
    type: tx.type,
    amountMinor: tx.amountMinor,
    description: tx.description,
    notes: tx.notes,
    accountName: tx.account?.name ?? null,
    transferAccountName: tx.transferAccount?.name ?? null,
    cardName: tx.creditCard?.name ?? null,
    categoryName: tx.category?.name ?? null,
    categoryColor: tx.category?.color ?? null,
  };
}

const txInclude = {
  account: { select: { name: true } },
  transferAccount: { select: { name: true } },
  creditCard: { select: { name: true } },
  category: { select: { name: true, color: true } },
} as const;

async function getCategorySpending(month: string): Promise<{
  slices: CategorySlice[];
  expenseMinor: number;
}> {
  const months = previousMonths(month, 4);
  const { start } = monthRange(months[0]);
  const { end } = monthRange(month);

  const txs = await prisma.transaction.findMany({
    where: {
      type: "EXPENSE",
      date: { gte: start, lt: end },
    },
    select: {
      date: true,
      amountMinor: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          parent: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  // Agregamos por categoría asignada (hoja o raíz). Así "Delivery" no se diluye
  // dentro de "Alimentación" y la recomendación es accionable.
  const current = new Map<
    string,
    { name: string; color: string; parentId: string | null; total: number }
  >();
  const baseline = new Map<string, number>();
  let expenseMinor = 0;

  for (const tx of txs) {
    const category = tx.category;
    const id = category?.id ?? "uncategorized";
    const name = category?.name ?? "Sin categoría";
    const color = category?.color ?? "#64748b";
    const parentId = category?.parent?.id ?? null;

    const txMonth = `${tx.date.getUTCFullYear()}-${String(
      tx.date.getUTCMonth() + 1,
    ).padStart(2, "0")}`;

    if (txMonth === month) {
      const prev = current.get(id) ?? { name, color, parentId, total: 0 };
      prev.total += tx.amountMinor;
      current.set(id, prev);
      expenseMinor += tx.amountMinor;
    } else {
      baseline.set(id, (baseline.get(id) ?? 0) + tx.amountMinor);
    }
  }

  const slices = [...current.entries()]
    .map(([id, value]) => ({
      id,
      name: value.name,
      color: value.color,
      parentId: value.parentId,
      spentMinor: value.total,
      baselineMinor: Math.round((baseline.get(id) ?? 0) / 3),
      share: expenseMinor > 0 ? value.total / expenseMinor : 0,
    }))
    .sort((a, b) => b.spentMinor - a.spentMinor);

  return { slices, expenseMinor };
}

export async function getBudgets(month: string, spending: CategorySlice[]) {
  const budgets = await prisma.budget.findMany({
    where: { month },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { limitMinor: "desc" },
  });

  return budgets.map<BudgetProgress>((budget) => {
    // Un presupuesto sobre una categoría padre suma también a sus hijas.
    const spentMinor = spending
      .filter(
        (slice) =>
          slice.id === budget.categoryId ||
          slice.parentId === budget.categoryId,
      )
      .reduce((sum, slice) => sum + slice.spentMinor, 0);
    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      color: budget.category.color,
      limitMinor: budget.limitMinor,
      spentMinor,
      ratio: budget.limitMinor > 0 ? spentMinor / budget.limitMinor : 0,
    };
  });
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(month: string) {
  const { start, end } = monthRange(month);

  const [state, incomeAgg, categoryData, recent, txCount] = await Promise.all([
    getFinancialState(),
    prisma.transaction.aggregate({
      where: { type: "INCOME", date: { gte: start, lt: end } },
      _sum: { amountMinor: true },
    }),
    getCategorySpending(month),
    prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      include: txInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.transaction.count({ where: { date: { gte: start, lt: end } } }),
  ]);

  const incomeMinor = incomeAgg._sum.amountMinor ?? 0;
  const expenseMinor = categoryData.expenseMinor;
  const savedMinor = incomeMinor - expenseMinor;
  const budgets = await getBudgets(month, categoryData.slices);

  const recommendations = buildRecommendations({
    month,
    incomeMinor,
    expenseMinor,
    spendingByCategory: categoryData.slices.map((slice) => ({
      id: slice.id,
      name: slice.name,
      currentMinor: slice.spentMinor,
      baselineMinor: slice.baselineMinor,
    })),
    cards: state.cards,
    budgets: budgets.map((b) => ({
      id: b.id,
      categoryName: b.categoryName,
      limitMinor: b.limitMinor,
      spentMinor: b.spentMinor,
    })),
  });

  return {
    month,
    incomeMinor,
    expenseMinor,
    savedMinor,
    savingsRate: incomeMinor > 0 ? savedMinor / incomeMinor : 0,
    state,
    categories: categoryData.slices,
    budgets,
    recommendations,
    recent: recent.map(toRow),
    txCount,
  };
}

export type TransactionFilters = {
  month: string;
  type?: TransactionType;
  categoryId?: string;
};

export async function getTransactions(filters: TransactionFilters) {
  const { start, end } = monthRange(filters.month);

  const txs = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.categoryId
        ? {
            OR: [
              { categoryId: filters.categoryId },
              { category: { parentId: filters.categoryId } },
            ],
          }
        : {}),
    },
    include: txInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return txs.map(toRow);
}

export async function getTransactionFormData() {
  const [accounts, cards, categories] = await Promise.all([
    prisma.account.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.creditCard.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, parentId: true, color: true },
    }),
  ]);

  return { accounts, cards, categories };
}

export async function getAccountsPageData() {
  const [state, accounts, cards] = await Promise.all([
    getFinancialState(),
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return { state, accounts, cards };
}

export async function getBudgetPageData(month: string) {
  const [categoryData, categories] = await Promise.all([
    getCategorySpending(month),
    prisma.category.findMany({
      where: { type: "EXPENSE" },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true, color: true },
    }),
  ]);

  const budgets = await getBudgets(month, categoryData.slices);

  return {
    budgets,
    categories,
    slices: categoryData.slices,
    expenseMinor: categoryData.expenseMinor,
  };
}
