import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AccountType } from "@/generated/prisma/client";

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

export type CashSnapshot = {
  spentMinor: number;
  incomeMinor: number;
  balanceMinor: number;
};

export type AccountSnapshot = {
  id: string;
  name: string;
  type: AccountType;
  balanceMinor: number;
};

export type CardSnapshot = {
  id: string;
  name: string;
  limitMinor: number;
  closingDay: number;
  dueDay: number;
  debtMinor: number;
  utilization: number;
};

export type MoneySnapshot = {
  cash: CashSnapshot;
  accounts: AccountSnapshot[];
  cards: CardSnapshot[];
  accountsMinor: number;
  debtMinor: number;
  netWorthMinor: number;
};

/**
 * Estado del dinero del usuario.
 *
 * Regla del efectivo: es nativo. No se crea ni se edita, y no tiene saldo
 * inicial ni tope. Vive en los movimientos que no apuntan a ninguna cuenta ni
 * tarjeta (`accountId`, `transferAccountId` y `creditCardId` en null).
 *
 * Las cuentas viejas de tipo CASH (de versiones anteriores) se siguen leyendo
 * como efectivo para no perder el historial, pero ya no se pueden crear.
 */
export async function getMoneySnapshot(userId: string): Promise<MoneySnapshot> {
  const [accounts, cards] = await Promise.all([
    prisma.account.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true, initialBalanceMinor: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, limitMinor: true, closingDay: true, dueDay: true },
    }),
  ]);

  const cashAccounts = accounts.filter((account) => account.type === "CASH");
  const debitAccounts = accounts.filter((account) => account.type !== "CASH");
  const cashAccountIds = cashAccounts.map((account) => account.id);
  const debitAccountIds = debitAccounts.map((account) => account.id);

  const cashRows = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [
        {
          accountId: null,
          transferAccountId: null,
          creditCardId: null,
          type: { in: ["INCOME", "EXPENSE"] },
        },
        ...(cashAccountIds.length > 0
          ? [
              { accountId: { in: cashAccountIds } },
              { transferAccountId: { in: cashAccountIds } },
            ]
          : []),
      ],
    },
    select: { type: true, amountMinor: true, accountId: true, transferAccountId: true },
  });

  const debitRows =
    debitAccountIds.length > 0
      ? await prisma.transaction.findMany({
          where: {
            userId,
            OR: [
              { accountId: { in: debitAccountIds } },
              { transferAccountId: { in: debitAccountIds } },
            ],
          },
          select: {
            type: true,
            amountMinor: true,
            accountId: true,
            transferAccountId: true,
          },
        })
      : [];

  const cardRows = await prisma.transaction.findMany({
    where: { userId, creditCardId: { not: null } },
    select: { creditCardId: true, type: true, amountMinor: true },
  });

  // Efectivo: arranca con el saldo inicial de cuentas CASH legadas (si hay).
  let cashIncomeMinor = cashAccounts.reduce(
    (sum, account) => sum + account.initialBalanceMinor,
    0,
  );
  let cashSpentMinor = 0;

  for (const row of cashRows) {
    if (row.type === "EXPENSE") {
      cashSpentMinor += row.amountMinor;
    } else if (row.type === "INCOME") {
      cashIncomeMinor += row.amountMinor;
    } else if (row.type === "TRANSFER") {
      // Desde una cuenta de efectivo legada: sale plata del bolsillo.
      // Hacia una cuenta de efectivo legada: entra plata al bolsillo.
      if (row.accountId && cashAccountIds.includes(row.accountId)) {
        cashSpentMinor += row.amountMinor;
      } else {
        cashIncomeMinor += row.amountMinor;
      }
    }
  }

  const accountsSnapshot: AccountSnapshot[] = debitAccounts.map((account) => {
    let balanceMinor = account.initialBalanceMinor;
    for (const row of debitRows) {
      if (row.type === "INCOME" && row.accountId === account.id) {
        balanceMinor += row.amountMinor;
      } else if (row.type === "EXPENSE" && row.accountId === account.id) {
        balanceMinor -= row.amountMinor;
      } else if (row.type === "TRANSFER") {
        if (row.accountId === account.id) balanceMinor -= row.amountMinor;
        if (row.transferAccountId === account.id) balanceMinor += row.amountMinor;
      }
    }
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balanceMinor,
    };
  });

  const cardsSnapshot: CardSnapshot[] = cards.map((card) => {
    let debtMinor = 0;
    for (const row of cardRows) {
      if (row.creditCardId !== card.id) continue;
      if (row.type === "EXPENSE") debtMinor += row.amountMinor;
      else if (row.type === "TRANSFER") debtMinor -= row.amountMinor;
    }
    if (debtMinor < 0) debtMinor = 0;

    return {
      id: card.id,
      name: card.name,
      limitMinor: card.limitMinor,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      debtMinor,
      utilization: card.limitMinor > 0 ? debtMinor / card.limitMinor : 0,
    };
  });

  const accountsMinor = accountsSnapshot.reduce(
    (sum, account) => sum + account.balanceMinor,
    0,
  );
  const debtMinor = cardsSnapshot.reduce((sum, card) => sum + card.debtMinor, 0);
  const cashBalanceMinor = cashIncomeMinor - cashSpentMinor;

  return {
    cash: {
      spentMinor: cashSpentMinor,
      incomeMinor: cashIncomeMinor,
      balanceMinor: cashBalanceMinor,
    },
    accounts: accountsSnapshot,
    cards: cardsSnapshot,
    accountsMinor,
    debtMinor,
    netWorthMinor: accountsMinor + cashBalanceMinor - debtMinor,
  };
}

export async function getBudgetProgress(
  userId: string,
  month: string,
  spending: CategorySlice[],
): Promise<BudgetProgress[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { limitMinor: "desc" },
  });

  return budgets.map<BudgetProgress>((budget) => {
    const spentMinor = spending
      .filter(
        (slice) =>
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
  });
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

  const [snapshot, spending] = await Promise.all([
    getMoneySnapshot(userId),
    getCategorySpending(month),
  ]);
  const budgets = await getBudgetProgress(userId, month, spending.slices);

  const recommendations = savedMinor > 0 ? [
    { id: "1", severity: "success" as const, title: "¡Buen ahorro!", detail: "Guardaste $" + formatMoney(savedMinor) + " este mes." }
  ] : [
    { id: "1", severity: "warning" as const, title: "Incrementa ingresos", detail: "Considera aumentar tus ingresos para mejorar tus ahorros." }
  ];

  const state = {
    cashMinor: snapshot.accountsMinor,
    debtMinor: snapshot.debtMinor,
    netWorthMinor: snapshot.netWorthMinor,
    cash: snapshot.cash,
    cards: snapshot.cards,
    accounts: snapshot.accounts,
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
    categories: spending.slices,
    budgets,
    state,
    recommendations,
    recent: recent.map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: tx.type,
      amountMinor: tx.amountMinor,
      description: tx.description,
      notes: tx.notes,
      accountName:
        tx.account?.name ??
        (tx.type !== "TRANSFER" && !tx.creditCardId ? "Efectivo" : null),
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
    accountName:
      tx.account?.name ??
      (tx.type !== "TRANSFER" && !tx.creditCardId ? "Efectivo" : null),
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
      account: { select: { type: true } },
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
    payer:
      tx.type === "TRANSFER"
        ? tx.accountId
          ? `account:${tx.accountId}`
          : ""
        : tx.accountId && tx.account?.type !== "CASH"
          ? `account:${tx.accountId}`
          : tx.creditCardId
            ? `card:${tx.creditCardId}`
            : "cash",
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
      // El efectivo es nativo: no se elige como cuenta. Las cuentas de tipo
      // CASH de versiones viejas se siguen leyendo como efectivo en los saldos.
      where: { userId, archived: false, type: { not: "CASH" } },
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
  const snapshot = await getMoneySnapshot(userId);

  return {
    cash: snapshot.cash,
    accounts: snapshot.accounts,
    cards: snapshot.cards,
    cashMinor: snapshot.accountsMinor,
    debtMinor: snapshot.debtMinor,
    netWorthMinor: snapshot.netWorthMinor,
  };
}

export async function getBudgetPageData(month: string) {
  const userId = await requireUserId();
  const categories = await getCategoriesPageData();
  const spending = await getCategorySpending(month);
  const budgets = await getBudgetProgress(userId, month, spending.slices);

  return {
    budgets,
    categories,
    slices: spending.slices,
    expenseMinor: spending.expenseMinor,
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