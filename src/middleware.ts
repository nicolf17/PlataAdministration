import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  renewSessionToken,
  sessionCookieOptions,
  shouldRenewSession,
  verifySessionToken,
} from "@/lib/session-token";

const PUBLIC_PATHS = ["/login", "/signup", "/api/health", "/manifest.webmanifest", "/sw.js", "/offline.html"];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Inicializamos response con next() por defecto
  let response = NextResponse.next();

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    response = NextResponse.redirect(url);
  } else if (session && !isPublic) {
    // Sesión válida: renovación en Edge sin BD (Prisma)
    // La verificación real de onboardingCompleted se hará en el layout privado
    // (Server Component). Aquí solo renovamos la sesión.
    if (token && session && shouldRenewSession(session.exp)) {
      const renewed = await renewSessionToken(token);
      if (renewed) {
        response.cookies.set(
          SESSION_COOKIE,
          renewed,
          sessionCookieOptions(process.env.NODE_ENV === "production"),
        );
      }
    }
    // response ya es NextResponse.next() por la inicialización
  }
  // Si es ruta pública y hay sesión, o cualquier otro caso, response sigue siendo next()

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};