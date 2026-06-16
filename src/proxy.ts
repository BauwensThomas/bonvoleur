import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE = "bv_admin";
const GATE_COOKIE = "bv_gate";

function expectedToken(): string {
  return process.env.ADMIN_TOKEN ?? "dev-admin-token-change-me";
}

// Mot de passe d'acces au site (pre-lancement). Si vide/non defini : site ouvert.
function gatePassword(): string {
  return process.env.SITE_GATE_PASSWORD ?? "";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Verrou pre-lancement : tant que SITE_GATE_PASSWORD est defini, tout le
  //    site exige le mot de passe (sauf la page/API de deverrouillage).
  //    Pour ouvrir le site : retirer la variable d'environnement.
  const gatePass = gatePassword();
  if (gatePass) {
    const isGatePath = pathname === "/acces" || pathname === "/api/acces";
    const hasGate = req.cookies.get(GATE_COOKIE)?.value === gatePass;
    if (!isGatePath && !hasGate) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Acces restreint" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/acces";
      return NextResponse.redirect(url);
    }
  }

  // 2) Protection du back-office /admin/** et /api/admin/** (sauf login).
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isLogin =
      pathname === "/admin/login" || pathname === "/api/admin/login";
    if (isLogin) return NextResponse.next();

    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (token === expectedToken()) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Tout le site, sauf les assets internes et les fichiers SEO publics.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
