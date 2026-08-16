import * as Sentry from "@sentry/nextjs";

// Voir src/app/sentry-example-page/page.tsx - a supprimer avec cette page
// une fois la capture d'erreur confirmee dans Sentry.
//
// PAS de wrapRouteHandlerWithSentry ici : confirme en logs Vercel (vercel
// logs -x) que ce wrapper casse la resolution du client dans ce contexte -
// Sentry.getClient() renvoie undefined DEDANS le wrapper (client found:
// false), alors qu'un handler simple sans wrapper le trouve correctement
// (comme en local avant l'ajout du wrapper). Capture + flush manuels
// suffisent pour ce test - a garder en tete pour toute route API critique
// future : ne pas se fier a wrapRouteHandlerWithSentry pour la capture
// reelle, verifier Sentry.getClient() en cas de doute.
export async function GET() {
  const err = new Error("Erreur de test Sentry (côté serveur)");
  const client = Sentry.getClient();
  console.log("[sentry-diag] client found:", Boolean(client));
  Sentry.captureException(err);
  const flushed = await Sentry.flush(8000);
  console.log("[sentry-diag] flush() result:", flushed);
  throw err;
}
