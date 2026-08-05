// Détection d'opportunités SEO à partir des données historisées Search
// Console (seo_gsc_daily). Étape 3 du plan (voir SEO-AUTOMATION.md) : ceci ne
// fait QUE détecter/segmenter, ça n'écrit rien - les candidats détectés sont
// destinés à alimenter un agent qui génère de vraies propositions (étape 4,
// table seo_suggestions), pas encore branché.
//
// L'indexation ("pages découvertes mais pas indexées") n'est PAS couverte ici
// : ça nécessite l'API URL Inspection (par URL, quotas serrés), un mécanisme
// différent de searchAnalytics - prévu comme une brique séparée plus tard.
import "server-only";

import { getAll } from "./db";

export type PageType =
  | "home"
  | "destination"
  | "destination-listing"
  | "blog-article"
  | "blog-listing"
  | "other";

// Dernier segment du chemin d'une URL de page - correspond au `slug` en base
// (posts.slug, routes.slug) pour la plupart des pages de ce site.
export function pageSlug(pageUrl: string): string {
  try {
    return new URL(pageUrl).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
}

export function classifyPage(pageUrl: string): PageType {
  let path: string;
  try {
    path = new URL(pageUrl).pathname;
  } catch {
    return "other";
  }
  if (path === "/") return "home";
  if (path === "/vols-pas-chers") return "destination-listing";
  if (path.startsWith("/vols-pas-chers/")) return "destination";
  if (path === "/blog") return "blog-listing";
  if (path.startsWith("/blog/")) return "blog-article";
  return "other";
}

interface Agg {
  clicks: number;
  impressions: number;
  positionWeighted: number; // somme(position * impressions), pour la moyenne pondérée
}

function emptyAgg(): Agg {
  return { clicks: 0, impressions: 0, positionWeighted: 0 };
}

function avgPosition(a: Agg): number {
  return a.impressions > 0 ? a.positionWeighted / a.impressions : 0;
}

function ctr(a: Agg): number {
  return a.impressions > 0 ? a.clicks / a.impressions : 0;
}

// CTR "attendu" grossier par tranche de position - sert juste à repérer un
// écart net (titre/meta peu engageants), pas une vérité statistique absolue.
function expectedCtr(position: number): number {
  if (position <= 3) return 0.15;
  if (position <= 10) return 0.05;
  return 0.02;
}

export interface OpportunityBase {
  page: string;
  pageType: PageType;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PositionOpportunity extends OpportunityBase {
  type: "position_opportunity"; // position 8-20 : gain rapide possible
}
export interface LowCtrOpportunity extends OpportunityBase {
  type: "low_ctr"; // beaucoup d'impressions, peu de clics vs attendu à cette position
  expectedCtr: number;
}
export interface RegressionOpportunity {
  type: "regression";
  page: string;
  pageType: PageType;
  clicksCurrent: number;
  clicksPrevious: number;
  dropPct: number; // 0-1
}

export type Opportunity = PositionOpportunity | LowCtrOpportunity | RegressionOpportunity;

const MIN_IMPRESSIONS_POSITION = 5;
const MIN_IMPRESSIONS_CTR = 20;
const CTR_RATIO_THRESHOLD = 0.5; // ctr réel < 50% du ctr attendu -> signalé
const MIN_CLICKS_FOR_REGRESSION = 5;
const REGRESSION_DROP_THRESHOLD = 0.3; // -30% ou pire

export interface DetectOptions {
  windowDays?: number; // fenêtre d'analyse position/CTR (par défaut 28j)
  regressionWindowDays?: number; // taille de chaque période comparée (par défaut 7j)
}

export async function detectSeoOpportunities(opts: DetectOptions = {}): Promise<Opportunity[]> {
  const windowDays = opts.windowDays ?? 28;
  const regressionWindowDays = opts.regressionWindowDays ?? 7;

  const rows = await getAll("seo_gsc_daily");
  if (rows.length === 0) return [];

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // --- Position 8-20 + CTR faible : agrégation par (page, query) sur la fenêtre ---
  const byPageQuery = new Map<string, Agg>();
  for (const r of rows) {
    if (r.date < cutoffStr) continue;
    const key = `${r.page}||${r.query}`;
    const agg = byPageQuery.get(key) ?? emptyAgg();
    agg.clicks += r.clicks;
    agg.impressions += r.impressions;
    agg.positionWeighted += r.position * r.impressions;
    byPageQuery.set(key, agg);
  }

  const opportunities: Opportunity[] = [];
  for (const [key, agg] of byPageQuery) {
    const [page, query] = key.split("||");
    const pos = avgPosition(agg);
    const rate = ctr(agg);

    if (agg.impressions >= MIN_IMPRESSIONS_POSITION && pos >= 8 && pos <= 20) {
      opportunities.push({
        type: "position_opportunity",
        page,
        pageType: classifyPage(page),
        query,
        clicks: agg.clicks,
        impressions: agg.impressions,
        ctr: rate,
        position: pos,
      });
    }

    if (agg.impressions >= MIN_IMPRESSIONS_CTR) {
      const expected = expectedCtr(pos);
      if (rate < expected * CTR_RATIO_THRESHOLD) {
        opportunities.push({
          type: "low_ctr",
          page,
          pageType: classifyPage(page),
          query,
          clicks: agg.clicks,
          impressions: agg.impressions,
          ctr: rate,
          position: pos,
          expectedCtr: expected,
        });
      }
    }
  }

  // --- Régression semaine sur semaine : agrégation par page (toutes requêtes) ---
  const currentStart = new Date(today);
  currentStart.setUTCDate(currentStart.getUTCDate() - regressionWindowDays);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - regressionWindowDays);
  const currentStartStr = currentStart.toISOString().slice(0, 10);
  const previousStartStr = previousStart.toISOString().slice(0, 10);

  const clicksByPage = new Map<string, { current: number; previous: number }>();
  for (const r of rows) {
    if (r.date < previousStartStr) continue;
    const bucket = clicksByPage.get(r.page) ?? { current: 0, previous: 0 };
    if (r.date >= currentStartStr) bucket.current += r.clicks;
    else bucket.previous += r.clicks;
    clicksByPage.set(r.page, bucket);
  }

  for (const [page, { current, previous }] of clicksByPage) {
    if (previous < MIN_CLICKS_FOR_REGRESSION) continue;
    const drop = (previous - current) / previous;
    if (drop >= REGRESSION_DROP_THRESHOLD) {
      opportunities.push({
        type: "regression",
        page,
        pageType: classifyPage(page),
        clicksCurrent: current,
        clicksPrevious: previous,
        dropPct: drop,
      });
    }
  }

  return opportunities;
}

// Regroupe les opportunités par type de page - pour un rapport qui distingue
// contenu éditorial / pages commerciales / structure technique (demandé dans
// le prompt d'origine).
export function groupByPageType(opps: Opportunity[]): Record<PageType, Opportunity[]> {
  const result: Record<PageType, Opportunity[]> = {
    home: [],
    destination: [],
    "destination-listing": [],
    "blog-article": [],
    "blog-listing": [],
    other: [],
  };
  for (const o of opps) result[o.pageType].push(o);
  return result;
}
