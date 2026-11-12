import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session-token";

export { SESSION_COOKIE };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const target = Buffer.from(hash, "hex");
  return candidate.length === target.length && timingSafeEqual(candidate, target);
}

export async function createSession(userId: string, sid: string): Promise<void> {
  const token = await createSessionToken(userId, sid);
  await prisma.session.create({
    data: { sid, userId, expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) },
  });
  // Setea la cookie de sesión (httpOnly) para que la request actual quede autenticada.
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(process.env.NODE_ENV === "production"),
  );
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Se lee el token firmado de las cookies de la request actual.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  // La sesión tiene que existir en BD: así el logout revoca de verdad y un
  // token robado deja de servir en cuanto se cierra sesión.
  const row = await prisma.session.findUnique({
    where: { sid: session.sid },
    select: { expiresAt: true },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  // Extender vencimiento si le quedan < 25 días (sliding session).
  if (session.exp - Date.now() < 25 * 24 * 60 * 60 * 1000) {
    await prisma.session.update({
      where: { sid: session.sid },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) },
    });
  }
  return { id: user.id, email: user.email, name: user.name };
}

export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  // `redirect` lanza una excepción que Next convierte en 307 hacia /login,
  // tanto en server components como en server actions.
  if (!user) redirect("/login");
  return user.id;
}

export async function clearSession(): Promise<void> {
  // 1. Borrar la fila de Session en BD (revocar sesión permanente).
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.sid) {
      await prisma.session.delete({ where: { sid: session.sid } }).catch(() => {
        // Ignorar si ya fue borrado.
      });
    }
  }
  // 2. Borrar la cookie.
  cookieStore.delete(SESSION_COOKIE);
}