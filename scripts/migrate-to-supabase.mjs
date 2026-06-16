// Migre les donnees locales data/*.json vers Supabase (upsert par id).
// Prerequis : avoir execute scripts/supabase-schema.sql dans Supabase.
// Lancer : node scripts/migrate-to-supabase.mjs
//
// Ne touche PAS aux donnees sensibles : par defaut on ne migre que les tables
// "publiques" utiles (deals, posts, partners, airports, routes). Ajoute d'autres
// tables dans TABLES si besoin.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Charge SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY depuis .env.local
async function loadEnv() {
  const env = {};
  try {
    const txt = await readFile(join(root, ".env.local"), "utf-8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}

const TABLES = ["airports", "routes", "partners", "posts", "deals"];

const env = await loadEnv();
const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

for (const table of TABLES) {
  let rows;
  try {
    const txt = await readFile(join(root, "data", `${table}.json`), "utf-8");
    rows = JSON.parse(txt.replace(/^﻿/, "").trim() || "[]");
  } catch {
    console.log(`- ${table}: pas de fichier local, ignore`);
    continue;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`- ${table}: vide, ignore`);
    continue;
  }
  const { error } = await sb.from(table).upsert(rows, { onConflict: "id" });
  if (error) console.error(`- ${table}: ERREUR ${error.message}`);
  else console.log(`- ${table}: ${rows.length} ligne(s) upsert`);
}

console.log("Migration terminee.");
