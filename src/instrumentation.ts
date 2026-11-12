/**
 * Se ejecuta una vez al arrancar el servidor. Lo usamos para programar la copia
 * de seguridad diaria. Solo en producción: en desarrollo no queremos escribir
 * en /data ni ensuciar la consola.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { startDailyBackup } = await import("@/lib/backup-scheduler");
  startDailyBackup();
}
