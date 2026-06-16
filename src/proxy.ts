import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE = "bv_admin";

function expectedToken(): string {
  return process.env.ADMIN_TOKEN ?? "dev-admin-token-change-me";
}

// Protège /admin/** et /api/admin/** (sauf la page et l'API de login).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLogin =
    pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isLogin) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token === expectedToken()) return NextResponse.next();

  // API : refuser en JSON. Pages : rediriger vers le login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
