import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_COOKIE = "bv_admin";
const GATE_COOKIE = "bv_gate";

function expectedToken(): string {
  return process.env.ADMIN_TOKEN ?? "dev-admin-token-change-me";
}

// Mot de passe d'acces au site (pre-lancement). Si vide/non defini : site ouvert.
function gatePassword(): string {
  return process.env.SITE_GATE_PASSWORD ?? "";
}

function maintenanceEnabled(): boolean {
  return process.env.SITE_MAINTENANCE_ENABLED?.trim().toLowerCase() === "true";
}

function maintenanceUntil(): number | null {
  const value = process.env.SITE_MAINTENANCE_UNTIL;
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Coupure temporaire sans appel Supabase : la page reste accessible meme
  // lorsque le projet a atteint sa limite d'egress.
  const until = maintenanceUntil();
  const maintenanceActive =
    maintenanceEnabled() && (until === null || Date.now() < until);
  const isMaintenanceAsset = pathname === "/logo.svg";
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAdminLogin =
    pathname === "/admin/login" || pathname === "/api/admin/login";
  const adminToken = req.cookies.get(ADMIN_COOKIE)?.value;
  const adminBearer = req.headers.get("authorization") === `Bearer ${expectedToken()}`;
  const isAuthenticatedAdmin = adminToken === expectedToken() || adminBearer;
  const isMaintenanceOperationalRoute =
    pathname === "/api/billing/webhook" ||
    pathname === "/api/maintenance/status" ||
    isAdminLogin ||
    (isAdminPath && isAuthenticatedAdmin);
  if (
    maintenanceActive &&
    !isMaintenanceAsset &&
    !isMaintenanceOperationalRoute &&
    pathname !== "/maintenance"
  ) {
    if (isAdminPath && !isAdminLogin && !isAuthenticatedAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url, 307);
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Service temporairement indisponible" },
        { status: 503, headers: { "Retry-After": "86400" } }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url, 307);
  }

  if (
    pathname.startsWith("/api/cron/") ||
    pathname === "/api/ingest/deal" ||
    pathname === "/api/billing/webhook" ||
    pathname === "/api/maintenance/status"
  ) {
    return NextResponse.next();
  }

  // 1) Verrou pre-lancement : tant que SITE_GATE_PASSWORD est defini, tout le
  //    site exige le mot de passe (sauf la page/API de deverrouillage et les
  //    routes d'auth, pour ne pas casser le retour de connexion OAuth).
  //    Pour ouvrir le site : retirer la variable d'environnement.
  const gatePass = gatePassword();
  if (gatePass) {
    const isGatePath =
      pathname === "/acces" ||
      pathname === "/api/acces" ||
      pathname.startsWith("/auth/") ||
      pathname === "/api/billing/webhook"; // appelé par Stripe (hors session)
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

    // Jeton bearer (agents automatisés, ex. content-publisher) - sans ça, le
    // proxy bloque la requête AVANT qu'elle n'atteigne la route, même si
    // celle-ci accepte elle-même le bearer via requireAdmin(req).
    const auth = req.headers.get("authorization");
    if (pathname.startsWith("/api/") && auth === `Bearer ${expectedToken()}`) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // 3) Rafraichit la session abonne (Supabase Auth) et propage les cookies,
  //    pour que l'utilisateur reste connecte sans rouvrir ses emails.
  return await refreshMemberSession(req);
}

// Rafraichissement de session Supabase cote middleware (recommande par
// @supabase/ssr). Si l'auth n'est pas configuree, on laisse passer.
async function refreshMemberSession(req: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() revalide le jeton et declenche le refresh si besoin.
  // Ignorer les erreurs de token expiré/invalide (refresh_token_not_found) :
  // c'est un comportement normal à l'expiration de session.
  try {
    await supabase.auth.getUser();
  } catch (error: any) {
    // Ignorer les erreurs de token expiré - ce n'est pas un problème
    if (error?.code !== "refresh_token_not_found") {
      // Autres erreurs : logger mais ne pas bloquer la requête
      console.error("[proxy] Erreur de session Supabase:", error?.code, error?.message);
    }
  }
  return res;
}

export const config = {
  // Tout le site, sauf les assets internes, les fichiers SEO publics, et les
  // routes /api/mobile|push|cron/** : jeton bearer ou secret partage propre a
  // chaque route, jamais de session cookie - le rafraichissement de session
  // ci-dessus ne leur sert a rien, ne fait que gaspiller un appel Supabase
  // Auth par requete ET empeche ces routes d'etre mises en cache (voir
  // memoire project_conventions_techniques, 2026-08-13).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|api/mobile|api/push).*)",
  ],
};
