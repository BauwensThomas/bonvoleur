// Sauvegarde COMPLÈTE de Supabase, en local, dans backups/backup_<date>.zip :
//   database/full_dump.sql       <- pg_dump (schéma public + auth + storage)
//   database/tables_info.json    <- métadonnées (colonnes, lignes, taille) par table
//   database/tables/<table>.json <- données lisibles, table par table
//   storage/_manifest.json       <- liste des fichiers Storage (pas les fichiers)
//   auth/users.json              <- utilisateurs Supabase Auth
//   advisors/security.json       <- lints sécurité (Management API)
//   advisors/performance.json    <- lints performance (Management API)
//   edge_functions/functions.json
//
// Les fichiers Storage eux-mêmes vivent à part, dans un MIROIR PERSISTANT
// (backups/storage_mirror/<bucket>/...), jamais zippé, jamais supprimé : ils
// changent rarement, les re-télécharger/re-zipper à chaque run ferait exploser
// la taille des sauvegardes pour rien. Seul un manifeste (chemin/taille/statut)
// va dans le zip.
//
// Usage : npm run backup:full   (ou node scripts/backup-full.mjs)
// Requiert dans .env.local : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_DB_URL (pg_dump), SUPABASE_ACCESS_TOKEN (Management API : métadonnées
// de tables, advisors, edge functions).
//
// Rétention : aucune - tous les backups datés sont gardés indéfiniment (le poids
// hebdo reste faible une fois le storage mirroré). Le mirror n'est jamais purgé,
// seulement mis à jour par remplacement fichier par fichier.

import { readFile, mkdir, writeFile, rm, stat } from "node:fs/promises";
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

const maintenanceUntil = Date.parse(env.SITE_MAINTENANCE_UNTIL ?? "");
const maintenanceActive =
  env.SITE_MAINTENANCE_ENABLED?.trim().toLowerCase() === "true" &&
  (Number.isNaN(maintenanceUntil) || Date.now() < maintenanceUntil);
if (maintenanceActive) {
  console.log("Maintenance active : backup Supabase suspendu.");
  process.exit(0);
}

const SB = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PAT = env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = SB ? new URL(SB).hostname.split(".")[0] : null;
const sbHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const date = new Date().toISOString().slice(0, 10);
const workdir = `backups/_work-${date}`;
const mirrorDir = "backups/storage_mirror";
const zipPath = `backups/backup_${date}.zip`;
let ok = true;

console.log(`\n=== Sauvegarde BonVoleur - ${new Date().toISOString()} ===`);

await mkdir(`${workdir}/database/tables`, { recursive: true });
await mkdir(`${workdir}/storage`, { recursive: true });
await mkdir(`${workdir}/auth`, { recursive: true });
await mkdir(`${workdir}/advisors`, { recursive: true });
await mkdir(`${workdir}/edge_functions`, { recursive: true });
await mkdir(mirrorDir, { recursive: true });

// Petite aide : requête SQL via la Management API (introspection uniquement -
// aucune donnée de tables/mots de passe ne passe par là, juste des métadonnées
// de schéma). Requiert SUPABASE_ACCESS_TOKEN (jeton personnel Expo/Supabase).
async function managementQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

// --- 1) Dump SQL (schéma + données + policies + auth + storage meta) ---
if (env.SUPABASE_DB_URL) {
  const sqlFile = `${workdir}/database/full_dump.sql`;
  console.log("pg_dump -> " + sqlFile);
  const code = await new Promise((resolve) => {
    const p = spawn(
      "pg_dump",
      ["--schema=public", "--schema=auth", "--schema=storage", "--no-owner", "--no-privileges", "-f", sqlFile, env.SUPABASE_DB_URL],
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
  console.warn("SUPABASE_DB_URL absent : dump SQL IGNORÉ.");
}

// --- 2) Métadonnées des tables (colonnes, lignes, taille) ---
// Tables à exclure du JSON lisible (mais toujours présentes dans le dump SQL) :
// volumineuses ET non "métier" à relire à la main (catalogues externes, logs).
// Aucune pour l'instant - toutes les tables de ce projet sont petites et utiles
// à consulter directement ; revoir cette liste si une table grossit beaucoup.
const EXCLUDE_FROM_JSON = [];
let tableNames = [];

if (PAT && PROJECT_REF) {
  try {
    const rows = await managementQuery(`
      select t.table_name,
             (select count(*) from information_schema.columns c where c.table_schema = t.table_schema and c.table_name = t.table_name) as col_count,
             coalesce(s.n_live_tup, 0) as row_estimate,
             pg_size_pretty(pg_total_relation_size(format('%I.%I', t.table_schema, t.table_name))) as total_size,
             pg_total_relation_size(format('%I.%I', t.table_schema, t.table_name)) as bytes
      from information_schema.tables t
      left join pg_stat_user_tables s on s.relname = t.table_name and s.schemaname = t.table_schema
      where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by bytes desc nulls last;
    `);
    await writeFile(`${workdir}/database/tables_info.json`, JSON.stringify(rows, null, 2), "utf-8");
    tableNames = rows.map((r) => r.table_name);
    console.log(`Métadonnées de ${rows.length} tables -> database/tables_info.json`);
  } catch (e) {
    ok = false;
    console.error("Métadonnées des tables:", e.message);
  }
} else {
  console.warn("SUPABASE_ACCESS_TOKEN absent : métadonnées des tables IGNORÉES.");
}

// --- 3) Données de chaque table en JSON lisible (via l'API REST) ---
if (SB && KEY && tableNames.length > 0) {
  for (const t of tableNames) {
    if (EXCLUDE_FROM_JSON.includes(t)) {
      console.log(`  ${t} : exclue du JSON (voir EXCLUDE_FROM_JSON)`);
      continue;
    }
    try {
      const rows = [];
      let offset = 0;
      for (;;) {
        const r = await fetch(`${SB}/rest/v1/${t}?select=*&limit=1000&offset=${offset}`, { headers: sbHeaders });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const batch = await r.json();
        rows.push(...batch);
        if (batch.length < 1000) break;
        offset += 1000;
      }
      await writeFile(`${workdir}/database/tables/${t}.json`, JSON.stringify(rows, null, 2), "utf-8");
      console.log(`  ${t} : ${rows.length} lignes -> database/tables/${t}.json`);
    } catch (e) {
      ok = false;
      console.error(`  ${t} : ERREUR ${e.message}`);
    }
  }
} else if (!tableNames.length) {
  console.warn("Liste des tables vide (métadonnées échouées) : données JSON IGNORÉES.");
}

// --- 4) Storage : mirror persistant + manifeste (pas de re-téléchargement si taille inchangée) ---
async function listFolder(bucket, prefix) {
  const res = await fetch(`${SB}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...sbHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) throw new Error(`list ${bucket}/${prefix}: ${res.status}`);
  return res.json();
}

// Parcourt récursivement un bucket, renvoie [{path, size}] pour chaque fichier.
async function walk(bucket, prefix = "") {
  const items = await listFolder(bucket, prefix);
  const files = [];
  for (const it of items) {
    const path = prefix ? `${prefix}${it.name}` : it.name;
    if (it.id === null || it.metadata == null) {
      files.push(...(await walk(bucket, `${path}/`)));
    } else {
      files.push({ path, size: it.metadata.size ?? 0 });
    }
  }
  return files;
}

async function localSize(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return null; // fichier absent du mirror
  }
}

if (SB && KEY) {
  const manifest = [];
  try {
    const bRes = await fetch(`${SB}/storage/v1/bucket`, { headers: sbHeaders });
    const buckets = await bRes.json();
    let downloaded = 0;
    let cached = 0;
    for (const b of buckets) {
      const files = await walk(b.name);
      for (const { path, size } of files) {
        const mirrorPath = `${mirrorDir}/${b.name}/${path}`;
        const existingSize = await localSize(mirrorPath);
        if (existingSize === size) {
          manifest.push({ bucket: b.name, path, size, status: "cached" });
          cached++;
          continue;
        }
        const dl = await fetch(`${SB}/storage/v1/object/${b.name}/${path}`, { headers: sbHeaders });
        if (!dl.ok) {
          console.error(`  storage ${b.name}/${path}: ${dl.status}`);
          manifest.push({ bucket: b.name, path, size, status: `erreur (${dl.status})` });
          continue;
        }
        const buf = Buffer.from(await dl.arrayBuffer());
        await mkdir(dirname(mirrorPath), { recursive: true });
        await writeFile(mirrorPath, buf);
        manifest.push({ bucket: b.name, path, size, status: "downloaded" });
        downloaded++;
      }
      console.log(`storage "${b.name}" : ${files.length} fichiers (${cached} en cache, ${downloaded} téléchargés)`);
    }
    await writeFile(`${workdir}/storage/_manifest.json`, JSON.stringify(manifest, null, 2), "utf-8");
    console.log(`  Manifeste -> storage/_manifest.json (mirror persistant : ${mirrorDir}/)`);
  } catch (err) {
    ok = false;
    console.error("Storage:", err.message);
  }
} else {
  console.warn("SUPABASE_URL / SERVICE_ROLE absents : Storage ignoré.");
}

// --- 5) Utilisateurs Supabase Auth (liste complète, via l'API Admin) ---
if (SB && KEY) {
  try {
    const users = [];
    let page = 1;
    for (;;) {
      const r = await fetch(`${SB}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: sbHeaders });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const batch = data.users ?? [];
      users.push(...batch);
      if (batch.length < 1000) break;
      page++;
    }
    await writeFile(`${workdir}/auth/users.json`, JSON.stringify(users, null, 2), "utf-8");
    console.log(`Utilisateurs Auth : ${users.length} -> auth/users.json`);
  } catch (e) {
    ok = false;
    console.error("Utilisateurs Auth:", e.message);
  }
} else {
  console.warn("SUPABASE_URL / SERVICE_ROLE absents : utilisateurs Auth ignorés.");
}

// --- 6) Advisors Supabase (lints sécurité + performance) ---
if (PAT && PROJECT_REF) {
  for (const kind of ["security", "performance"]) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/advisors/${kind}`, {
        headers: { Authorization: `Bearer ${PAT}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      await writeFile(`${workdir}/advisors/${kind}.json`, JSON.stringify(data, null, 2), "utf-8");
      console.log(`Advisors ${kind} : ${data.lints?.length ?? 0} lint(s) -> advisors/${kind}.json`);
    } catch (e) {
      ok = false;
      console.error(`Advisors ${kind}:`, e.message);
    }
  }
} else {
  console.warn("SUPABASE_ACCESS_TOKEN absent : advisors ignorés.");
}

// --- 7) Edge Functions déployées (liste, même vide) ---
if (PAT && PROJECT_REF) {
  try {
    const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
      headers: { Authorization: `Bearer ${PAT}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    await writeFile(`${workdir}/edge_functions/functions.json`, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Edge Functions : ${data.length} -> edge_functions/functions.json`);
  } catch (e) {
    ok = false;
    console.error("Edge Functions:", e.message);
  }
} else {
  console.warn("SUPABASE_ACCESS_TOKEN absent : Edge Functions ignorées.");
}

// --- 8) Compression : zippe le contenu de workdir/ (pas les fichiers Storage) ---
try {
  const code = await new Promise((resolve) => {
    const p = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path "${workdir.replace(/\//g, "\\")}\\*" -DestinationPath "${zipPath.replace(/\//g, "\\")}" -Force`,
      ],
      { stdio: ["ignore", "inherit", "inherit"] }
    );
    p.on("error", (e) => {
      console.error("Compress-Archive introuvable ou erreur:", e.message);
      resolve(1);
    });
    p.on("close", resolve);
  });
  if (code === 0) {
    console.log(`Compression -> ${zipPath}`);
    await rm(workdir, { recursive: true, force: true });
  } else {
    ok = false;
    console.error("  Compression échouée (code " + code + ") - dossier de travail conservé : " + workdir);
  }
} catch (err) {
  ok = false;
  console.error("Compression:", err.message);
}

// Pas de rotation : tous les backups datés sont gardés indéfiniment (le poids
// hebdo reste faible une fois le storage mirroré, pas besoin de purger). Le
// mirror storage n'est de toute façon jamais purgé par date.

console.log(ok ? `\n[SUCCES] Sauvegarde complète terminée - ${zipPath}` : "\n[ECHEC] Sauvegarde terminée AVEC avertissements (voir ci-dessus).");
process.exit(ok ? 0 : 1);
