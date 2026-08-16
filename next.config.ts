import type { NextConfig } from "next";

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
