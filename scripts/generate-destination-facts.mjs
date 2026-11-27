// Génère, pour chaque destination du site, le trajet aéroport -> centre-ville
// (mode, durée, point d'arrivée, source officielle) avec Claude + recherche web.
// Résultat dans la table `destination_facts` (voir scripts/sql/add-destination-facts.sql).
//
// Garde-fous (une durée fausse serait une fausse information publiée) :
//  - la source doit être une page officielle (opérateur, aéroport, ville) : les
//    sites collaboratifs (Wikipedia, Tripadvisor, forums, réseaux) sont refusés ;
//  - la page source doit répondre (pas de 404) ;
//  - durée plausible (5 à 150 min), fourchette cohérente ;
//  - en cas de doute, le modèle répond "verified": false et rien n'est écrit.
// Idempotent : ne refait que les destinations manquantes ou vérifiées il y a plus
// de 90 jours (une nouvelle destination est donc prise en charge au prochain passage).
//
// Usage : node scripts/generate-destination-facts.mjs [--force] [--only=lisbonne,porto] [--limit=10]

import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* pas de .env.local (ex. GitHub Actions) : variables d'environnement seules */
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = (args.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) ?? "").slice(8)) || Infinity;
const CONCURRENCY = 3;
const MAX_AGE_DAYS = 90;

const SB = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY || !env.ANTHROPIC_API_KEY) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et ANTHROPIC_API_KEY requis.");
  process.exit(1);
}
const sbHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const slugify = (s) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const BLOCKED_HOSTS = /(wikipedia|wikivoyage|tripadvisor|reddit|facebook|instagram|twitter|x\.com|quora|medium\.com|blogspot|wordpress|youtube|pinterest|lonelyplanet|rome2rio|booking\.com|skyscanner|kayak)/i;

async function sbGet(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) throw new Error(`Supabase ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// 1) Destinations (une par ville d'arrivée) + faits déjà connus
const routes = await sbGet("routes?select=destination_city,destination_iata&limit=2000");
const dests = new Map();
for (const r of routes) {
  if (!r.destination_city) continue;
  const slug = slugify(r.destination_city);
  if (!dests.has(slug)) dests.set(slug, { slug, city: r.destination_city, iata: r.destination_iata });
}
const known = new Map((await sbGet("destination_facts?select=slug,verified_at&limit=2000")).map((f) => [f.slug, f.verified_at]));
const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;

let todo = [...dests.values()].filter((d) => {
  if (ONLY.length) return ONLY.includes(d.slug);
  if (FORCE) return true;
  const v = known.get(d.slug);
  return !v || new Date(v).getTime() < cutoff;
});
todo = todo.slice(0, LIMIT);
console.log(`${dests.size} destinations, ${known.size} avec fait, ${todo.length} à traiter.`);

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const MODEL = env.ANTHROPIC_FACTS_MODEL || "claude-sonnet-4-6";

const PROMPT = (d, feedback) => `${feedback ? `ATTENTION : ta réponse précédente a été refusée (${feedback}). Cherche une AUTRE source officielle, dont la page existe vraiment.

` : ""}Trouve, avec la recherche web, le moyen de transport PUBLIC le plus courant pour aller de l'aéroport principal de ${d.city} (code IATA ${d.iata}) jusqu'au centre-ville.

Règles strictes :
- Utilise UNIQUEMENT des sources officielles pour la durée : site de l'opérateur du transport (métro, train, bus), de l'aéroport ou de la ville. Pas de blog, pas de forum, pas de Wikipedia, pas de comparateur.
- La durée doit venir de la source (ou s'en déduire sans ambiguïté). Si deux sources divergent, prends la fourchette la plus large.
- "transfer_to" : le point d'arrivée en ville le plus central (gare centrale, place, station de métro).
- Si tu ne peux pas confirmer la durée avec une source officielle, réponds verified=false. N'invente rien.
- Pas de prix. Pas d'horaires précis. Français natif, sans tiret long, sans émoji, tous les accents.

Réponds UNIQUEMENT par un objet JSON, sans texte autour :
{"verified": true|false, "airport_name": "nom de l'aéroport", "transfer_mode": "métro|train|bus|tramway|navette", "transfer_min": 25, "transfer_max": 30, "transfer_to": "point d'arrivée en ville", "transfer_summary": "1 à 2 phrases : ligne ou service, fréquence si connue, ce qu'il faut savoir.", "source_url": "https://page-officielle"}`;

function extractJson(text) {
  const i = text.indexOf("{");
  const j = text.lastIndexOf("}");
  if (i === -1 || j === -1) return null;
  try {
    return JSON.parse(text.slice(i, j + 1));
  } catch {
    return null;
  }
}

async function urlOk(url) {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 BonVoleurBot" }, signal: AbortSignal.timeout(15000) });
    return r.status < 500 && r.status !== 404 && r.status !== 410;
  } catch {
    return false;
  }
}

async function validate(d, f) {
  if (!f || f.verified !== true) return "non vérifié par le modèle";
  const min = Number(f.transfer_min);
  const max = Number(f.transfer_max ?? f.transfer_min);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 5 || max > 150 || min > max) return `durée invalide (${f.transfer_min}-${f.transfer_max})`;
  if (!f.transfer_summary || f.transfer_summary.length < 20 || f.transfer_summary.length > 400) return "résumé absent ou hors limites";
  if (!f.transfer_mode || !f.transfer_to) return "mode ou point d'arrivée manquant";
  if (/[—–]/.test(JSON.stringify(f))) return "tiret long dans le texte";
  let u;
  try {
    u = new URL(f.source_url);
  } catch {
    return "source_url invalide";
  }
  if (u.protocol !== "https:") return "source non https";
  if (BLOCKED_HOSTS.test(u.hostname)) return `source refusée (${u.hostname})`;
  if (!(await urlOk(f.source_url))) return "page source introuvable";
  return null;
}

async function ask(d, feedback) {
  let lastText = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: PROMPT(d, feedback) }],
      });
      lastText = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      return extractJson(lastText);
    } catch (e) {
      if (attempt === 1) throw e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  return null;
}

const results = { ok: [], rejected: [], errors: [] };

async function processOne(d) {
  try {
    let f = await ask(d);
    let why = await validate(d, f);
    if (why && why !== "non vérifié par le modèle") {
      // Un deuxième essai en lui disant pourquoi (ex. page source introuvable).
      f = await ask(d, why);
      why = await validate(d, f);
    }
    if (why) {
      results.rejected.push(`${d.slug}: ${why}`);
      console.log(`  REJETÉ  ${d.slug} : ${why}`);
      // Ligne vide datée : la destination est "essayée", elle ne sera pas
      // retentée (coût de recherche web) avant 90 jours. La fiche n'affiche rien.
      if (!known.has(d.slug)) {
        await fetch(`${SB}/rest/v1/destination_facts?on_conflict=slug`, {
          method: "POST",
          headers: { ...sbHeaders, Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify({ slug: d.slug, city: d.city, verified_at: new Date().toISOString() }),
        }).catch(() => {});
      }
      return;
    }
    const row = {
      slug: d.slug,
      city: d.city,
      airport_name: String(f.airport_name ?? "").slice(0, 120) || null,
      transfer_mode: String(f.transfer_mode).toLowerCase().slice(0, 40),
      transfer_min: Math.round(Number(f.transfer_min)),
      transfer_max: Math.round(Number(f.transfer_max ?? f.transfer_min)),
      transfer_to: String(f.transfer_to).slice(0, 120),
      transfer_summary: String(f.transfer_summary).trim(),
      source_url: f.source_url,
      verified_at: new Date().toISOString(),
    };
    const r = await fetch(`${SB}/rest/v1/destination_facts?on_conflict=slug`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    });
    if (!r.ok) throw new Error(`upsert ${r.status} ${await r.text()}`);
    results.ok.push(d.slug);
    console.log(`  OK      ${d.slug} : ${row.transfer_mode} ${row.transfer_min}-${row.transfer_max} min -> ${row.transfer_to} (${new URL(row.source_url).hostname})`);
  } catch (e) {
    results.errors.push(`${d.slug}: ${e.message}`);
    console.log(`  ERREUR  ${d.slug} : ${e.message}`);
  }
}

let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const d = todo[next++];
      await processOne(d);
    }
  })
);

console.log(`\nTerminé : ${results.ok.length} enregistrées, ${results.rejected.length} rejetées, ${results.errors.length} erreurs.`);

// Rafraîchit le cache des fiches en production (si les identifiants admin sont connus).
if (results.ok.length && env.ADMIN_PASSWORD) {
  try {
    const site = env.SITE_URL || "https://www.bonvoleur.com";
    const login = await fetch(`${site}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: env.ADMIN_PASSWORD }) });
    const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    const rv = await fetch(`${site}/api/admin/revalidate-destinations`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: "{}" });
    console.log(`Cache des fiches rafraîchi : HTTP ${rv.status}`);
  } catch (e) {
    console.log("Rafraîchissement du cache impossible :", e.message);
  }
}
process.exit(0);
