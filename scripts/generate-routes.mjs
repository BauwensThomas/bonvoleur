// Génère les fiches PAR DESTINATION (ville d'arrivée) dans la table `routes`.
//  - Découvre les destinations depuis la liste surveillée ET depuis les deals
//    réellement trouvés (toute nouvelle route auto).
//  - SAUTE les destinations qui ont déjà une fiche (contenu + photo) -> aucun
//    token gaspillé. Utiliser --force pour tout régénérer.
//  - Contenu centré sur la VILLE (1 appel Claude par ville) + photo Unsplash.
// Local : node scripts/generate-routes.mjs   |  CI : variables d'env (secrets).

import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const FORCE = process.argv.includes("--force");

// En CI, les variables viennent de l'environnement (secrets). En local, .env.local.
const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* pas de .env.local (CI) : on garde process.env */
}

// Plafond de fiches GENEREES (appel Claude) par run : protege le quota Anthropic
// quand la decouverte remonte beaucoup de nouvelles villes d'un coup. Le reste
// est repris au run suivant (les deals restent en base). 0 = illimite.
const MAX_NEW = parseInt(env.ROUTES_MAX_NEW_PER_RUN || "8", 10);

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
const parseLabel = (l) => {
  const m = String(l).match(/^(.*?)\s*\(([A-Z]{3})\)\s*$/);
  return m ? { city: m[1].trim(), iata: m[2] } : null;
};
// Retire les balises (notamment <cite ...> des citations de recherche web) en
// gardant le texte ; nettoie les espaces doubles laisses par la suppression.
const stripTags = (s) =>
  String(s ?? "").replace(/<\/?[^>]+>/g, "").replace(/ {2,}/g, " ").trim();

// Destinations à considérer : ville d'arrivée -> { dc, origins:[{o,oc,slug}] }.
const dests = {};
function addRoute(oIata, oCity, dIata, dCity) {
  if (!dests[dIata]) dests[dIata] = { d: dIata, dc: dCity, origins: [] };
  const slug = `${slugify(oCity)}-${slugify(dCity)}`;
  if (!dests[dIata].origins.some((x) => x.slug === slug)) {
    dests[dIata].origins.push({ o: oIata, oc: oCity, slug });
  }
}

// 1) Liste surveillée (codée en dur).
for (const [o, ds] of Object.entries(WATCH)) {
  for (const d of ds) addRoute(o, ORIGIN[o], d, DEST[d]);
}
// 2) Deals réellement trouvés (toute nouvelle route auto).
const deals = await fetch(`${SB}/rest/v1/deals?select=origin,destination,is_hot`, { headers: sbHeaders })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);
for (const d of deals) {
  if (d.is_hot === false) continue;
  const o = parseLabel(d.origin), dd = parseLabel(d.destination);
  if (o && dd) addRoute(o.iata, o.city, dd.iata, dd.city);
}

// Fiches déjà en base (slug -> { intro, image_url }) pour sauter le connu.
const existing = await fetch(`${SB}/rest/v1/routes?select=slug,intro,image_url`, { headers: sbHeaders })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);
const bySlug = new Map(existing.map((r) => [r.slug, r]));

const client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
// Haiku 4.5 : 5x moins cher qu'Opus, suffisant pour des fiches factuelles courtes.
const model = env.ANTHROPIC_MODEL || "claude-haiku-4-5";

function extractJson(text) {
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i === -1 || j === -1) return null;
  try { return JSON.parse(text.slice(i, j + 1)); } catch { return null; }
}

async function genCityContent(city, origins) {
  if (!client) return null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
   try {
    const res = await client.messages.create({
    model, max_tokens: 2800,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    messages: [{
      role: "user",
      content: `Cherche sur le web des infos RÉELLES et vérifiables sur les vols vers ${city} depuis la Belgique et la France (aéroports possibles : ${origins.join(", ")}). Le contenu doit être centré sur LA DESTINATION ${city}, PAS sur un seul aéroport de départ. Réponds STRICTEMENT en JSON, sans texte autour :
{
 "intro": "3 à 4 phrases RICHES et concretes sur ${city} : ce qui en fait une destination (atouts, ambiance), puis l'acces en avion depuis la Belgique et la France (aeroports concernes, vols directs ou avec escale, et si tu la connais la frequence ou le nombre de vols par semaine, la distance ou le decalage horaire). Ne commence pas par 'La liaison'.",
 "airlines": ["principales compagnies qui desservent ${city} depuis la Belgique/France (4 a 6 si possible)"],
 "duration": "durée de vol typique vers ${city} depuis la Belgique/France (direct, et avec escale si pertinent)",
 "bestPeriod": "meilleure période pour visiter ${city} : météo ET prix (mois les moins chers, et combien de temps a l'avance reserver)",
 "tips": ["4 à 5 conseils concrets et actionnables pour un voyage à ${city} (transfert aeroport vers le centre, bagages low cost, decalage horaire, formalites/visa si besoin, meilleur jour pour reserver...), dont OBLIGATOIREMENT un sur la MONNAIE : si ${city} est dans la zone euro, indique qu'on paie en euros (aucun change à prévoir) ; sinon donne un ordre de grandeur du taux de change (environ 1 euro = X en monnaie locale, et environ 1 unité de cette monnaie = Y euros), en précisant que c'est approximatif et variable"],
 "region": "le continent de ${city} : exactement l'une de ces valeurs -> Europe, Amérique, Afrique, Asie, Océanie"
}
IMPÉRATIF : français correct avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù...). Pas d'émoji, pas de tiret long (em dash). Pas de prix inventés présentés comme garantis. N'inclus AUCUNE balise dans les valeurs (pas de <cite>, pas de HTML) : uniquement du texte brut.`,
    }],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return extractJson(text);
   } catch (e) {
    const status = e?.status;
    const transient =
      status === 529 || status === 429 || (typeof status === "number" && status >= 500);
    if (!transient || attempt === 3) {
      console.log(`(erreur ${status ?? e?.message ?? e})`);
      return null;
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
   }
  }
  return null;
}

async function unsplashPhoto(city) {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  // Plusieurs requetes de repli pour les villes mal couvertes ; on abandonne
  // immediatement sur 429 (limite horaire Unsplash atteinte, offre gratuite 50/h).
  for (const q of [city, `${city} city`, `${city} cityscape`]) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=1&content_filter=high`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (res.status === 429) return null; // limite horaire : inutile d'insister
      if (!res.ok) continue;
      const p = (await res.json()).results?.[0];
      if (!p) continue;
      if (p.links?.download_location) {
        fetch(p.links.download_location, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
      }
      return { url: p.urls?.regular ?? p.urls?.full ?? null, credit: `Photo ${p.user?.name ?? ""} / Unsplash`.trim() };
    } catch {
      continue;
    }
  }
  return null;
}

let generated = 0, skipped = 0, deferred = 0, contentCalls = 0;
for (const dest of Object.values(dests)) {
  const hasContent = dest.origins.some((o) => bySlug.get(o.slug)?.intro);
  const knownImg = dest.origins.map((o) => bySlug.get(o.slug)?.image_url).find(Boolean) || null;

  // Déjà connue (contenu + photo) et pas de --force -> on saute (zéro token).
  if (!FORCE && hasContent && knownImg) {
    skipped++;
    continue;
  }

  // Plafond de generation par run atteint : on reporte au prochain run.
  const needsContent = FORCE || !hasContent;
  if (needsContent && MAX_NEW > 0 && contentCalls >= MAX_NEW) {
    deferred++;
    continue;
  }

  process.stdout.write(`${dest.dc}... `);
  const content = needsContent ? await genCityContent(dest.dc, dest.origins.map((o) => o.oc)) : null;
  if (needsContent) contentCalls++;

  // Pas de contenu (echec API ou JSON invalide) pour une NOUVELLE fiche : on ne
  // publie PAS de fiche vide, on reporte au prochain run.
  if (needsContent && !content?.intro) {
    console.log("contenu indisponible, reporte au prochain run");
    deferred++;
    continue;
  }
  const photo = knownImg ? { url: knownImg, credit: null } : await unsplashPhoto(dest.dc);

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
      row.intro = stripTags(content.intro);
      row.airlines = Array.isArray(content.airlines) ? content.airlines.map(stripTags) : [];
      row.duration = stripTags(content.duration);
      row.best_period = stripTags(content.bestPeriod);
      row.tips = Array.isArray(content.tips) ? content.tips.map(stripTags) : [];
    }
    if (content?.region) row.region = stripTags(content.region);
    if (photo?.url) { row.image_url = photo.url; if (photo.credit) row.image_credit = photo.credit; }

    const res = await fetch(`${SB}/rest/v1/routes?on_conflict=slug`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    });
    if (res.ok) ok++;
    else console.log(`\n  ERREUR ${o.slug} ${res.status}: ${await res.text()}`);
  }
  console.log(`OK (${ok}/${dest.origins.length}${content?.intro ? " +contenu" : ""}${photo?.url ? " +photo" : ""})`);
  generated++;
}

console.log(
  `\nTerminé. ${generated} destination(s) générée(s), ${skipped} déjà à jour, ` +
    `${deferred} reportée(s) au prochain run (plafond ${MAX_NEW}/run).`
);
