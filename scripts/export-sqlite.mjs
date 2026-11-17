/**
 * Exporta los datos de la base SQLite vieja a un JSON intermedio.
 *
 * Se corre UNA vez. Como better-sqlite3 ya no es dependencia del proyecto,
 * hay que instalarlo al vuelo:
 *   npm i --no-save better-sqlite3
 *   node scripts/export-sqlite.mjs
 *
 * El JSON queda en prisma/sqlite-export.json (ignorado por git: tiene datos
 * personales). Después lo importa scripts/import-sqlite-export.ts a Postgres.
 */

import Database from "better-sqlite3";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE = process.env.SQLITE_PATH ?? "prisma/dev.db";
const TARGET = "prisma/sqlite-export.json";

// Orden de inserción: respeta las claves foráneas.
const TABLES = [
  "User",
  "Account",
  "CreditCard",
  "Category",
  "Transaction",
  "Budget",
  "Session",
  "PendingSignup",
  "WebVital",
];

const db = new Database(SOURCE, { readonly: true });
const dump = { source: SOURCE, exportedAt: new Date().toISOString(), tables: {} };

for (const table of TABLES) {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  if (!exists) {
    console.log(`- ${table}: no existe, se omite`);
    continue;
  }
  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  dump.tables[table] = rows;
  console.log(`- ${table}: ${rows.length} filas`);
}

db.close();

await writeFile(path.resolve(TARGET), JSON.stringify(dump, null, 2), "utf8");
console.log(`\nListo: ${TARGET}`);
