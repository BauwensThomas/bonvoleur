// Voir src/app/sentry-example-page/page.tsx - a supprimer avec cette page
// une fois la capture d'erreur confirmee dans Sentry.
export async function GET() {
  throw new Error("Erreur de test Sentry (cote serveur)");
}
