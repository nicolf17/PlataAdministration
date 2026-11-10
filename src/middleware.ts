import { NextResponse, type NextRequest } from "next/server";

import { verifySessionToken } from "@/lib/session-token";

const PUBLIC_PATHS = ["/login", "/signup", "/api/health", "/manifest.webmanifest", "/sw.js", "/offline.html"];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("plata_session")?.value;
  const session = token ? await verifySessionToken(token) : null;
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
