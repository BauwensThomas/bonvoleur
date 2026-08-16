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
//
// Flush explicite AVANT de throw : vercelWaitUntil() (@sentry/core) ne
// fait quoi que ce soit que pour le runtime Edge - pour une fonction
// Node.js classique (notre cas), Sentry compte sur le fait que Node
// attend la fin de toutes les promesses avant de geler la fonction, ce
// qui n'est pas fiable en pratique sur l'infra serverless Vercel reelle
// (fonctionnait en local, jamais en prod - le process local ne se gele
// jamais). Attendre le flush explicitement dans le handler lui-meme
// garantit l'envoi avant que la reponse ne parte.
// Diagnostic confirme (logs Vercel, vercel logs -x) : Sentry.flush()
// renvoyait false EN 0ms - pas un timeout reseau, `currentScopes.getClient()`
// (@sentry/core) ne trouvait tout simplement AUCUN client dans ce contexte
// precis (source exacte : node_modules/@sentry/core/.../exports.js, flush()
// renvoie Promise.resolve(false) immediatement si client est undefined).
// Fix : recuperer le client explicitement (Sentry.getClient()) et appeler
// .flush() dessus directement, plutot que de compter sur la resolution
// ambiante de scope (fragile dans le contexte imbrique cree par
// wrapRouteHandlerWithSentry).
export const GET = Sentry.wrapRouteHandlerWithSentry(
  async () => {
    const err = new Error("Erreur de test Sentry (côté serveur)");
    const client = Sentry.getClient();
    console.log("[sentry-diag] client found:", Boolean(client));
    const eventId = Sentry.captureException(err);
    console.log("[sentry-diag] captureException eventId:", eventId);
    const start = Date.now();
    const flushed = client ? await client.flush(8000) : false;
    console.log("[sentry-diag] client.flush() result:", flushed, "elapsed ms:", Date.now() - start);
    throw err;
  },
  { method: "GET", parameterizedRoute: "/api/sentry-example-api" }
);
