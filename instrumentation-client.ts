import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  tunnel: "/api/sentry-tunnel",
  ignoreErrors: [/^Error invoking postMessage: Java object is gone$/],
});
