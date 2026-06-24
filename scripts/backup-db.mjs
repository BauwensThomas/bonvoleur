// Sauvegarde complète de la base Supabase : toutes les tables, toutes les lignes,
// vers un fichier JSON daté dans backups/ (hors base, gitignoré car contient des
// données personnelles). Permet de restaurer en cas de problème.
//
// Usage : node scripts/backup-db.mjs   (lit SUPABASE_URL + SERVICE_ROLE de .env.local)
// En CI : les variables viennent de l'environnement (secrets).

import { readFile, writeFile, mkdir } from "node:fs/promises";

// Toutes les tables de l'app (cf. src/lib/types.ts Tables + site_settings).
const TABLES = [
  "subscribers",
  "deals",
  "routes",
  "airports",
  "referrals",
  "sends",
  "posts",
  "admins",
  "partners",
  "agent_runs",
  "site_settings",
];

// En local : .env.local. En CI : process.env.
const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* pas de .env.local (CI) */
}

const SUPABASE_URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Récupère toutes les lignes d'une table (pagination par pages de 1000).
async function fetchAll(table) {
  const rows = [];
  const PAGE = 1000;
  let offset = 0;
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

const exportedAt = new Date().toISOString();
const data = { exportedAt, host: new URL(SUPABASE_URL).host, tables: {} };
const counts = {};
let total = 0;

for (const table of TABLES) {
  try {
    const rows = await fetchAll(table);
    data.tables[table] = rows;
    counts[table] = rows.length;
    total += rows.length;
    console.log(`  ${table.padEnd(14)} ${rows.length} lignes`);
  } catch (err) {
    // Une table absente ne doit pas faire échouer toute la sauvegarde.
    counts[table] = `ERREUR: ${err.message}`;
    console.error(`  ${table.padEnd(14)} ${err.message}`);
  }
}
data.counts = counts;

await mkdir("backups", { recursive: true });
const stamp = exportedAt.replace(/[:.]/g, "-");
const file = `backups/backup-${stamp}.json`;
await writeFile(file, JSON.stringify(data, null, 2), "utf-8");

console.log(`\nSauvegarde écrite : ${file} (${total} lignes au total).`);
