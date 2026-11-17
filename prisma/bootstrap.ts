/**
 * Crea la base mínima para una instalación nueva: 1 usuario, 2 cuentas, 3
 * categorías de gasto, 1 de ingreso y 3 presupuestos del mes actual.
 *
 * Es idempotente y NO crea movimientos: si ya hay datos, no toca nada salvo
 * backfillear las filas sin usuario a la primera cuenta.
 *
 * Uso: npm run db:bootstrap
 */

import "dotenv/config";

import { randomBytes, scryptSync } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const EMAIL = "nicolaslopezforero17@gmail.com";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function main(): Promise<void> {
  // 1. Usuario base (la primera persona que usa la app en una instalación nueva).
  let user = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (user) {
    console.log("[bootstrap] usuario existente encontrado");
  } else {
    const password = process.env.BOOTSTRAP_PASSWORD ?? "plata12345";
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: "Nicolas",
        passwordHash: hashPassword(password),
        emailVerifiedAt: new Date(),
      },
    });
    console.log("[bootstrap] usuario base creado");
  }

  const userId = user.id;

  // Las cuentas previas a la verificación por correo ya estaban en uso: se dan por verificadas.
  const verified = await prisma.user.updateMany({
    where: { emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  if (verified.count > 0) console.log(`[bootstrap] ${verified.count} usuarios marcados como verificados`);

  // 2. Backfill: las filas viejas (sin usuario) pasan a la primera cuenta.
  const models = [
    ["Transaction", () => prisma.transaction.updateMany({ where: { userId: null }, data: { userId } })],
    ["Budget", () => prisma.budget.updateMany({ where: { userId: null }, data: { userId } })],
    ["Category", () => prisma.category.updateMany({ where: { userId: null }, data: { userId } })],
    ["CreditCard", () => prisma.creditCard.updateMany({ where: { userId: null }, data: { userId } })],
    ["Account", () => prisma.account.updateMany({ where: { userId: null }, data: { userId } })],
  ] as const;

  for (const [name, run] of models) {
    const { count } = await run();
    if (count > 0) console.log(`[bootstrap] backfill: ${count} filas de ${name} asignadas`);
  }

  // 3. Datos mínimos solo si la base sigue vacía.
  if ((await prisma.account.count()) === 0) {
    await prisma.account.createMany({
      data: [
        { name: "Efectivo", type: "CASH", initialBalanceMinor: 0, userId },
        { name: "Cuenta de ahorros", type: "SAVINGS", initialBalanceMinor: 0, userId },
      ],
    });
    console.log("[bootstrap] 2 cuentas creadas");
  }

  if ((await prisma.creditCard.count()) === 0) {
    await prisma.creditCard.create({
      data: { name: "Tarjeta de crédito", limitMinor: 5_000_000, closingDay: 25, dueDay: 10, userId },
    });
    console.log("[bootstrap] 1 tarjeta creada");
  }

  if ((await prisma.category.count()) === 0) {
    await prisma.category.createMany({
      data: [
        { name: "Alimentación", type: "EXPENSE", color: "#34d399", userId },
        { name: "Transporte", type: "EXPENSE", color: "#60a5fa", userId },
        { name: "Hogar", type: "EXPENSE", color: "#f59e0b", userId },
        { name: "Salario", type: "INCOME", color: "#34d399", userId },
      ],
    });
    console.log("[bootstrap] 4 categorías creadas");
  }

  const month = currentMonth();
  if ((await prisma.budget.count({ where: { month } })) === 0) {
    const categories = await prisma.category.findMany({
      where: { type: "EXPENSE" },
      select: { id: true, name: true },
    });
    const limits: Record<string, number> = {
      Alimentación: 1_200_000,
      Transporte: 450_000,
      Hogar: 2_300_000,
    };

    const data = categories
      .filter((c) => limits[c.name] !== undefined)
      .map((c) => ({ categoryId: c.id, month, limitMinor: limits[c.name], userId }));

    if (data.length > 0) {
      await prisma.budget.createMany({ data });
      console.log(`[bootstrap] presupuestos de ${month} creados`);
    }
  }

  console.log("[bootstrap] listo");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
