import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// Códigos de confirmación de cuenta.
// Se guardan hasheados (HMAC) y con vencimiento corto: si alguien lee la base,
// no puede usar los códigos que están en vuelo.

export const CODE_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_CODE_ATTEMPTS = 5;

const secret = process.env.SESSION_SECRET ?? "plata-dev-secret-change-me";

export function generateVerificationCode(): string {
  // 6 dígitos, siempre con ceros a la izquierda.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashVerificationCode(email: string, code: string): string {
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export function verificationCodeMatches(email: string, code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashVerificationCode(email, code), "hex");
  const target = Buffer.from(storedHash, "hex");
  if (candidate.length !== target.length || target.length === 0) return false;
  return timingSafeEqual(candidate, target);
}

export function codeExpiresAt(now = Date.now()): Date {
  return new Date(now + CODE_TTL_MINUTES * 60 * 1000);
}
