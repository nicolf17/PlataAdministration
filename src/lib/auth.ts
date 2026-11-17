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
  onboardingCompleted: boolean;
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
  try {
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
    // Retornar datos básicos del usuario incluyendo estado de onboarding
    return { id: user.id, email: user.email, name: user.name, onboardingCompleted: user.onboardingCompleted };
  } catch (error) {
    // Si la base o el secreto de sesión no están disponibles, tratamos la
    // request como "sin sesión" en vez de tumbar el render con un 500. El
    // middleware y `requireUserId` se encargan de mandar a /login.
    console.error("[plata] getSessionUser falló:", error);
    return null;
  }
}

export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  // `redirect` lanza una excepción que Next convierte en 307 hacia /login,
  // tanto en server components como en server actions.
  if (!user) redirect("/login");
  return user.id;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  try {
    // 1. Borrar la fila de Session en BD (revocar sesión permanente).
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await verifySessionToken(token);
      if (session?.sid) {
        await prisma.session.delete({ where: { sid: session.sid } }).catch(() => {
          // Ignorar si ya fue borrado.
        });
      }
    }
  } catch (error) {
    // Si la base no responde, igual cerramos sesión en el navegador: la cookie
    // es lo que bloquea el acceso, y la fila huérfana vence sola.
    console.error("[plata] clearSession no pudo revocar en BD:", error);
  }
  // 2. Borrar la cookie.
  cookieStore.delete(SESSION_COOKIE);
}