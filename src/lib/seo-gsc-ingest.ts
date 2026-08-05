// Ingestion périodique des données Google Search Console dans seo_gsc_daily.
// Voir SEO-AUTOMATION.md.
import "server-only";

import { createHash } from "node:crypto";
import { querySearchAnalytics } from "./gsc";
import { upsertMany } from "./db";
import type { SeoGscDaily } from "./types";

const SITE = "bonvoleur.com";
const GSC_SITE_URL = "sc-domain:bonvoleur.com";

// GSC met généralement 2-3 jours avant d'avoir des données stabilisées, et les
// derniers jours peuvent encore être révisés après coup. On re-demande donc
// une fenêtre de quelques jours à chaque run (pas juste "hier") - l'upsert sur
// un id déterministe garantit qu'on met à jour la même ligne, jamais de doublon.
const LAG_DAYS = 2;
const REINGEST_WINDOW_DAYS = 3;

function rowId(site: string, date: string, page: string, query: string): string {
  return createHash("sha256").update(`${site}|${date}|${page}|${query}`).digest("hex");
}

export interface IngestResult {
  rows: number;
  startDate: string;
  endDate: string;
}

export async function ingestGscDaily(): Promise<IngestResult> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - REINGEST_WINDOW_DAYS);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const startDate = iso(start);
  const endDate = iso(end);

  const raw = await querySearchAnalytics({
    siteUrl: GSC_SITE_URL,
    startDate,
    endDate,
    dimensions: ["date", "page", "query"],
  });

  const now = new Date().toISOString();
  const rows: SeoGscDaily[] = raw.map((r) => {
    const [date, page, query] = r.keys;
    return {
      id: rowId(SITE, date, page, query),
      site: SITE,
      date,
      page,
      query,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      fetched_at: now,
    };
  });

  await upsertMany("seo_gsc_daily", rows);
  return { rows: rows.length, startDate, endDate };
}
