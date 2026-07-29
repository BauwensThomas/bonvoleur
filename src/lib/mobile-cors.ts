import { NextResponse } from "next/server";

// CORS permissif pour les routes /api/mobile/* et /api/push/*. Nécessaire
// pour tester l'app via l'aperçu web Expo (React Native Web tourne dans un
// vrai navigateur, donc soumis au CORS - contrairement à l'app native finale
// où fetch() n'est pas concerné par le CORS du tout). Sans authentification
// par cookie ici (jeton bearer explicite), un CORS ouvert n'expose rien : une
// origine tierce ne peut pas "voler" une session, elle devrait déjà avoir le
// jeton en main.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// À exporter comme `export const OPTIONS = corsPreflight;` dans chaque route
// mobile pour répondre aux requêtes de pré-vérification CORS du navigateur.
export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
