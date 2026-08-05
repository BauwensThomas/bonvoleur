// Vérifie que le compte de service Google Search Console fonctionne : lit
// GSC_SERVICE_ACCOUNT_KEY_PATH + GSC_SITE_URL dans .env.local, s'authentifie,
// et récupère les 7 derniers jours de searchanalytics à titre de test.
//
// Usage : node scripts/gsc-test-connection.mjs

import { readFile } from "node:fs/promises";
import { JWT } from "google-auth-library";

const env = { ...process.env };
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const keyPath = env.GSC_SERVICE_ACCOUNT_KEY_PATH;
const siteUrl = env.GSC_SITE_URL; // ex: https://www.bonvoleur.com (URL-prefix) ou sc-domain:bonvoleur.com (Domaine)
if (!keyPath || !siteUrl) {
  console.error("GSC_SERVICE_ACCOUNT_KEY_PATH et/ou GSC_SITE_URL manquant(s) dans .env.local");
  process.exit(1);
}

const key = JSON.parse(await readFile(keyPath, "utf-8"));

const auth = new JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});

console.log(`Connexion en tant que ${key.client_email}...`);
const { token } = await auth.getAccessToken();
if (!token) {
  console.error("Échec : aucun jeton d'accès obtenu.");
  process.exit(1);
}
console.log("Jeton OAuth obtenu.");

const end = new Date();
const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
const iso = (d) => d.toISOString().slice(0, 10);

const res = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: iso(start),
      endDate: iso(end),
      dimensions: ["page"],
      rowLimit: 5,
    }),
  }
);

if (!res.ok) {
  console.error(`Échec de la requête searchAnalytics : HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();
console.log(`\nOK - ${data.rows?.length ?? 0} ligne(s) reçue(s) pour ${siteUrl} (${iso(start)} -> ${iso(end)}) :`);
for (const row of data.rows ?? []) {
  console.log(`  ${row.keys[0]} - ${row.clicks} clics, ${row.impressions} impressions`);
}
if (!data.rows?.length) {
  console.log("  (aucune ligne - normal si le site a peu de trafic sur cette période, ou données pas encore dispo pour hier/avant-hier)");
}
