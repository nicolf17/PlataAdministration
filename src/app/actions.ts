"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { parseInputDate } from "@/lib/dates";
import {
  generateVerificationCode,
  hashVerificationCode,
  verificationCodeMatches,
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  codeExpiresAt,
} from "@/lib/verification";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { parseAmountToMinor } from "@/lib/money";
import { clearSession, createSession, hashPassword, requireUserId, verifyPassword } from "@/lib/auth";
import { clientIp } from "@/lib/request-ip";
import { consume, reset, waitMessage } from "@/lib/rate-limit";

export type ActionState = {
  ok: boolean;
  message: string;
  /** "verify": el registro quedó pendiente y hay que ingresar el código. */
  step?: "verify";
  email?: string;
  /** Solo en desarrollo, para poder probar sin servidor de correo configurado. */
  devCode?: string;
} | null;

const transactionTypes = ["INCOME", "EXPENSE", "TRANSFER"] as const;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** "cash" | "account:abc" | "card:xyz" | "" -> partes */
function parsePayer(value: string): {
  accountId?: string;
  cardId?: string;
  cash?: boolean;
} {
  if (value === "cash") {
    return { cash: true };
  }
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
  userId: string | null;
};

async function validateTransaction(
  formData: FormData,
): Promise<{ ok: true; data: ValidatedTransaction } | { ok: false; message: string }> {
  // La sesión es la única fuente de verdad: nunca se confía en un userId del form.
  const userId = await requireUserId();

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

  if (categoryId && type.data !== "TRANSFER") {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId, type: type.data as "INCOME" | "EXPENSE" },
      select: { type: true },
    });
    const expected = type.data === "INCOME" ? "INCOME" : "EXPENSE";
    if (!category || category.type !== expected) {
      return { ok: false, message: "La categoría no corresponde al tipo de movimiento." };
    }
  }

  if (type.data === "EXPENSE" && !payer.accountId && !payer.cardId && !payer.cash) {
    return { ok: false, message: "Elegí con qué pagaste: efectivo, débito o crédito." };
  }

  if (type.data === "INCOME" && !payer.accountId && !payer.cash) {
    return { ok: false, message: "Elegí dónde entró la plata." };
  }

  if (type.data === "TRANSFER") {
    if (payer.cash) {
      return { ok: false, message: "Las transferencias se hacen entre cuentas o tarjetas." };
    }
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

  // Cuentas y tarjetas involucradas tienen que ser del usuario: si no, con solo
  // cambiar el id en el formulario se podría imputar un movimiento ajeno.
  const accountIds = [payer.accountId, destination.accountId].filter(
    (value): value is string => Boolean(value),
  );
  if (accountIds.length > 0) {
    const owned = await prisma.account.count({
      where: { id: { in: accountIds }, userId },
    });
    if (owned !== new Set(accountIds).size) {
      return { ok: false, message: "Alguna de las cuentas no existe en tu perfil." };
    }
  }

  const cardIds = [payer.cardId, destination.cardId].filter(
    (value): value is string => Boolean(value),
  );
  if (cardIds.length > 0) {
    const owned = await prisma.creditCard.count({
      where: { id: { in: cardIds }, userId },
    });
    if (owned !== new Set(cardIds).size) {
      return { ok: false, message: "Alguna de las tarjetas no existe en tu perfil." };
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
      userId,
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
      userId: parsed.data.userId,
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

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: parsed.data.userId },
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
      userId: parsed.data.userId,
    },
  });

  refreshAll();
  return { ok: true, message: "Movimiento actualizado." };
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) return;
  const userId = await requireUserId();

  await prisma.transaction.deleteMany({
    where: { id, userId },
  });
  refreshAll();
}

export async function logout(_prev: ActionState): Promise<ActionState> {
  await clearSession();
  return redirect("/login?salida=1");
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = str(formData, "name");
  const email = str(formData, "email").trim().toLowerCase();
  const password = str(formData, "password");
  if (name.trim().length < 2) return { ok: false, message: "Poné tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Poné un email válido." };
  if (password.length < 6) return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };

  // 5 registros por hora por IP: frena el spam de códigos y el abuso de Brevo.
  const ip = await clientIp();
  const limit = consume(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: waitMessage(limit.retryAfterMs) };

  // Evitar enumeración por timing: responder siempre igual.
  const existing = await prisma.user.findUnique({ where: { email } });
  const code = generateVerificationCode();
  const passwordHash = hashPassword(password);
  const codeHash = hashVerificationCode(email, code);
  const expiresAt = codeExpiresAt();
  const lastSentAt = new Date();

  // Limpieza oportunista: registros pendientes que ya vencieron no sirven.
  await prisma.pendingSignup.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  await prisma.pendingSignup.upsert({
    where: { email },
    create: { email, name: name.trim(), passwordHash, codeHash, expiresAt, lastSentAt },
    update: { name: name.trim(), passwordHash, codeHash, attempts: 0, expiresAt, lastSentAt },
  });

  const sent = await sendVerificationEmail(email, name.trim(), code, CODE_TTL_MINUTES);
  if (!sent.ok) {
    await prisma.pendingSignup.deleteMany({ where: { email } });
    return { ok: false, message: sent.message };
  }

  return {
    ok: true,
    step: "verify",
    email,
    message: `Te enviamos un código a ${email}.`,
    ...(process.env.NODE_ENV === "production" ? {} : { devCode: code }),
  };
}

export async function verifySignup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email").trim().toLowerCase();
  const code = str(formData, "code").replace(/\D/g, "");
  if (code.length !== 6) {
    return { ok: false, step: "verify", email, message: "El código son 6 dígitos." };
  }

  // El contador de intentos por registro ya existe en la DB; esto además evita
  // que alguien pruebe códigos salteando el registro.
  const ip = await clientIp();
  const limit = consume(`verify:${ip}:${email}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { ok: false, step: "verify", email, message: waitMessage(limit.retryAfterMs) };

  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return { ok: false, step: "verify", email, message: "Pedí un código nuevo para continuar." };
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await prisma.pendingSignup.deleteMany({ where: { email } });
    return { ok: false, step: "verify", email, message: "El código venció. Pedí uno nuevo." };
  }

  if (pending.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.pendingSignup.deleteMany({ where: { email } });
    return {
      ok: false,
      step: "verify",
      email,
      message: "Demasiados intentos con ese código. Empezá el registro de nuevo.",
    };
  }

  if (!verificationCodeMatches(email, code, pending.codeHash)) {
    const attempts = pending.attempts + 1;
    await prisma.pendingSignup.update({ where: { email }, data: { attempts } });
    const left = MAX_CODE_ATTEMPTS - attempts;
    return {
      ok: false,
      step: "verify",
      email,
      message:
        left > 0
          ? `Código incorrecto. Te quedan ${left} ${left === 1 ? "intento" : "intentos"}.`
          : "Código incorrecto. Pedí uno nuevo.",
    };
  }

  const alreadyExists = await prisma.user.findUnique({ where: { email } });
  if (alreadyExists) {
    await prisma.pendingSignup.deleteMany({ where: { email } });
    return { ok: false, message: "Ya existe una cuenta con ese email." };
  }

  const user = await prisma.user.create({
    data: {
      name: pending.name,
      email,
      passwordHash: pending.passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.pendingSignup.deleteMany({ where: { email } });

  // La cuenta recién confirmada entra directo: sesión y cookie en la misma request.
  await createSession(user.id, randomUUID());

  return { ok: true, message: "Cuenta confirmada. ¡Bienvenido!" };
}

export async function resendSignupCode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = str(formData, "email").trim().toLowerCase();
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return { ok: false, step: "verify", email, message: "Empezá el registro de nuevo." };
  }

  const elapsed = (Date.now() - pending.lastSentAt.getTime()) / 1000;
  if (elapsed < RESEND_COOLDOWN_SECONDS) {
    const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
    return {
      ok: false,
      step: "verify",
      email,
      message: `Esperá ${wait} s antes de pedir otro código.`,
    };
  }

  const code = generateVerificationCode();
  await prisma.pendingSignup.update({
    where: { email },
    data: {
      codeHash: hashVerificationCode(email, code),
      attempts: 0,
      expiresAt: codeExpiresAt(),
      lastSentAt: new Date(),
    },
  });

  const sent = await sendVerificationEmail(email, pending.name, code, CODE_TTL_MINUTES);
  if (!sent.ok) return { ok: false, step: "verify", email, message: sent.message };

  return {
    ok: true,
    step: "verify",
    email,
    message: "Te enviamos un código nuevo.",
    ...(process.env.NODE_ENV === "production" ? {} : { devCode: code }),
  };
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, "email").trim().toLowerCase();
  const password = str(formData, "password");

  // Dos cubos: por IP (evita rociar muchas cuentas) y por IP+email (evita
  // martillar una sola cuenta desde el mismo origen).
  const ip = await clientIp();
  const byIp = consume(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!byIp.ok) return { ok: false, message: waitMessage(byIp.retryAfterMs) };

  const byAccount = consume(`login:${ip}:${email}`, 5, 15 * 60 * 1000);
  if (!byAccount.ok) return { ok: false, message: waitMessage(byAccount.retryAfterMs) };

  const user = await prisma.user.findUnique({ where: { email } });
  // Responder siempre igual para evitar enumeración por timing (email existe o no).
  if (!user) return { ok: false, message: "Email o contraseña inválidos." };
  const ok = verifyPassword(password, user.passwordHash);
  if (!ok) return { ok: false, message: "Email o contraseña inválidos." };
  if (!user.emailVerifiedAt) {
    return { ok: false, message: "Confirmá tu cuenta con el código que te enviamos por correo." };
  }

  // Login correcto: se libera el cubo para no arrastrar intentos viejos.
  reset(`login:${ip}:${email}`);

  // Crea la fila de Session y setea la cookie httpOnly en esta misma request.
  await createSession(user.id, randomUUID());
  return redirect("/?ingreso=1");
}

// El efectivo es nativo y automático: no se crea como cuenta. El alta de
// métodos de pago solo admite cuentas de ahorro / tarjetas débito.
const accountTypes = ["SAVINGS"] as const;

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

  const userId = await requireUserId();
  await prisma.account.create({
    data: {
      name,
      type: type.data,
      initialBalanceMinor: initialMinor,
      userId,
    },
  });

  refreshAll();
  return { ok: true, message: "Cuenta de ahorros creada." };
}

export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Cuenta inválida." };
  const userId = await requireUserId();

  const used = await prisma.transaction.count({
    where: {
      userId,
      OR: [{ accountId: id }, { transferAccountId: id }],
    },
  });

  if (used > 0) {
    return {
      ok: false,
      message: "Tiene movimientos. No se puede eliminar sin perder historial.",
    };
  }

  const deleted = await prisma.account.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) return { ok: false, message: "Esa cuenta ya no existe." };
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

  const userId = await requireUserId();
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name,
      type: type.data,
      parentId: null,
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, message: "Ya existe una categoría con ese nombre." };
  }

  const count = await prisma.category.count({
    where: { userId, type: type.data },
  });
  await prisma.category.create({
    data: {
      name,
      type: type.data,
      color: CATEGORY_COLORS[count % CATEGORY_COLORS.length],
      userId,
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
  const userId = await requireUserId();

  const used = await prisma.transaction.count({
    where: { userId, categoryId: id },
  });
  const deleted = await prisma.category.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) return { ok: false, message: "Esa categoría ya no existe." };
  refreshAll();
  return {
    ok: true,
    message:
      used > 0
        ? `Categoría eliminada. ${used} movimientos quedaron sin categoría.`
        : "Categoría eliminada.",
  };
}

const CREDIT_CARD_COLORS = [
  "#34d399",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
  "#fb7185",
  "#a3e635",
];

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

  const userId = await requireUserId();
  await prisma.creditCard.create({
    data: {
      name,
      limitMinor,
      closingDay,
      dueDay,
      userId,
    },
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
  const userId = await requireUserId();

  const used = await prisma.transaction.count({
    where: { userId, creditCardId: id },
  });

  if (used > 0) {
    return {
      ok: false,
      message: "Tiene movimientos. No se puede eliminar sin perder historial.",
    };
  }

  const deleted = await prisma.creditCard.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) return { ok: false, message: "Esa tarjeta ya no existe." };
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

  const userId = await requireUserId();
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, message: "Esa categoría no existe en tu cuenta." };
  }

  if (id) {
    const existing = await prisma.budget.findFirst({
      where: { id, userId },
      select: { id: true },
    });
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
    where: { userId_categoryId_month: { userId, categoryId, month } },
    create: { categoryId, month, limitMinor, userId },
    update: { limitMinor },
  });

  refreshAll();
  return { ok: true, message: "Presupuesto guardado." };
}