import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
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
