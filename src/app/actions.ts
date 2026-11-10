"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseInputDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";

export type ActionState = {
  ok: boolean;
  message: string;
} | null;

const transactionTypes = ["INCOME", "EXPENSE", "TRANSFER"] as const;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** "account:abc" | "card:xyz" | "" -> partes */
function parsePayer(value: string): {
  accountId?: string;
  cardId?: string;
} {
  if (value.startsWith("account:")) {
    return { accountId: value.slice("account:".length) };
  }
  if (value.startsWith("card:")) {
    return { cardId: value.slice("card:".length) };
  }
  return {};
}

function refreshAll() {
  revalidatePath("/", "layout");
}

type ValidatedTransaction = {
  type: (typeof transactionTypes)[number];
  amountMinor: number;
  description: string;
  date: Date;
  categoryId: string | null;
  accountId: string | null;
  creditCardId: string | null;
  transferAccountId: string | null;
  notes: string | null;
};

async function validateTransaction(
  formData: FormData,
): Promise<{ ok: true; data: ValidatedTransaction } | { ok: false; message: string }> {
  const typeRaw = str(formData, "type");
  const type = z.enum(transactionTypes).safeParse(typeRaw);

  if (!type.success) {
    return { ok: false, message: "Tipo de movimiento inválido." };
  }

  const amountMinor = parseAmountToMinor(str(formData, "amount"));
  if (!amountMinor) {
    return { ok: false, message: "Ingresá un monto mayor a cero." };
  }

  const description = str(formData, "description");
  if (description.length < 2) {
    return { ok: false, message: "Escribí una descripción de al menos 2 letras." };
  }

  const dateRaw = str(formData, "date");
  const date = dateRaw ? parseInputDate(dateRaw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { ok: false, message: "La fecha no es válida." };
  }

  const categoryId = str(formData, "categoryId") || null;
  const payer = parsePayer(str(formData, "payer"));
  const destination = parsePayer(str(formData, "destination"));

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { type: true },
    });
    const expected = type.data === "INCOME" ? "INCOME" : "EXPENSE";
    if (!category || category.type !== expected) {
      return { ok: false, message: "La categoría no corresponde al tipo de movimiento." };
    }
  }

  if (type.data === "EXPENSE" && !payer.accountId && !payer.cardId) {
    return { ok: false, message: "Elegí con qué cuenta o tarjeta pagaste." };
  }

  if (type.data === "INCOME" && !payer.accountId) {
    return { ok: false, message: "Elegí en qué cuenta entró la plata." };
  }

  if (type.data === "TRANSFER") {
    if (!payer.accountId) {
      return { ok: false, message: "Elegí la cuenta de origen." };
    }
    if (!destination.accountId && !destination.cardId) {
      return { ok: false, message: "Elegí el destino de la transferencia." };
    }
    if (
      destination.accountId === payer.accountId ||
      (destination.cardId && payer.cardId === destination.cardId)
    ) {
      return { ok: false, message: "El origen y el destino no pueden ser iguales." };
    }
  }

  return {
    ok: true,
    data: {
      type: type.data,
      amountMinor,
      description,
      date,
      categoryId,
      accountId: payer.accountId ?? null,
      creditCardId: payer.cardId ?? destination.cardId ?? null,
      transferAccountId: type.data === "TRANSFER" ? (destination.accountId ?? null) : null,
      notes: str(formData, "notes") || null,
    },
  };
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = await validateTransaction(formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  await prisma.transaction.create({
    data: {
      type: parsed.data.type,
      amountMinor: parsed.data.amountMinor,
      description: parsed.data.description,
      date: parsed.data.date,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
      accountId: parsed.data.accountId,
      creditCardId: parsed.data.creditCardId,
      transferAccountId: parsed.data.transferAccountId,
    },
  });

  refreshAll();
  return { ok: true, message: "Movimiento registrado." };
}

export async function updateTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Movimiento inválido." };

  const parsed = await validateTransaction(formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const existing = await prisma.transaction.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Ese movimiento ya no existe." };
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      type: parsed.data.type,
      amountMinor: parsed.data.amountMinor,
      description: parsed.data.description,
      date: parsed.data.date,
      notes: parsed.data.notes,
      categoryId: parsed.data.categoryId,
      accountId: parsed.data.accountId,
      creditCardId: parsed.data.creditCardId,
      transferAccountId: parsed.data.transferAccountId,
    },
  });

  refreshAll();
  return { ok: true, message: "Movimiento actualizado." };
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) return;

  await prisma.transaction.delete({ where: { id } });
  refreshAll();
}

const accountTypes = ["CASH", "SAVINGS"] as const;

export async function createAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = str(formData, "name");
  if (name.length < 2) {
    return { ok: false, message: "Poné un nombre a la cuenta." };
  }

  const type = z.enum(accountTypes).safeParse(str(formData, "type"));
  if (!type.success) {
    return { ok: false, message: "Tipo de cuenta inválido." };
  }

  const initialRaw = str(formData, "initial");
  const initialMinor = initialRaw ? (parseAmountToMinor(initialRaw) ?? 0) : 0;

  await prisma.account.create({
    data: { name, type: type.data, initialBalanceMinor: initialMinor },
  });

  refreshAll();
  return { ok: true, message: "Cuenta creada." };
}

export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Cuenta inválida." };

  const used = await prisma.transaction.count({
    where: { OR: [{ accountId: id }, { transferAccountId: id }] },
  });

  if (used > 0) {
    return {
      ok: false,
      message: "Tiene movimientos. No se puede eliminar sin perder historial.",
    };
  }

  await prisma.account.delete({ where: { id } });
  refreshAll();
  return { ok: true, message: "Cuenta eliminada." };
}

const CATEGORY_COLORS = [
  "#34d399",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
  "#fb7185",
  "#a3e635",
];

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = str(formData, "name");
  if (name.length < 2) {
    return { ok: false, message: "Escribí un nombre de al menos 2 letras." };
  }
  if (name.length > 30) {
    return { ok: false, message: "El nombre no puede pasar de 30 letras." };
  }

  const type = z.enum(["INCOME", "EXPENSE"]).safeParse(str(formData, "type"));
  if (!type.success) {
    return { ok: false, message: "Tipo de categoría inválido." };
  }

  const existing = await prisma.category.findFirst({
    where: { name, type: type.data, parentId: null },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, message: "Ya existe una categoría con ese nombre." };
  }

  const count = await prisma.category.count({ where: { type: type.data } });
  await prisma.category.create({
    data: {
      name,
      type: type.data,
      color: CATEGORY_COLORS[count % CATEGORY_COLORS.length],
    },
  });

  refreshAll();
  return { ok: true, message: "Categoría creada." };
}

export async function deleteCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Categoría inválida." };

  const used = await prisma.transaction.count({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
  refreshAll();

  return {
    ok: true,
    message:
      used > 0
        ? `Categoría eliminada. ${used} movimientos quedaron sin categoría.`
        : "Categoría eliminada.",
  };
}

export async function createCreditCard(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = str(formData, "name");
  if (name.length < 2) {
    return { ok: false, message: "Poné un nombre a la tarjeta." };
  }

  const limitMinor = parseAmountToMinor(str(formData, "limit"));
  if (!limitMinor) {
    return { ok: false, message: "El cupo debe ser mayor a cero." };
  }

  const closingDay = Number(str(formData, "closingDay"));
  const dueDay = Number(str(formData, "dueDay"));

  if (
    !Number.isInteger(closingDay) ||
    closingDay < 1 ||
    closingDay > 31 ||
    !Number.isInteger(dueDay) ||
    dueDay < 1 ||
    dueDay > 31
  ) {
    return { ok: false, message: "Los días de corte y pago van del 1 al 31." };
  }

  await prisma.creditCard.create({
    data: { name, limitMinor, closingDay, dueDay },
  });

  refreshAll();
  return { ok: true, message: "Tarjeta creada." };
}

export async function deleteCreditCard(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Tarjeta inválida." };

  const used = await prisma.transaction.count({
    where: { creditCardId: id },
  });

  if (used > 0) {
    return {
      ok: false,
      message: "Tiene movimientos. No se puede eliminar sin perder historial.",
    };
  }

  await prisma.creditCard.delete({ where: { id } });
  refreshAll();
  return { ok: true, message: "Tarjeta eliminada." };
}

export async function upsertBudget(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "id");
  const categoryId = str(formData, "categoryId");
  const month = str(formData, "month");
  const limitMinor = parseAmountToMinor(str(formData, "limit"));

  if (!categoryId) {
    return { ok: false, message: "Elegí una categoría." };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { ok: false, message: "Mes inválido." };
  }
  if (!limitMinor) {
    return { ok: false, message: "El límite debe ser mayor a cero." };
  }

  if (id) {
    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, message: "Ese presupuesto ya no existe." };
    }

    await prisma.budget.update({
      where: { id },
      data: { limitMinor },
    });

    refreshAll();
    return { ok: true, message: "Presupuesto actualizado." };
  }

  await prisma.budget.upsert({
    where: { categoryId_month: { categoryId, month } },
    create: { categoryId, month, limitMinor },
    update: { limitMinor },
  });

  refreshAll();
  return { ok: true, message: "Presupuesto guardado." };
}
