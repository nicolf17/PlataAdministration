import { dailyBackup } from "@/lib/backup";

// Copia de seguridad automática: una por día (el archivo del día se
// sobrescribe) y limpieza de las que tienen más de 7 días.
//
// Corre en el proceso del servidor, sin cron externo ni servicios pagos.
// Con una sola máquina alcanza; si algún día hay varias, cada una escribiría
// el mismo archivo del día (idempotente, pero conviene moverlo a un job).

let started = false;

async function runBackup(): Promise<void> {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const dbPath = rawUrl.replace(/^file:/, "");
  if (!dbPath) return;

  try {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(dbPath);
    const result = await dailyBackup(db);
    db.close();
    if (result.ok) {
      console.log(`[backup] copia diaria lista: ${result.date}`);
    } else {
      console.error("[backup] falló:", result.error);
    }
  } catch (e) {
    console.error("[backup] error inesperado:", e);
  }
}

export function startDailyBackup(): void {
  if (started) return;
  started = true;

  // Primera copia poco después de arrancar, sin retrasar el health check.
  setTimeout(() => void runBackup(), 45_000);
  // Y después cada 6 horas: como el nombre es por día, no se acumulan archivos.
  setInterval(() => void runBackup(), 6 * 60 * 60 * 1000);
}
