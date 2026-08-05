// Backfill UNIQUE : récupère tout l'historique disponible côté Search Console
// (jusqu'à 16 mois, GSC renvoie simplement moins si le site est plus jeune) et
// le charge dans seo_gsc_daily - contrairement à l'ingestion quotidienne
// (fenêtre glissante de 3 jours), à lancer une seule fois pour rattraper le
// retard, puis laisser le cron prendre le relais.
//
// Usage : node scripts/gsc-backfill.mjs [jours]  (défaut 400)

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { JWT } from "google-auth-library";

const env = { ...process.env };
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const keyPath = env.GSC_SERVICE_ACCOUNT_KEY_PATH;
const siteUrl = env.GSC_SITE_URL;
const SB = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!keyPath || !siteUrl || !SB || !KEY) {
  console.error("GSC_SERVICE_ACCOUNT_KEY_PATH / GSC_SITE_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
  process.exit(1);
}
const site = "bonvoleur.com";
const days = Number(process.argv[2] ?? 400);

const key = JSON.parse(await readFile(keyPath, "utf-8"));
const auth = new JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const { token } = await auth.getAccessToken();
if (!token) {
  console.error("Échec : aucun jeton d'accès obtenu.");
  process.exit(1);
}

const end = new Date();
end.setUTCDate(end.getUTCDate() - 2); // GSC a 2-3 jours de retard
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - days);
const iso = (d) => d.toISOString().slice(0, 10);
const startDate = iso(start);
const endDate = iso(end);

console.log(`Backfill ${siteUrl} : ${startDate} -> ${endDate} (${days} jours demandés)`);

const ROW_LIMIT = 25000;
let startRow = 0;
const rows = [];
for (;;) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["date", "page", "query"],
        rowLimit: ROW_LIMIT,
        startRow,
      }),
    }
  );
  if (!res.ok) {
    console.error(`Échec HTTP ${res.status}`, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const batch = data.rows ?? [];
  rows.push(...batch);
  console.log(`  ${rows.length} ligne(s) reçue(s) jusqu'ici...`);
  if (batch.length < ROW_LIMIT) break;
  startRow += ROW_LIMIT;
}

console.log(`Total GSC : ${rows.length} lignes. Écriture dans Supabase (seo_gsc_daily)...`);

const now = new Date().toISOString();
const prepared = rows.map((r) => {
  const [date, page, query] = r.keys;
  const id = createHash("sha256").update(`${site}|${date}|${page}|${query}`).digest("hex");
  return { id, site, date, page, query, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position, fetched_at: now };
});

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
let written = 0;
for (let i = 0; i < prepared.length; i += 500) {
  const batch = prepared.slice(i, i + 500);
  const res = await fetch(`${SB}/rest/v1/seo_gsc_daily`, { method: "POST", headers, body: JSON.stringify(batch) });
  if (!res.ok) {
    console.error(`Échec écriture lot ${i}-${i + batch.length} : HTTP ${res.status}`, await res.text());
    process.exit(1);
  }
  written += batch.length;
  console.log(`  ${written}/${prepared.length} écrites...`);
}

console.log(`\nOK - backfill terminé : ${written} lignes (upsert, aucun doublon si déjà présentes).`);
