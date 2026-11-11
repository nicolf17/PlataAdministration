/**
 * Crea la base mínima para una instalación nueva: 1 usuario, 2 cuentas, 3
 * categorías de gasto, 1 de ingreso y 3 presupuestos del mes actual.
 *
 * Es idempotente y NO crea movimientos: si ya hay datos, no toca nada salvo
 * backfillear las filas sin usuario a la primera cuenta.
 *
 * Uso: node prisma/bootstrap.mjs
 */

import Database from "better-sqlite3";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const file = url.startsWith("file:") ? url.slice(5) : url;
const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

const id = () => randomUUID();
const now = new Date();
const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

// 1. Usuario base (la primera persona que usa la app en una instalación nueva).
const userRow = db
  .prepare('SELECT id FROM "User" WHERE email = ?')
  .get("nicolaslopezforero17@gmail.com");

let userId = userRow ? userRow.id : null;

if (userId) {
  console.log("[bootstrap] usuario existente encontrado");
} else {
  const password = process.env.BOOTSTRAP_PASSWORD ?? "plata12345";
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  userId = id();
  db.prepare(
    'INSERT INTO "User" (id, email, "passwordHash", name, "emailVerifiedAt") VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
  ).run(userId, "nicolaslopezforero17@gmail.com", `scrypt:${salt}:${hash}`, "Nicolas");
  console.log("[bootstrap] usuario base creado");
}

// Las cuentas previas a la verificación por correo ya estaban en uso: se dan por verificadas.
db.prepare(
  'UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL',
).run();

// 2. Backfill: las filas viejas (sin usuario) pasan a la primera cuenta.
for (const table of ["Transaction", "Budget", "Category", "CreditCard", "Account"]) {
  const info = db
    .prepare(`UPDATE "${table}" SET "userId" = ? WHERE "userId" IS NULL`)
    .run(userId);
  if (info.changes > 0) console.log(`[bootstrap] backfill: ${info.changes} filas de ${table} asignadas`);
}

// 3. Datos mínimos solo si la base sigue vacía.
const accountCount = db.prepare('SELECT count(*) AS c FROM "Account"').get().c;
if (accountCount === 0) {
  const insert = db.prepare(
    'INSERT INTO "Account" (id, name, type, initialBalanceMinor, "userId") VALUES (?, ?, ?, ?, ?)',
  );
  insert.run(id(), "Efectivo", "CASH", 0, userId);
  insert.run(id(), "Cuenta de ahorros", "SAVINGS", 0, userId);
  console.log("[bootstrap] 2 cuentas creadas");
}

const cardCount = db.prepare('SELECT count(*) AS c FROM "CreditCard"').get().c;
if (cardCount === 0) {
  db.prepare(
    'INSERT INTO "CreditCard" (id, name, "limitMinor", "closingDay", "dueDay", "userId") VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id(), "Tarjeta de crédito", 5000000, 25, 10, userId);
  console.log("[bootstrap] 1 tarjeta creada");
}

const categoryCount = db.prepare('SELECT count(*) AS c FROM "Category"').get().c;
if (categoryCount === 0) {
  const insert = db.prepare(
    'INSERT INTO "Category" (id, name, type, color, "userId") VALUES (?, ?, ?, ?, ?)',
  );
  insert.run(id(), "Alimentación", "EXPENSE", "#34d399", userId);
  insert.run(id(), "Transporte", "EXPENSE", "#60a5fa", userId);
  insert.run(id(), "Hogar", "EXPENSE", "#f59e0b", userId);
  insert.run(id(), "Salario", "INCOME", "#34d399", userId);
  console.log("[bootstrap] 4 categorías creadas");
}

const budgetCount = db
  .prepare('SELECT count(*) AS c FROM "Budget" WHERE month = ?')
  .get(month).c;

if (budgetCount === 0) {
  const categories = db
    .prepare('SELECT id, name FROM "Category" WHERE type = ?')
    .all("EXPENSE");
  const limits = new Map([
    ["Alimentación", 1200000],
    ["Transporte", 450000],
    ["Hogar", 2300000],
  ]);
  const insert = db.prepare(
    'INSERT INTO "Budget" (id, "categoryId", month, "limitMinor", "userId") VALUES (?, ?, ?, ?, ?)',
  );

  for (const category of categories) {
    const limit = limits.get(category.name);
    if (!limit) continue;
    insert.run(id(), category.id, month, limit, userId);
  }
  console.log(`[bootstrap] presupuestos de ${month} creados`);
}

console.log("[bootstrap] listo");
db.close();
