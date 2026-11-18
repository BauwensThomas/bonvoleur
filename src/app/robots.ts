import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Robots d'indexation et robots IA explicitement autorises sur le contenu
// public (recherche et reponses des assistants). Les pages privees (/compte,
// /avis...) sont en `noindex` et NON bloquees ici : un Disallow empecherait
// Google de lire le noindex et pourrait garder l'URL dans l'index.
// Seuls /admin et /api/ (jamais du contenu public) sont fermes.
const PRIVATE_PATHS = ["/admin", "/api/", "/apercu/", "/apercu-admin/"];

const ALLOWED_BOTS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "DuckDuckBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...ALLOWED_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE_PATHS })),
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${site.canonicalBase}/sitemap.xml`,
    host: site.canonicalBase,
  };
}
