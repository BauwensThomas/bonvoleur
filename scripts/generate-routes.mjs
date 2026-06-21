// Génère/complète les fiches route DANS LA BASE (table `routes`) :
//  - contenu réel (Claude + recherche web) : intro, compagnies, durée, période, conseils ;
//  - photo de la destination via Unsplash (URL stockée + crédit).
// Reprend là où il s'est arrêté (saute les routes déjà complètes).
// Lancer : node scripts/generate-routes.mjs
//
// Variables (.env.local) : ANTHROPIC_API_KEY (contenu), UNSPLASH_ACCESS_KEY (photo),
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (écriture base).

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

const routes = Object.entries(WATCH).flatMap(([o, ds]) =>
  ds.map((d) => ({
    o, d, oc: ORIGIN[o], dc: DEST[d],
    slug: `${slugify(ORIGIN[o])}-${slugify(DEST[d])}`,
  }))
);

// Routes déjà en base (pour reprise).
const existing = await fetch(`${SB}/rest/v1/routes?select=slug,intro,image_url`, { headers: sbHeaders })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);
const bySlug = new Map(existing.map((r) => [r.slug, r]));

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
const model = env.ANTHROPIC_MODEL || "claude-opus-4-8";
const photoCache = new Map();

function extractJson(text) {
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i === -1 || j === -1) return null;
  try { return JSON.parse(text.slice(i, j + 1)); } catch { return null; }
}

async function genContent(oc, o, dc, d) {
  if (!client) return null;
  const res = await client.messages.create({
    model, max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    messages: [{
      role: "user",
      content: `Cherche sur le web des infos RÉELLES et vérifiables sur la liaison aérienne ${oc} (${o}) vers ${dc} (${d}). Donne uniquement des faits exacts (ne devine pas). Réponds STRICTEMENT en JSON, sans texte autour :
{
 "intro": "2 à 3 phrases factuelles sur cette liaison (fréquence, direct ou escale, contexte).",
 "airlines": ["compagnies qui opèrent réellement cette route"],
 "duration": "durée de vol réaliste, ex 'environ 2h en direct'",
 "bestPeriod": "meilleure période pour partir (prix bas et/ou météo)",
 "tips": ["3 à 4 conseils concrets et réels pour cette destination ou cette route"]
}
IMPÉRATIF : français correct avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù...). Pas d'émoji, pas de tiret long (em dash). Pas de prix inventés présentés comme garantis.`,
    }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  return extractJson(text);
}

async function unsplashPhoto(city) {
  if (photoCache.has(city)) return photoCache.get(city);
  if (!env.UNSPLASH_ACCESS_KEY) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)}&orientation=landscape&per_page=1&content_filter=high`,
      { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) return null;
    const p = (await res.json()).results?.[0];
    if (!p) return null;
    // Guideline Unsplash : déclencher l'event "download".
    if (p.links?.download_location) {
      fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }).catch(() => {});
    }
    const out = {
      url: p.urls?.regular ?? p.urls?.full ?? null,
      credit: `Photo ${p.user?.name ?? ""} / Unsplash`.trim(),
    };
    photoCache.set(city, out);
    return out;
  } catch {
    return null;
  }
}

let done = 0;
for (const r of routes) {
  const ex = bySlug.get(r.slug);
  const needContent = !ex?.intro;
  const needPhoto = !ex?.image_url;
  if (!needContent && !needPhoto) { console.log(`skip ${r.slug} (complet)`); continue; }
  process.stdout.write(`${r.oc} - ${r.dc}... `);

  const content = needContent ? await genContent(r.oc, r.o, r.dc, r.d) : null;
  const photo = needPhoto ? await unsplashPhoto(r.dc) : null;

  const row = {
    slug: r.slug,
    origin_iata: r.o, origin_city: r.oc,
    destination_iata: r.d, destination_city: r.dc,
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
  if (photo?.url) { row.image_url = photo.url; row.image_credit = photo.credit; }

  const res = await fetch(`${SB}/rest/v1/routes?on_conflict=slug`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (res.ok) { console.log(`OK${content?.intro ? " +contenu" : ""}${photo?.url ? " +photo" : ""}`); done++; }
  else console.log(`ERREUR ${res.status}: ${await res.text()}`);
}

console.log(`\nTerminé. ${done} route(s) écrite(s) dans la base.`);
