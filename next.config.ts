import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' va.vercel-scripts.com emrldtp.com *.emrldtp.com",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com emrldtp.com *.emrldtp.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: blob: *.supabase.co *.brandfetch.io *.bing.com *.bing.net th.bing.com *.avs.io *.travelpayouts.com *.unsplash.com play.google.com",
      // blob: requis pour Three.js (textures GLB chargées via createObjectURL)
      // Les evenements Sentry passent par notre propre tunnel same-origin
      // (/api/sentry-tunnel, voir instrumentation-client.ts) - *.sentry.io
      // reste autorise en secours (session replay, cas non tunnellises).
      "connect-src 'self' blob: *.supabase.co va.vercel-scripts.com emrldtp.com *.emrldtp.com *.travelpayouts.com tp.media *.sentry.io *.ingest.de.sentry.io",
      // worker-src blob: pour le décodeur Draco de GLTFLoader (Three.js)
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    // Egress Supabase (2026-08-27) : les photos de destinations/articles
    // etaient jusqu'ici des hotlinks directs (<img>/background-image) vers
    // Supabase Storage - chaque visite re-telechargeait l'original depuis
    // Supabase, sans aucune couche de cache partagee entre visiteurs. En
    // passant par next/image, Vercel ne va chercher l'original qu'UNE FOIS
    // par taille/format puis sert son propre cache CDN a tout le monde
    // ensuite - gratuit (inclus dans le plan Vercel existant), egress
    // Supabase quasi supprime pour ces images.
    remotePatterns: [
      { protocol: "https", hostname: "hdzzfhjnjcblcejcpnkw.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// withSentryConfig instrumente automatiquement les Route Handlers (route.ts)
// pour capturer leurs erreurs non interceptees - onRequestError seul
// (instrumentation.ts) ne couvre que Server Components/middleware/proxies,
// pas les routes API (verifie via /api/sentry-example-api : l'erreur
// n'arrivait jamais dans Sentry sans ce wrapper). Pas de authToken/upload
// de source maps pour l'instant (pas indispensable, juste des stack traces
// moins lisibles) - tunnelRoute pas utilise, on garde le tunnel manuel deja
// en place et fonctionnel (/api/sentry-tunnel, voir instrumentation-client.ts).
export default withSentryConfig(nextConfig, {
  org: "bonvoleur",
  project: "javascript-nextjs",
  silent: true,
});
