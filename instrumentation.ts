import * as Sentry from "@sentry/nextjs";

export async function register() {
  console.log("[sentry-diag] instrumentation register() called, NEXT_RUNTIME:", process.env.NEXT_RUNTIME);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    console.log("[sentry-diag] sentry.server.config imported, client after import:", Boolean(Sentry.getClient()));
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Sans le plugin webpack withSentryConfig (absent de next.config.ts, voir
// instrumentation-client.ts), Next.js n'envoie jamais les erreurs non
// interceptees d'une route/page a Sentry de lui-meme - ce hook officiel
// remplace exactement ce que withSentryConfig aurait fait automatiquement.
export const onRequestError = Sentry.captureRequestError;
