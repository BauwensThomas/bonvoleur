// Génère le contenu PAR DESTINATION (ville d'arrivée) : un seul appel Claude
// par ville (pas par couple origine-destination) + une photo Unsplash, puis
// applique ce contenu à toutes les routes de cette destination (table `routes`).
// Le contenu est centré sur la VILLE (pas sur un aéroport de départ précis).
// Lancer : node scripts/generate-routes.mjs   (relançable ; réutilise les photos déjà présentes)

import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const SB = env.SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !SK) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
const sbHeaders = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

const ORIGIN = { BRU: "Bruxelles", CRL: "Charleroi", CDG: "Paris", LYS: "Lyon" };
const DEST = {
  LIS: "Lisbonne", BCN: "Barcelone", RAK: "Marrakech", FCO: "Rome", JFK: "New York",
  BKK: "Bangkok", AGP: "Malaga", OPO: "Porto", KRK: "Cracovie", ALC: "Alicante",
  ATH: "Athènes", GIG: "Rio de Janeiro",
};
const WATCH = {
  BRU: ["LIS", "BCN", "RAK", "FCO", "JFK", "BKK"],
  CRL: ["AGP", "OPO", "FCO", "KRK", "ALC"],
  CDG: ["JFK", "LIS", "BCN", "ATH", "BKK", "GIG"],
  LYS: ["BCN", "LIS", "FCO"],
};
const slugify = (s) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Regroupe par destination (ville d'arrivée).
const dests = {};
for (const [o, ds] of Object.entries(WATCH)) {
  for (const d of ds) {
    if (!dests[d]) dests[d] = { d, dc: DEST[d], origins: [] };
    dests[d].origins.push({ o, oc: ORIGIN[o], slug: `${slugify(ORIGIN[o])}-${slugify(DEST[d])}` });
  }
}

// Photos déjà présentes (pour ne pas re-télécharger).
const existing = await fetch(`${SB}/rest/v1/routes?select=slug,image_url`, { headers: sbHeaders })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);
const imgBySlug = new Map(existing.map((r) => [r.slug, r.image_url]));

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
const model = env.ANTHROPIC_MODEL || "claude-opus-4-8";

function extractJson(text) {
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i === -1 || j === -1) return null;
  try { return JSON.parse(text.slice(i, j + 1)); } catch { return null; }
}

async function genCityContent(city, origins) {
  if (!client) return null;
  const res = await client.messages.create({
    model, max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    messages: [{
      role: "user",
      content: `Cherche sur le web des infos RÉELLES et vérifiables sur les vols vers ${city} depuis la Belgique et la France (aéroports possibles : ${origins.join(", ")}). Le contenu doit être centré sur LA DESTINATION ${city}, PAS sur un seul aéroport de départ. Réponds STRICTEMENT en JSON, sans texte autour :
{
 "intro": "2 à 3 phrases sur ${city} comme destination et l'accès en avion depuis la Belgique et la France (vols directs ou avec escale, compagnies, contexte général). Ne commence pas par 'La liaison X vers ${city}'.",
 "airlines": ["principales compagnies qui desservent ${city} depuis la Belgique/France"],
 "duration": "durée de vol typique vers ${city} depuis la Belgique/France (ordre de grandeur)",
 "bestPeriod": "meilleure période pour visiter ${city} (prix et/ou météo)",
 "tips": ["3 à 4 conseils concrets pour un voyage à ${city}"]
}
IMPÉRATIF : français correct avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù...). Pas d'émoji, pas de tiret long (em dash). Pas de prix inventés présentés comme garantis.`,
    }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  return extractJson(text);
}

async function unsplashPhoto(city) {
  if (!env.UNSPLASH_ACCESS_KEY) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)}&orientation=landscape&per_page=1&content_filter=high`,
      { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) return null;
    const p = (await res.json()).results?.[0];
    if (!p) return null;
    if (p.links?.download_location) {
      fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }).catch(() => {});
    }
    return { url: p.urls?.regular ?? p.urls?.full ?? null, credit: `Photo ${p.user?.name ?? ""} / Unsplash`.trim() };
  } catch {
    return null;
  }
}

let done = 0;
for (const dest of Object.values(dests)) {
  process.stdout.write(`${dest.dc}... `);

  const content = await genCityContent(dest.dc, dest.origins.map((o) => o.oc));

  // Photo : réutilise celle déjà en base si une route de cette ville en a une.
  let photo = null;
  const known = dest.origins.map((o) => imgBySlug.get(o.slug)).find(Boolean);
  if (known) photo = { url: known, credit: null };
  else photo = await unsplashPhoto(dest.dc);

  // Applique le MÊME contenu (centré ville) + photo à toutes les routes de la destination.
  let ok = 0;
  for (const o of dest.origins) {
    const row = {
      slug: o.slug,
      origin_iata: o.o, origin_city: o.oc,
      destination_iata: dest.d, destination_city: dest.dc,
      status: "published",
      updated_at: new Date().toISOString(),
    };
    if (content?.intro) {
      row.intro = String(content.intro);
      row.airlines = Array.isArray(content.airlines) ? content.airlines.map(String) : [];
      row.duration = String(content.duration || "");
      row.best_period = String(content.bestPeriod || "");
      row.tips = Array.isArray(content.tips) ? content.tips.map(String) : [];
    }
    if (photo?.url) { row.image_url = photo.url; if (photo.credit) row.image_credit = photo.credit; }

    const res = await fetch(`${SB}/rest/v1/routes?on_conflict=slug`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    });
    if (res.ok) ok++;
    else console.log(`\n  ERREUR ${o.slug} ${res.status}: ${await res.text()}`);
  }
  console.log(`OK (${ok}/${dest.origins.length} routes${content?.intro ? " +contenu" : ""}${photo?.url ? " +photo" : ""})`);
  done++;
}

console.log(`\nTerminé. ${done} destination(s) traitée(s).`);
