import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

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

export type CategorySlice = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  total: number;
  spentMinor: number;
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

export function formatMoney(minor: number): string {
  return (minor / 100).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));
  return { start, end };
}

export function previousMonths(month: string, count: number): string[] {
  const [year, monthNum] = month.split("-").map(Number);
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const m = new Date(year, monthNum - 1 - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export async function getDashboard(month: string) {
  const { start, end } = monthRange(month);
  const userId = await requireUserId();

  const [incomeResult, expenseResult, txCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: start, lt: end } },
      _sum: { amountMinor: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
      _sum: { amountMinor: true },
    }),
    prisma.transaction.count({
      where: { userId, date: { gte: start, lt: end } },
    }),
  ]);

  const incomeMinor = incomeResult._sum.amountMinor ?? 0;
  const expenseMinor = expenseResult._sum.amountMinor ?? 0;
  const savedMinor = incomeMinor - expenseMinor;
  const savingsRate = incomeMinor > 0 ? savedMinor / incomeMinor : 0;

  const [accountBalances, cardBalances] = await Promise.all([
    prisma.account.findMany({
      where: { userId, archived: false },
      select: { id: true, name: true, type: true, initialBalanceMinor: true, archived: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, archived: false },
      select: {
        id: true,
        name: true,
        limitMinor: true,
        closingDay: true,
        dueDay: true,
        archived: true,
      },
    }),
  ]);

  const cashMinor = accountBalances
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + a.initialBalanceMinor, 0);

  const debtMinor = cardBalances
    .filter((c) => !c.archived)
    .reduce((sum, c) => sum + 0, 0);

  const recommendations = savedMinor > 0 ? [
    { id: "1", severity: "success" as const, title: "¡Buen ahorro!", detail: "Guardaste $" + formatMoney(savedMinor) + " este mes." }
  ] : [
    { id: "1", severity: "warning" as const, title: "Incrementa ingresos", detail: "Considera aumentar tus ingresos para mejorar tus ahorros." }
  ];

  const state = {
    cashMinor,
    debtMinor,
    netWorthMinor: incomeMinor - expenseMinor,
    cards: cardBalances.map((c) => ({
      id: c.id,
      name: c.name,
      debtMinor: 0,
      utilization: c.limitMinor > 0 ? 0 : 0,
      archived: c.archived,
      limitMinor: c.limitMinor,
    })),
    accounts: accountBalances.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balanceMinor: a.initialBalanceMinor,
      archived: a.archived,
    })),
  };

  const recent = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 5,
    include: {
      account: { select: { name: true } },
      transferAccount: { select: { name: true } },
      creditCard: { select: { name: true } },
      category: { select: { name: true, color: true } },
    },
  });

  return {
    incomeMinor,
    expenseMinor,
    savedMinor,
    savingsRate,
    txCount,
    categories: [] as CategorySlice[],
    budgets: [] as BudgetProgress[],
    state,
    recommendations,
    recent: recent.map((tx) => ({
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
    })),
  };
}

export async function getTransactions(filters: { month: string; type?: TransactionType; categoryId?: string }) {
  const { start, end } = monthRange(filters.month);
  const userId = await requireUserId();
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      account: { select: { name: true } },
      transferAccount: { select: { name: true } },
      creditCard: { select: { name: true } },
      category: { select: { name: true, color: true } },
    },
  });
  return (txs.map((tx) => ({
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
  })) as TransactionRow[]);
}

export async function getTransactionById(id: string) {
  const userId = await requireUserId();
  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      type: true,
      amountMinor: true,
      description: true,
      date: true,
      notes: true,
      categoryId: true,
      accountId: true,
      transferAccountId: true,
      creditCardId: true,
    },
  });
  if (!tx) return null;
  return {
    id: tx.id,
    type: tx.type,
    amountMinor: tx.amountMinor,
    description: tx.description,
    date: toInputDate(tx.date),
    notes: tx.notes,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    transferAccountId: tx.transferAccountId,
    creditCardId: tx.creditCardId,
    payer: tx.accountId ? `account:${tx.accountId}` : tx.creditCardId ? `card:${tx.creditCardId}` : "",
    destination:
      tx.type === "TRANSFER"
        ? tx.creditCardId
          ? `card:${tx.creditCardId}`
          : tx.transferAccountId
            ? `account:${tx.transferAccountId}`
            : ""
        : "",
  };
}

export async function getTransactionFormData() {
  const userId = await requireUserId();
  const [accounts, cards, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, parentId: true, color: true },
    }),
  ]);
  return { accounts, cards, categories };
}

export async function getCategoriesPageData() {
  const userId = await requireUserId();
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { transactions: true } },
    },
  });
  return categories;
}

export async function getAccountsPageData() {
  const userId = await requireUserId();
  const [accountBalances, cardBalances] = await Promise.all([
    prisma.account.findMany({
      where: { userId, archived: false },
      select: { id: true, name: true, type: true, initialBalanceMinor: true, archived: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, archived: false },
      select: {
        id: true,
        name: true,
        limitMinor: true,
        closingDay: true,
        dueDay: true,
        archived: true,
      },
    }),
  ]);

  const cashMinor = accountBalances
    .filter((a) => !a.archived)
    .reduce((sum, a) => sum + a.initialBalanceMinor, 0);

  const debtMinor = cardBalances
    .filter((c) => !c.archived)
    .reduce((sum, c) => sum + 0, 0);

  return {
    cashMinor,
    debtMinor,
    state: {
      cash: accountBalances
        .filter((a) => !a.archived)
        .map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balanceMinor: a.initialBalanceMinor,
          archived: a.archived,
        })),
      cards: cardBalances.map((c) => ({
        id: c.id,
        name: c.name,
        debtMinor: 0,
        utilization: c.limitMinor > 0 ? 0 : 0,
        archived: c.archived,
        limitMinor: c.limitMinor,
      })),
    },
  };
}

export async function getBudgetPageData(month: string) {
  const userId = await requireUserId();
  const categories = await getCategoriesPageData();
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { limitMinor: "desc" },
  });

  const { slices: spending } = await getCategorySpending(month);

  return {
    budgets: budgets.map<BudgetProgress>((budget) => {
      const spentMinor = spending
        .filter((slice) =>
          slice.id === budget.categoryId || slice.parentId === budget.categoryId,
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
    }),
    categories,
    slices: [] as CategorySlice[],
    expenseMinor: 0,
  };
}

export async function getCategorySpending(month: string) {
  const months = previousMonths(month, 4);
  const { start } = monthRange(months[0]);
  const { end } = monthRange(month);

  const userId = await requireUserId();

  const txs = await prisma.transaction.findMany({
    where: {
      ...(userId ? { userId } : {}),
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

  const spending: CategorySlice[] = [];
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
      const existing = spending.find((s) => s.id === id);
      if (existing) {
        existing.total += tx.amountMinor;
        existing.spentMinor += tx.amountMinor;
      } else {
        spending.push({
          id,
          name,
          color,
          parentId,
          total: tx.amountMinor,
          spentMinor: tx.amountMinor,
          share: 0,
        });
      }
    }
    expenseMinor += tx.amountMinor;
  }

  if (expenseMinor > 0) {
    for (const slice of spending) {
      slice.share = (slice.spentMinor / expenseMinor) * 100;
    }
  }

  return {
    slices: spending,
    expenseMinor,
  };
}

export async function getBudgetPageDataLegacy(month: string, spending: CategorySlice[]) {
  const budgets = await prisma.budget.findMany({
    where: { month },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { limitMinor: "desc" },
  });

  return budgets.map<BudgetProgress>((budget) => {
    const spentMinor = spending
      .reduce(
        (sum, slice) =>
          slice.id === budget.categoryId || slice.parentId === budget.categoryId
            ? sum + slice.spentMinor
            : sum,
        0,
      );
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