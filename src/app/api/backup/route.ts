import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dailyBackup, listBackups } from "@/lib/backup";
import { consume } from "@/lib/rate-limit";

// GET /api/backup -> lista los backups disponibles (solo usuario autenticado).
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const backups = await listBackups();
    return NextResponse.json({ backups });
  } catch (e) {
    console.error("Error listing backups:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/backup -> fuerza un backup inmediato (solo usuario autenticado).
// El archivo es uno por día (se sobrescribe), así que el límite es para evitar
// que alguien martille el disco con I/O, no por espacio.
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const limit = consume(`backup:${user.id}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados backups seguidos. Probá más tarde." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
      );
    }

    // DATABASE_URL viene como "file:/data/plata.db"; better-sqlite3 quiere la
    // ruta del sistema de archivos, sin el esquema.
    const rawUrl = process.env.DATABASE_URL ?? "";
    const dbPath = rawUrl.replace(/^file:/, "");
    if (!dbPath) {
      return NextResponse.json({ ok: false, error: "Base de datos no configurada." }, { status: 500 });
    }

    const { default: Database } = await import("better-sqlite3");
    const db = new Database(dbPath);
    const result = await dailyBackup(db as never);
    db.close();

    if (result.ok) {
      // Nunca se expone la ruta absoluta del servidor.
      const name = result.path?.split(/[\\/]/).pop() ?? null;
      return NextResponse.json({ ok: true, name });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  } catch (e) {
    console.error("Error forcing backup:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
