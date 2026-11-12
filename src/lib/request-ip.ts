import { headers } from "next/headers";

/**
 * IP del cliente para limitar por origen.
 *
 * Fly pone `fly-client-ip` con la IP real del visitante, ya sin proxies de por
 * medio. `x-forwarded-for` queda como respaldo para correr fuera de Fly.
 * Si no hay ninguno, se usa "local" (todo comparte el mismo cubo).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fly = h.get("fly-client-ip");
  if (fly) return fly;

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "local";
}
