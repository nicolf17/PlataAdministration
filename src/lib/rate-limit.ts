// Rate limit en memoria con ventana deslizante fija por clave.
//
// Sirve para una sola instancia (el caso de Fly con 1 máquina). Si algún día
// hay varias, esto se reemplaza por un store compartido (Redis), pero mientras
// tanto evita fuerza bruta y abuso básico sin agregar dependencias.
//
// Claves típicas: "login:1.2.3.4", "signup:1.2.3.4", "vitals:1.2.3.4".

type Entry = {
  count: number;
  firstMs: number;
  lastMs: number;
};

export type LimitResult = {
  ok: boolean;
  remaining: number;
  /** Milisegundos que faltan para que se libere la ventana. */
  retryAfterMs: number;
};

const limits = new Map<string, Entry>();

// Tope duro de claves para que un atacante no pueda inflar la memoria
// rotando IPs: si se llena, se descartan las más viejas.
const MAX_KEYS = 10_000;

function prune(now: number): void {
  for (const [key, entry] of limits) {
    // Una entrada se libera cuando su última actividad quedó fuera de la
    // ventana más larga que usamos (1 hora).
    if (now - entry.lastMs > 60 * 60 * 1000) {
      limits.delete(key);
    }
  }

  if (limits.size > MAX_KEYS) {
    const sorted = [...limits.entries()].sort((a, b) => a[1].lastMs - b[1].lastMs);
    const toDrop = limits.size - MAX_KEYS;
    for (let i = 0; i < toDrop; i++) {
      limits.delete(sorted[i][0]);
    }
  }
}

/**
 * Registra un intento para `key`.
 * @param key identificador del cubo (acción + IP, o acción + IP + email)
 * @param max intentos permitidos en la ventana
 * @param windowMs tamaño de la ventana
 */
export function consume(key: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  // Cada tanto se limpia: sin esto el Map crece para siempre.
  if (limits.size > 0 && Math.random() < 0.02) prune(now);

  const entry = limits.get(key);

  if (!entry || now - entry.firstMs > windowMs) {
    limits.set(key, { count: 1, firstMs: now, lastMs: now });
    return { ok: true, remaining: max - 1, retryAfterMs: windowMs };
  }

  entry.count += 1;
  entry.lastMs = now;

  if (entry.count > max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, entry.firstMs + windowMs - now),
    };
  }

  return { ok: true, remaining: max - entry.count, retryAfterMs: 0 };
}

export function reset(key: string): void {
  limits.delete(key);
}

/** "Esperá 3 minutos" a partir de milisegundos. */
export function waitMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return minutes === 1
    ? "Demasiados intentos. Esperá 1 minuto y volvé a probar."
    : `Demasiados intentos. Esperá ${minutes} minutos y volvé a probar.`;
}
