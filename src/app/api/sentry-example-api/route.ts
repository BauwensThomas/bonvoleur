import * as Sentry from "@sentry/nextjs";

// Voir src/app/sentry-example-page/page.tsx - a supprimer avec cette page
// une fois la capture d'erreur confirmee dans Sentry.
//
// La vraie cause de "client found: false" partout etait ailleurs
// (instrumentation.ts au mauvais endroit, voir src/instrumentation.ts) -
// pas wrapRouteHandlerWithSentry, qui n'y etait pour rien. Handler simple
// gardee ici pour l'instant, a re-tester avec le wrapper une fois ce fix
// confirme.
export async function GET() {
  const err = new Error("Erreur de test Sentry (côté serveur)");
  const client = Sentry.getClient();
  console.log("[sentry-diag] client found:", Boolean(client));
  Sentry.captureException(err);
  const flushed = await Sentry.flush(8000);
  console.log("[sentry-diag] flush() result:", flushed);
  throw err;
}
