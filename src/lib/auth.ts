import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSessionToken, verifySessionToken } from "@/lib/session-token";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export const SESSION_COOKIE = "plata_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

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

export async function createSession(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.session.create({
    data: { tokenHash, userId, expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) },
  });
  // Setea la cookie de sesión (httpOnly) para que la request actual quede autenticada.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Se lee el token firmado de las cookies de la request actual.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function hashPasswordAndUser(
  name: string,
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string }> {
  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  return { id: user.id, email: user.email, name: user.name };
}
