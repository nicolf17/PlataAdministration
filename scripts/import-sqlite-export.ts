/**
 * Importa a Postgres los datos exportados de la base SQLite vieja.
 *
 * Requiere haber corrido antes `node scripts/export-sqlite.mjs`, que deja
 * prisma/sqlite-export.json (ignorado por git: tiene datos personales).
 *
 * Uso: npm run db:import-sqlite
 *
 * Es idempotente: usa skipDuplicates, así que se puede correr dos veces sin
 * duplicar filas. Los IDs se conservan, por lo que las relaciones siguen bien.
 */

import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

type Row = Record<string, unknown>;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** SQLite guarda fechas como "2026-11-11 16:48:47" (UTC) o ISO con offset. */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return new Date(value);
  let text = String(value).trim().replace(" ", "T");
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(text)) text += "Z";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

async function main(): Promise<void> {
  const file = path.resolve("prisma/sqlite-export.json");

  let dump: { tables?: Record<string, Row[]> };
  try {
    dump = JSON.parse(await readFile(file, "utf8")) as { tables?: Record<string, Row[]> };
  } catch {
    throw new Error(
      "No encuentro prisma/sqlite-export.json. Corré primero: node scripts/export-sqlite.mjs",
    );
  }

  const rows = (table: string): Row[] => dump.tables?.[table] ?? [];

  // Orden de inserción: respeta las claves foráneas.
  const users = rows("User").map((r) => ({
    id: String(r.id),
    email: String(r.email),
    passwordHash: String(r.passwordHash),
    name: String(r.name),
    emailVerifiedAt: toDate(r.emailVerifiedAt),
    createdAt: toDate(r.createdAt) ?? new Date(),
    onboardingCompleted: toBool(r.onboardingCompleted),
  }));

  const accounts = rows("Account").map((r) => ({
    id: String(r.id),
    userId: r.userId ? String(r.userId) : null,
    name: String(r.name),
    type: String(r.type) as "CASH" | "BANK" | "SAVINGS" | "WALLET",
    initialBalanceMinor: toInt(r.initialBalanceMinor),
    archived: toBool(r.archived),
    createdAt: toDate(r.createdAt) ?? new Date(),
  }));

  const cards = rows("CreditCard").map((r) => ({
    id: String(r.id),
    userId: r.userId ? String(r.userId) : null,
    name: String(r.name),
    limitMinor: toInt(r.limitMinor),
    closingDay: toInt(r.closingDay),
    dueDay: toInt(r.dueDay),
    archived: toBool(r.archived),
    createdAt: toDate(r.createdAt) ?? new Date(),
  }));

  const categories = rows("Category").map((r) => ({
    id: String(r.id),
    userId: r.userId ? String(r.userId) : null,
    name: String(r.name),
    type: String(r.type) as "INCOME" | "EXPENSE",
    color: String(r.color ?? "#64748b"),
    icon: r.icon ? String(r.icon) : null,
    parentId: r.parentId ? String(r.parentId) : null,
  }));

  const transactions = rows("Transaction").map((r) => ({
    id: String(r.id),
    userId: r.userId ? String(r.userId) : null,
    date: toDate(r.date) ?? new Date(),
    type: String(r.type) as "INCOME" | "EXPENSE" | "TRANSFER",
    amountMinor: toInt(r.amountMinor),
    description: String(r.description),
    notes: r.notes ? String(r.notes) : null,
    accountId: r.accountId ? String(r.accountId) : null,
    transferAccountId: r.transferAccountId ? String(r.transferAccountId) : null,
    creditCardId: r.creditCardId ? String(r.creditCardId) : null,
    categoryId: r.categoryId ? String(r.categoryId) : null,
    createdAt: toDate(r.createdAt) ?? new Date(),
  }));

  const budgets = rows("Budget").map((r) => ({
    id: String(r.id),
    userId: r.userId ? String(r.userId) : null,
    categoryId: String(r.categoryId),
    month: String(r.month),
    limitMinor: toInt(r.limitMinor),
  }));

  const sessions = rows("Session").map((r) => ({
    id: String(r.id),
    sid: String(r.sid),
    userId: String(r.userId),
    createdAt: toDate(r.createdAt) ?? new Date(),
    expiresAt: toDate(r.expiresAt) ?? new Date(),
  }));

  const pending = rows("PendingSignup").map((r) => ({
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    passwordHash: String(r.passwordHash),
    codeHash: String(r.codeHash),
    attempts: toInt(r.attempts),
    expiresAt: toDate(r.expiresAt) ?? new Date(),
    lastSentAt: toDate(r.lastSentAt) ?? new Date(),
    createdAt: toDate(r.createdAt) ?? new Date(),
  }));

  const vitals = rows("WebVital").map((r) => ({
    id: String(r.id),
    name: String(r.name),
    value: Number(r.value ?? 0),
    rating: r.rating ? String(r.rating) : null,
    path: r.path ? String(r.path) : null,
    createdAt: toDate(r.createdAt) ?? new Date(),
  }));

  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    ["User", () => prisma.user.createMany({ data: users, skipDuplicates: true })],
    ["Account", () => prisma.account.createMany({ data: accounts, skipDuplicates: true })],
    ["CreditCard", () => prisma.creditCard.createMany({ data: cards, skipDuplicates: true })],
    ["Category", () => prisma.category.createMany({ data: categories, skipDuplicates: true })],
    ["Transaction", () => prisma.transaction.createMany({ data: transactions, skipDuplicates: true })],
    ["Budget", () => prisma.budget.createMany({ data: budgets, skipDuplicates: true })],
    ["Session", () => prisma.session.createMany({ data: sessions, skipDuplicates: true })],
    ["PendingSignup", () => prisma.pendingSignup.createMany({ data: pending, skipDuplicates: true })],
    ["WebVital", () => prisma.webVital.createMany({ data: vitals, skipDuplicates: true })],
  ];

  for (const [name, run] of steps) {
    const { count } = await run();
    console.log(`- ${name}: ${count} filas importadas`);
  }

  console.log("\nListo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
