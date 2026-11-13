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

  let response: NextResponse;

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    response = NextResponse.redirect(url);
  } else {
    // Ojo: acá NO se redirige /login → / aunque el token esté firmado. El
    // middleware solo puede verificar la firma; la sesión real vive en la base
    // (tabla Session) y la chequea el servidor. Si el token sobrevive a la fila
    // (logout en otra pestaña, sesión revocada), redirigir desde acá produce un
    // bucle /login → / → /login y la pantalla de login nunca se renderiza.
    // Esa decisión la toma la propia página /login con getSessionUser().
    response = NextResponse.next();
  }

  // Sesión deslizante: si la persona sigue usando la app, el token se renueva.
  // Se hace acá (Edge) porque es donde se pueden escribir cookies en cada request.
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

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
