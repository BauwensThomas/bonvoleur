import * as Sentry from "@sentry/nextjs";

// A la racine de src/ (pas a la racine du projet) : la doc Next.js exige
// que instrumentation.ts vive dans src/ des qu'un dossier src/ est utilise
// (ce projet en a un partout, src/app/...) - jamais remarque avant, ce
// fichier etait reste a la racine du projet depuis sa creation. register()
// ne s'executait donc JAMAIS, confirme par l'absence totale du log
// "[sentry-diag] instrumentation register() called" dans les logs Vercel
// malgre plusieurs vraies requetes - Sentry.init() (sentry.server.config.ts)
// n'etait donc jamais appele cote serveur, d'ou Sentry.getClient() renvoyant
// systematiquement undefined pour toute route API. sentry.server.config.ts/
// sentry.edge.config.ts restent a la racine du PROJET (meme convention que
// instrumentation-client.ts, qui lui fonctionnait deja correctement a cet
// emplacement) - d'ou le "../" dans les imports ci-dessous.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// withSentryConfig n'instrumente automatiquement les Route Handlers que via
// un loader webpack (ce site tourne sur Turbopack) - ce hook capture au
// moins les erreurs de Server Components/middleware/proxies.
export const onRequestError = Sentry.captureRequestError;
