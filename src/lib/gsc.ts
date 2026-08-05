// Client Google Search Console (compte de service). Voir SEO-AUTOMATION.md
// pour la mise en place (Google Cloud, permissions, format du site).
import "server-only";

import { readFile } from "node:fs/promises";
import { JWT } from "google-auth-library";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

// Prod (Vercel) : contenu JSON complet dans la variable GSC_SERVICE_ACCOUNT_JSON.
// Local : chemin vers le fichier dans GSC_SERVICE_ACCOUNT_KEY_PATH (gitignoré).
async function loadServiceAccount(): Promise<ServiceAccountKey> {
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
  }
  const path = process.env.GSC_SERVICE_ACCOUNT_KEY_PATH;
  if (!path) {
    throw new Error(
      "GSC non configuré : définis GSC_SERVICE_ACCOUNT_JSON (prod) ou GSC_SERVICE_ACCOUNT_KEY_PATH (local)."
    );
  }
  return JSON.parse(await readFile(path, "utf-8"));
}

let cachedAuth: JWT | null = null;
// Scope en écriture (nécessaire pour re-signaler un sitemap) en plus de la
// lecture - un seul JWT couvre les deux, pas besoin de deux clients.
async function getAuth(): Promise<JWT> {
  if (!cachedAuth) {
    const key = await loadServiceAccount();
    cachedAuth = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters"],
    });
  }
  return cachedAuth;
}

// Re-signale un sitemap à Google (accélère la découverte d'une page modifiée)
// - PAS l'API Indexing (réservée aux offres d'emploi/live events par les
// règles Google, l'utiliser pour des pages normales est contre les CGU même
// si ça "marche" en pratique). Best-effort : n'échoue jamais bruyamment,
// une erreur ici ne doit pas empêcher l'application du changement lui-même.
export async function submitSitemap(siteUrl: string, sitemapUrl: string): Promise<boolean> {
  try {
    const auth = await getAuth();
    const { token } = await auth.getAccessToken();
    if (!token) return false;
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export interface GscRow {
  keys: string[]; // valeurs dans l'ordre des `dimensions` demandées
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const ROW_LIMIT = 25000; // plafond de l'API par appel

// Récupère toutes les lignes pour une période/dimension donnée, avec
// pagination automatique (l'API ne renvoie jamais plus de 25000 lignes d'un coup).
export async function querySearchAnalytics(params: {
  siteUrl: string; // "sc-domain:exemple.com" ou "https://www.exemple.com/"
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions?: string[];
}): Promise<GscRow[]> {
  const auth = await getAuth();
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("GSC : impossible d'obtenir un jeton d'accès.");

  const dimensions = params.dimensions ?? ["date", "page", "query"];
  const rows: GscRow[] = [];
  let startRow = 0;
  for (;;) {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: params.startDate,
          endDate: params.endDate,
          dimensions,
          rowLimit: ROW_LIMIT,
          startRow,
        }),
      }
    );
    if (!res.ok) throw new Error(`GSC searchAnalytics ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const batch: GscRow[] = data.rows ?? [];
    rows.push(...batch);
    if (batch.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }
  return rows;
}
