// Vérifie le statut d'indexation Google de chaque page réelle du site (API
// URL Inspection) - signal DIFFÉRENT de searchAnalytics : une page peut être
// invisible dans les résultats Google (jamais indexée) même avec un
// titre/contenu parfaits. Voir SEO-AUTOMATION.md.
import "server-only";

import { createHash } from "node:crypto";
import sitemap from "@/app/sitemap";
import { inspectUrl } from "./gsc";
import { upsertMany } from "./db";
import { sendEmail } from "./email";
import { seoIndexationAlertEmail } from "./email-templates";
import type { SeoIndexation } from "./types";

const GSC_SITE_URL = "sc-domain:bonvoleur.com";

// ~145 pages en séquentiel (même avec une petite pause) a dépassé la limite
// de temps de la fonction Vercel en conditions réelles (2026-08-05) - traite
// par lots en parallèle à la place. Largement sous le quota Google (2000/j).
const CONCURRENCY = 12;

export interface IndexationResult {
  checked: number;
  notIndexed: { page: string; coverageState: string | null }[];
}

export async function checkAllPagesIndexation(): Promise<IndexationResult> {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url).filter(Boolean);

  const rows: SeoIndexation[] = [];
  const notIndexed: { page: string; coverageState: string | null }[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((page) => inspectUrl(GSC_SITE_URL, page)));
    batch.forEach((page, j) => {
      const result = results[j];
      if (!result) return; // échec de l'appel - on ne perd pas le run entier pour une page
      const id = createHash("sha256").update(page).digest("hex");
      rows.push({ id, page, verdict: result.verdict, coverage_state: result.coverageState, checked_at: now });
      if (result.verdict !== "PASS") {
        notIndexed.push({ page, coverageState: result.coverageState });
      }
    });
  }

  await upsertMany("seo_indexation", rows);

  if (notIndexed.length > 0) {
    await sendEmail(seoIndexationAlertEmail(notIndexed));
  }

  return { checked: rows.length, notIndexed };
}
