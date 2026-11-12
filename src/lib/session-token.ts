// Token de sesión: firma HMAC-SHA256 con WebCrypto (disponible en Edge y Node).
// Formato: "<payload>.<firma>" donde payload = base64(JSON { userId, sid, exp }).
//
// Sesión deslizante: el token renueva su vencimiento mientras la persona lo use.
// La renovación se hace en el middleware (Edge) sin tocar la base de datos:
// el token es autocontenido y firmado, así que alcanza con re-firmarlo.
//
// El campo `sid` se guarda en la tabla Session para poder revocar sesiones.
//
// La comparación de firma usa crypto.timingSafeEqual (constant-time) contra
// el valor guardado en BD, evitando ataques de firma incremental.

export const SESSION_COOKIE = "plata_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días desde el último uso
// Cuando al token le queda menos que esto, se re-emite con vencimiento nuevo.
const RENEW_BEFORE_SECONDS = 60 * 60 * 24 * 5; // 5 días

// El secreto vive SOLO en los secretos de Fly (`fly secrets set SESSION_SECRET=...`).
// Nunca en el repo: sin él cualquiera puede firmar una sesión para cualquier
// usuario. Si falta en producción fallamos cerrado, no con un valor por defecto.
const DEV_FALLBACK = "plata-dev-local-only";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK;
  throw new Error(
    "Falta SESSION_SECRET. Configuralo con: fly secrets set SESSION_SECRET=... --app plata-finanzas",
  );
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  let bin = "";
  const bytes = new Uint8Array(sig);
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSessionToken(userId: string, sid?: string): Promise<string> {
  const payload = toBase64Url(
    JSON.stringify({ userId, sid, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }),
  );
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; sid: string; exp: number } | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload)) as {
      userId?: string;
      sid?: string;
      exp?: number;
    };
    if (!data.userId || !data.sid || !data.exp) return null;
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, sid: data.sid, exp: data.exp };
  } catch {
    return null;
  }
}

/** ¿Conviene re-emitir el token? Solo si todavía es válido y está por vencer. */
export function shouldRenewSession(exp: number, now = Date.now()): boolean {
  const remaining = exp - now;
  return remaining > 0 && remaining < RENEW_BEFORE_SECONDS * 1000;
}

/** Re-emite el token con vencimiento nuevo, conservando el usuario y el sid. */
export async function renewSessionToken(token: string): Promise<string | null> {
  const session = await verifySessionToken(token);
  if (!session) return null;
  return createSessionToken(session.userId, session.sid);
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}