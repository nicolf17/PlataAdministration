// Token de sesión: firma HMAC-SHA256 con WebCrypto (disponible en Edge y Node).
// Formato: "<payload>.<firma>" donde payload = base64(JSON { userId, exp }).

const SESSION_SECRET = process.env.SESSION_SECRET ?? "plata-dev-secret-change-me";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

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
    new TextEncoder().encode(SESSION_SECRET),
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

export async function createSessionToken(userId: string): Promise<string> {
  const payload = toBase64Url(JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; exp: number } | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload)) as { userId?: string; exp?: number };
    if (!data.userId || !data.exp) return null;
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, exp: data.exp };
  } catch {
    return null;
  }
}
