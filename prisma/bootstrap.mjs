/**
 * Crea la base mínima para una instalación nueva: 2 cuentas, 3 categorías de
 * gasto, 1 de ingreso y 3 presupuestos del mes actual.
 *
 * Es idempotente y NO crea movimientos: si ya hay datos, no toca nada.
 *
 * Uso: node prisma/bootstrap.mjs
 */

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const file = url.startsWith("file:") ? url.slice(5) : url;
const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

const id = () => randomUUID();
const now = new Date();
const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

const accountCount = db.prepare('SELECT count(*) AS c FROM "Account"').get().c;
if (accountCount === 0) {
  const insert = db.prepare(
    'INSERT INTO "Account" (id, name, type, initialBalanceMinor) VALUES (?, ?, ?, ?)',
  );
  insert.run(id(), "Efectivo", "CASH", 0);
  insert.run(id(), "Cuenta de ahorros", "SAVINGS", 0);
  console.log("[bootstrap] 2 cuentas creadas");
}

const cardCount = db.prepare('SELECT count(*) AS c FROM "CreditCard"').get().c;
if (cardCount === 0) {
  db.prepare(
    'INSERT INTO "CreditCard" (id, name, limitMinor, closingDay, dueDay) VALUES (?, ?, ?, ?, ?)',
  ).run(id(), "Tarjeta de crédito", 5_000_000, 25, 10);
  console.log("[bootstrap] 1 tarjeta creada");
}

const categoryCount = db.prepare('SELECT count(*) AS c FROM "Category"').get().c;
if (categoryCount === 0) {
  const insert = db.prepare(
    'INSERT INTO "Category" (id, name, type, color) VALUES (?, ?, ?, ?)',
  );
  insert.run(id(), "Alimentación", "EXPENSE", "#34d399");
  insert.run(id(), "Transporte", "EXPENSE", "#60a5fa");
  insert.run(id(), "Hogar", "EXPENSE", "#f59e0b");
  insert.run(id(), "Salario", "INCOME", "#34d399");
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
    ["Alimentación", 1_200_000],
    ["Transporte", 450_000],
    ["Hogar", 2_300_000],
  ]);
  const insert = db.prepare(
    'INSERT INTO "Budget" (id, categoryId, month, limitMinor) VALUES (?, ?, ?, ?)',
  );

  for (const category of categories) {
    const limit = limits.get(category.name);
    if (!limit) continue;
    insert.run(id(), category.id, month, limit);
  }
  console.log(`[bootstrap] presupuestos de ${month} creados`);
}

console.log("[bootstrap] listo");
db.close();
