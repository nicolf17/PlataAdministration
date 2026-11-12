import { writeFile } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";

// Ruta dentro del volumen montado en Fly: /data/backups/
const BACKUP_DIR = "/data/backups";
const RETENTION_DAYS = 7;

/** Ejecutar una vez al día: hacer copia de la BD y borrar las viejas. */
export async function dailyBackup(db: any) {
  // Asegurar que el directorio existe.
  try {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
  } catch {
    // Si falla el mkdir (permissions, etc.), silenciamos y seguimos.
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateKey = `${yyyy}-${mm}-${dd}`;
  const backupPath = path.join(BACKUP_DIR, `plata-${dateKey}.db`);

  try {
    // better-sqlite3 tiene un método .backup() que copia la base de datos.
    // La ruta destino debe terminar en .db para que sea una copia completa.
    db.backup(backupPath);

    // Limpiar copias antiguas (> RETENTION_DAYS).
    await cleanOldBackups();

    return { ok: true, path: backupPath, date: dateKey };
  } catch (e) {
    console.error("Backup diario falló:", e);
    return { ok: false, error: (e as Error).message };
  }
}

async function cleanOldBackups(): Promise<void> {
  // Leer el directorio y borrar archivos más viejos que RETENTION_DAYS.
  let files: Array<{ name: string; date: string; size: number }> = [];

  try {
    const entries = await fs.promises.readdir(BACKUP_DIR);

    for (const name of entries) {
      if (!name.startsWith("plata-") || !name.endsWith(".db")) continue;
      const stat = await fs.promises.stat(path.join(BACKUP_DIR, name));
      const ageDays = (Date.now() - Number(stat.mtime)) / (1000 * 60 * 60 * 24);
      if (ageDays > RETENTION_DAYS) {
        await fs.promises.unlink(path.join(BACKUP_DIR, name));
      }
    }
  } catch {
    // Si el directorio no existe o no hay permisos, ignorar.
  }
}

/** Obtener la lista de backups disponibles para descarga. */
export async function listBackups(): Promise<Array<{ name: string; date: string; size: number }>> {
  let files: Array<{ name: string; date: string; size: number }> = [];

  try {
    const entries = await fs.promises.readdir(BACKUP_DIR);

    for (const name of entries) {
      if (!name.startsWith("plata-") || !name.endsWith(".db")) continue;
      const stat = await fs.promises.stat(path.join(BACKUP_DIR, name));
      const date = new Date(stat.mtime);
      files.push({
        name,
        date: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`,
        size: stat.size,
      });
    }
  } catch {
    // Silencioso.
  }

  // Devolver ordenadas de la más nueva a la más vieja.
  return files
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((f) => ({ name: f.name, date: f.date, size: f.size }));
}