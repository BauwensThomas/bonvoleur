import * as Sentry from "@sentry/nextjs";

// Voir src/app/sentry-example-page/page.tsx - a supprimer avec cette page
// une fois la capture d'erreur confirmee dans Sentry.
//
// wrapRouteHandlerWithSentry est necessaire ici : withSentryConfig
// n'instrumente automatiquement les Route Handlers que via un loader
// webpack - ce site tourne sur Turbopack (next build --turbopack), qui ne
// declenche jamais cette instrumentation automatique. Sans ce wrapper
// manuel, une erreur non interceptee dans une route API n'arrive jamais
// dans Sentry, meme avec onRequestError (qui ne couvre que Server
// Components/middleware/proxies, pas les Route Handlers).
export const GET = Sentry.wrapRouteHandlerWithSentry(
  async () => {
    throw new Error("Erreur de test Sentry (côté serveur)");
  },
  { method: "GET", parameterizedRoute: "/api/sentry-example-api" }
);
