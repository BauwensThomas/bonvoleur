// Sauvegarde COMPLÈTE de Supabase, en local :
//  1) pg_dump : schéma SQL + données + politiques RLS + schéma `auth`
//     (utilisateurs) + schéma `storage` (métadonnées) -> backups/db-<date>.sql
//  2) Fichiers du Storage (buckets) téléchargés -> backups/storage-<date>/...
//
// Usage : npm run backup:full   (ou node scripts/backup-full.mjs)
// Requiert dans .env.local : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// et SUPABASE_DB_URL (chaîne de connexion Postgres, cf. Supabase ->
// Project Settings -> Database -> Connection string -> "Session pooler"/URI).

import { readFile, mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname } from "node:path";

// --- env ---
const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* CI : variables d'env */
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await mkdir("backups", { recursive: true });
let ok = true;

// --- 0) Données des tables en JSON (TOUJOURS, via l'API REST) ---
// Filet de sécurité indépendant de pg_dump : même sans SUPABASE_DB_URL, on
// sauvegarde toutes les lignes de toutes les tables.
const TABLES = [
  "subscribers", "deals", "routes", "airports", "referrals",
  "sends", "posts", "admins", "partners", "agent_runs", "site_settings",
];
if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const h = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
  const dump = { exportedAt: new Date().toISOString(), tables: {}, counts: {} };
  for (const t of TABLES) {
    try {
      const rows = [];
      let offset = 0;
      for (;;) {
        const r = await fetch(
          `${env.SUPABASE_URL}/rest/v1/${t}?select=*&limit=1000&offset=${offset}`,
          { headers: h }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const batch = await r.json();
        rows.push(...batch);
        if (batch.length < 1000) break;
        offset += 1000;
      }
      dump.tables[t] = rows;
      dump.counts[t] = rows.length;
    } catch (e) {
      dump.counts[t] = `ERREUR: ${e.message}`;
      ok = false;
    }
  }
  await writeFile(`backups/tables-${stamp}.json`, JSON.stringify(dump, null, 2), "utf-8");
  console.log("Données des tables (JSON) -> backups/tables-" + stamp + ".json");
}

// --- 1) Dump SQL (schéma + données + policies + auth + storage meta) ---
if (env.SUPABASE_DB_URL) {
  const sqlFile = `backups/db-${stamp}.sql`;
  console.log("pg_dump -> " + sqlFile);
  const code = await new Promise((resolve) => {
    const p = spawn(
      "pg_dump",
      [
        "--schema=public",
        "--schema=auth",
        "--schema=storage",
        "--no-owner",
        "--no-privileges",
        "-f",
        sqlFile,
        env.SUPABASE_DB_URL,
      ],
      { stdio: ["ignore", "inherit", "inherit"] }
    );
    p.on("error", (e) => {
      console.error("pg_dump introuvable ou erreur:", e.message);
      resolve(1);
    });
    p.on("close", resolve);
  });
  if (code === 0) console.log("  OK (schéma + données + policies + auth + storage meta)");
  else {
    ok = false;
    console.error("  pg_dump a échoué (code " + code + ").");
  }
} else {
  ok = false;
  console.warn(
    "SUPABASE_DB_URL absent : dump SQL (schéma/policies/auth) IGNORÉ.\n" +
      "  Ajoute-le dans .env.local (Supabase -> Settings -> Database -> Connection string)."
  );
}

// --- 2) Fichiers du Storage ---
const SB = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function listFolder(bucket, prefix) {
  const res = await fetch(`${SB}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!res.ok) throw new Error(`list ${bucket}/${prefix}: ${res.status}`);
  return res.json();
}

// Parcourt récursivement un bucket et renvoie tous les chemins de fichiers.
async function walk(bucket, prefix = "") {
  const items = await listFolder(bucket, prefix);
  const files = [];
  for (const it of items) {
    const path = prefix ? `${prefix}${it.name}` : it.name;
    if (it.id === null || it.metadata == null) {
      // dossier -> on descend
      files.push(...(await walk(bucket, `${path}/`)));
    } else {
      files.push(path);
    }
  }
  return files;
}

if (SB && KEY) {
  try {
    const bRes = await fetch(`${SB}/storage/v1/bucket`, { headers });
    const buckets = await bRes.json();
    let n = 0;
    for (const b of buckets) {
      const files = await walk(b.name);
      for (const path of files) {
        const dl = await fetch(
          `${SB}/storage/v1/object/${b.name}/${path}`,
          { headers }
        );
        if (!dl.ok) {
          console.error(`  storage ${b.name}/${path}: ${dl.status}`);
          continue;
        }
        const buf = Buffer.from(await dl.arrayBuffer());
        const dest = `backups/storage-${stamp}/${b.name}/${path}`;
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, buf);
        n++;
      }
      console.log(`storage "${b.name}" : ${files.length} fichiers`);
    }
    console.log(`  ${n} fichiers téléchargés -> backups/storage-${stamp}/`);
  } catch (err) {
    ok = false;
    console.error("Storage:", err.message);
  }
} else {
  console.warn("SUPABASE_URL / SERVICE_ROLE absents : Storage ignoré.");
}

// --- 3) Rotation : ne garder que les 10 sauvegardes les plus récentes ---
// On purge seulement si la sauvegarde courante a réussi (sinon on ne touche pas
// aux anciennes, qui restent le filet de sécurité).
const KEEP = 10;
if (ok) {
  try {
    const entries = await readdir("backups");
    const stampOf = (name) => {
      const s = name.replace(/^(tables-|db-|storage-|backup-)/, "");
      if (s === name) return null; // pas un fichier de sauvegarde
      return s.replace(/\.(json|sql)$/, "");
    };
    const stamps = [...new Set(entries.map(stampOf).filter(Boolean))]
      .sort()
      .reverse(); // horodatage ISO -> tri chronologique
    const toDelete = new Set(stamps.slice(KEEP));
    let removed = 0;
    for (const name of entries) {
      if (name === "backup.log") continue; // on garde le journal
      const s = stampOf(name);
      if (s && toDelete.has(s)) {
        await rm(`backups/${name}`, { recursive: true, force: true });
        removed++;
      }
    }
    if (removed) console.log(`Rotation : ${removed} fichier(s) ancien(s) supprimé(s) (on garde les ${KEEP} dernières sauvegardes).`);
  } catch (err) {
    console.error("Rotation:", err.message);
  }
}

console.log(ok ? "\nSauvegarde complète terminée." : "\nSauvegarde terminée AVEC avertissements (voir ci-dessus).");
process.exit(ok ? 0 : 1);
