// Génère les fiches PAR DESTINATION (ville d'arrivée) dans la table `routes`.
//  - Découvre les destinations depuis la liste surveillée ET depuis les deals
//    réellement trouvés (toute nouvelle route auto).
//  - SAUTE les destinations qui ont déjà une fiche (contenu + photo) -> aucun
//    token gaspillé. Utiliser --force pour tout régénérer.
//  - Contenu centré sur la VILLE (1 appel Claude par ville) + photo Unsplash.
// Local : node scripts/generate-routes.mjs   |  CI : variables d'env (secrets).

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { rehostImage } from "./rehost.mjs";

const FORCE = process.argv.includes("--force");
const FORCE_PHOTOS = process.argv.includes("--force-photos");
const CITY_FILTER = (() => {
  const idx = process.argv.indexOf("--city");
  return idx !== -1 ? process.argv[idx + 1]?.toLowerCase() : null;
})();

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
// Enrichissement : regenere le contenu des fiches dont l'intro est plus courte
// que ce seuil (0 = desactive). Sert a etoffer les fiches trop pauvres sans
// toucher aux fiches deja riches ; la photo existante est reutilisee.
const MIN_INTRO = parseInt(env.ROUTES_MIN_INTRO || "0", 10);

const SB = env.SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !SK) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
const sbHeaders = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const startedAt = new Date().toISOString();

// Tous les aéroports (actifs et inactifs) : pour les noms de villes dans WATCH.
const allAirports = await fetch(
  `${SB}/rest/v1/airports?select=iata,city`,
  { headers: sbHeaders },
).then((r) => (r.ok ? r.json() : [])).catch(() => []);
const ORIGIN = Object.fromEntries(
  allAirports.length
    ? allAirports.map((a) => [a.iata, a.city])
    : [["BRU","Bruxelles"],["CRL","Charleroi"],["CDG","Paris"],["LYS","Lyon"]],
);
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
// Clé = slug de la ville (pas l'IATA) pour regrouper FCO+CIA = Rome, CDG+ORY = Paris, etc.
const dests = {};
function addRoute(oIata, oCity, dIata, dCity) {
  if (!oCity || !dCity) return;
  const cityKey = slugify(dCity);
  if (!dests[cityKey]) dests[cityKey] = { d: dIata, dc: dCity, origins: [] };
  const slug = `${slugify(oCity)}-${slugify(dCity)}`;
  if (!dests[cityKey].origins.some((x) => x.slug === slug)) {
    dests[cityKey].origins.push({ o: oIata, oc: oCity, slug });
  }
}

// 1) Fiches déjà en base : source principale (toutes les routes, actives ou non).
const existing = await fetch(
  `${SB}/rest/v1/routes?select=slug,intro,image_url,tips,region,photos,origin_iata,origin_city,destination_iata,destination_city`,
  { headers: sbHeaders },
).then((r) => (r.ok ? r.json() : [])).catch(() => []);
const bySlug = new Map(existing.map((r) => [r.slug, r]));

for (const r of existing) {
  if (r.origin_iata && r.origin_city && r.destination_iata && r.destination_city) {
    addRoute(r.origin_iata, r.origin_city, r.destination_iata, r.destination_city);
  }
}

// Villes déjà connues (depuis la table routes) -> ne pas les recréer via WATCH/deals.
const knownCitySlugs = new Set(Object.keys(dests));

// 2) Liste surveillée : seulement les villes NOUVELLES (pas encore en base).
for (const [o, ds] of Object.entries(WATCH)) {
  for (const d of ds) {
    if (DEST[d] && !knownCitySlugs.has(slugify(DEST[d]))) {
      addRoute(o, ORIGIN[o], d, DEST[d]);
    }
  }
}
// 3) Deals réellement trouvés : seulement les villes NOUVELLES.
// Double garde : slug de ville ET IATA (évite "Copenhague" si "Copenhagen/CPH" déjà connu).
const knownIatas = new Set(Object.values(dests).map((d) => d.d));
const deals = await fetch(`${SB}/rest/v1/deals?select=origin,destination,is_hot`, { headers: sbHeaders })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);
for (const d of deals) {
  if (d.is_hot === false) continue;
  const o = parseLabel(d.origin), dd = parseLabel(d.destination);
  if (o && dd && !knownCitySlugs.has(slugify(dd.city)) && !knownIatas.has(dd.iata)) {
    addRoute(o.iata, o.city, dd.iata, dd.city);
    knownIatas.add(dd.iata);
    knownCitySlugs.add(slugify(dd.city));
  }
}
const AFFILIATE_MARKER = "Hébergement : [Booking.com]";

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
 "duration": "durée de vol vers ${city} exprimée en fourchette générale (ex. '2h30 à 4h selon l'aéroport de départ' ou 'environ 3h en direct, 8 à 12h avec escale') — ne pas mentionner un aéroport précis, rester valable quel que soit le point de départ",
 "bestPeriod": "meilleure période pour visiter ${city} : météo ET prix (mois les moins chers, et combien de temps a l'avance reserver)",
 "tips": ["4 à 5 conseils concrets et actionnables pour un voyage à ${city} (transfert aeroport vers le centre, bagages low cost, decalage horaire, formalites/visa si besoin, meilleur jour pour reserver...), dont OBLIGATOIREMENT un sur la MONNAIE : si ${city} est dans la zone euro, indique qu'on paie en euros (aucun change à prévoir) ; sinon donne un ordre de grandeur du taux de change (environ 1 euro = X en monnaie locale, et environ 1 unité de cette monnaie = Y euros), en précisant que c'est approximatif et variable"],
 "region": "la région de ${city} : exactement l'une de ces valeurs -> Europe, Afrique, Océan Indien, Moyen-Orient, Asie, Amérique du Nord, Amérique du Sud, Caraïbes, Océanie. Repères : Maurice/Réunion/Seychelles/Maldives/Madagascar = Océan Indien ; Golfe (Dubaï, Doha, Abu Dhabi, Riyad) + Jordanie = Moyen-Orient ; USA/Canada/Mexique = Amérique du Nord ; Brésil/Argentine/Pérou/Colombie/Chili = Amérique du Sud ; Rép. dominicaine/Cuba/Antilles = Caraïbes ; Maghreb et reste de l'Afrique = Afrique"
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

// Retourne 5 photos Unsplash en un seul appel : index 0 = bannière, index 1-4 = galerie.
// Garantit zéro doublon entre bannière et galerie.
// Lance une erreur RATE_LIMITED quand le quota horaire est épuisé (50 req/h en demo).
// Se stoppe proprement quand x-ratelimit-remaining <= 2 pour ne pas épuiser le quota.
async function unsplashBatch(city) {
  const key = env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const cityAscii = city.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const queries = [...new Set([city, cityAscii, `${cityAscii} city`, `${cityAscii} travel`])];
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=5&content_filter=high`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (res.status === 429) throw Object.assign(new Error("Rate limit Unsplash atteint"), { code: "RATE_LIMITED" });
      if (!res.ok) continue;
      const remaining = parseInt(res.headers.get("x-ratelimit-remaining") ?? "99", 10);
      if (remaining <= 2) throw Object.assign(new Error("Quota Unsplash presque epuise"), { code: "RATE_LIMITED" });
      const text = await res.text();
      if (!text.trimStart().startsWith("{")) throw Object.assign(new Error("Rate limit (reponse non-JSON)"), { code: "RATE_LIMITED" });
      const results = (JSON.parse(text).results) ?? [];
      if (results.length === 0) continue;
      return results
        .map((p) => ({ url: p.urls?.regular ?? p.urls?.full ?? null, credit: `${p.user?.name ?? ""} / Unsplash`.trim() }))
        .filter((p) => p.url);
    } catch (e) {
      if (e.code === "RATE_LIMITED") throw e;
      continue;
    }
  }
  return [];
}

let generated = 0, skipped = 0, deferred = 0, contentCalls = 0;
const generatedSlugs = [];
const generatedCities = [];
for (const dest of Object.values(dests)) {
  if (CITY_FILTER && dest.dc.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") !== CITY_FILTER) { skipped++; continue; }
  const hasContent = dest.origins.some(
    (o) => (bySlug.get(o.slug)?.intro?.length ?? 0) >= (MIN_INTRO || 1)
  );
  const knownImg = dest.origins.map((o) => bySlug.get(o.slug)?.image_url).find(Boolean) || null;
  const knownPhotos = dest.origins.map((o) => bySlug.get(o.slug)?.photos).find((p) => Array.isArray(p) && p.length > 0) || null;

  // Déjà connue (contenu + photo + galerie complete) et pas de --force -> vérifie juste les tips affiliés.
  if (!FORCE && !FORCE_PHOTOS && hasContent && knownImg && knownPhotos?.length >= 4) {
    for (const o of dest.origins) {
      const existing = bySlug.get(o.slug);
      const tips = Array.isArray(existing?.tips) ? existing.tips : [];
      if (tips.length > 0 && !tips.some((t) => t.includes(AFFILIATE_MARKER))) {
        const city = dest.dc;
        const cityEnc = encodeURIComponent(city);
        const isEurope = (existing?.region ?? "") === "Europe";
        const affiliateTips = [
          `Hébergement : [Booking.com](https://www.booking.com/searchresults.fr.html?ss=${cityEnc}&selected_currency=EUR) centralise les hôtels, appartements et gîtes à ${city} à tous les prix. Réserve tôt pour les meilleures options.`,
          `Activités sur place : [GetYourGuide](https://www.getyourguide.com/fr-fr/s/?q=${cityEnc}) regroupe les visites guidées, musées et excursions à ${city} avec réservation immédiate.`,
          ...(!isEurope ? [`Connectivité : achète une [carte eSIM Airalo](https://airalo.tp.st/EoUAdgZb) avant de partir pour rester connecté à ${city} sans frais de roaming. Quelques euros pour une semaine de data locale.`] : []),
          `Protection vol : avec les compagnies low cost, les retards arrivent. Si ton vol est retardé de plus de 3 heures, [AirHelp](https://airhelp.tp.st/nZiaMXbN) réclame jusqu'à 600 € d'indemnisation pour toi.`,
        ];
        await fetch(`${SB}/rest/v1/routes?slug=eq.${o.slug}`, {
          method: "PATCH",
          headers: { ...sbHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ tips: [...tips, ...affiliateTips], updated_at: new Date().toISOString() }),
        });
        console.log(`${o.slug} — tips affiliés ajoutés`);
      }
    }
    skipped++;
    continue;
  }

  // Plafond de generation par run atteint : on reporte au prochain run.
  const needsContent = FORCE || (!FORCE_PHOTOS && !hasContent);
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
  // Banniere + galerie depuis un seul batch Unsplash => zéro doublon garanti.
  let photo = knownImg && !FORCE_PHOTOS ? { url: knownImg, credit: null } : null;
  let gallery = knownPhotos?.length >= 4 && !FORCE_PHOTOS ? knownPhotos : null;

  if (!photo || !gallery) {
    let batch;
    try {
      batch = await unsplashBatch(dest.dc);
    } catch (e) {
      if (e.code === "RATE_LIMITED") {
        console.log(`\nRate limit Unsplash atteint sur ${dest.dc}. Relance le script dans 1h pour continuer.`);
        break;
      }
      batch = [];
    }
    if (!photo && batch[0]) {
      const url = await rehostImage(env, batch[0].url, "destinations", dest.dc);
      if (url) photo = { url, credit: batch[0].credit };
    }
    if (!gallery && batch.length >= 2) {
      gallery = [];
      for (let i = 0; i < Math.min(batch.length - 1, 4); i++) {
        const hosted = await rehostImage(env, batch[i + 1].url, "destinations", `${dest.dc}-gallery-${i + 1}`);
        if (hosted) gallery.push({ url: hosted, credit: batch[i + 1].credit });
      }
    }
  }

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
      const aiTips = Array.isArray(content.tips) ? content.tips.map(stripTags) : [];
      const city = dest.dc;
      const cityEnc = encodeURIComponent(city);
      const isEurope = (content.region ?? "") === "Europe";
      row.tips = [
        ...aiTips,
        `Hébergement : [Booking.com](https://www.booking.com/searchresults.fr.html?ss=${cityEnc}&selected_currency=EUR) centralise les hôtels, appartements et gîtes à ${city} à tous les prix. Réserve tôt pour les meilleures options.`,
        `Activités sur place : [GetYourGuide](https://www.getyourguide.com/fr-fr/s/?q=${cityEnc}) regroupe les visites guidées, musées et excursions à ${city} avec réservation immédiate.`,
        ...(!isEurope ? [`Connectivité : achète une [carte eSIM Airalo](https://airalo.tp.st/EoUAdgZb) avant de partir pour rester connecté à ${city} sans frais de roaming. Quelques euros pour une semaine de data locale.`] : []),
        `Protection vol : avec les compagnies low cost, les retards arrivent. Si ton vol est retardé de plus de 3 heures, [AirHelp](https://airhelp.tp.st/nZiaMXbN) réclame jusqu'à 600 € d'indemnisation pour toi.`,
      ];
    }
    if (content?.region) row.region = stripTags(content.region);
    if (photo?.url) { row.image_url = photo.url; if (photo.credit) row.image_credit = photo.credit; }
    if (gallery?.length) row.photos = gallery;

    const res = await fetch(`${SB}/rest/v1/routes?on_conflict=slug`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    });
    if (res.ok) ok++;
    else console.log(`\n  ERREUR ${o.slug} ${res.status}: ${await res.text()}`);
  }
  console.log(`OK (${ok}/${dest.origins.length}${content?.intro ? " +contenu" : ""}${photo?.url ? " +photo" : ""}${gallery?.length ? " +galerie" : ""})`);
  generated++;
  generatedSlugs.push(...dest.origins.map((o) => o.slug));
  generatedCities.push(dest.dc);
}

console.log(
  `\nTerminé. ${generated} destination(s) générée(s), ${skipped} déjà à jour, ` +
    `${deferred} reportée(s) au prochain run (plafond ${MAX_NEW}/run).`
);

// Invalide le cache des pages destinations (sinon le cache long ne verrait
// ces nouvelles/mises à jour fiches qu'à la prochaine expiration, voir
// src/lib/revalidate-destinations.ts) - seulement si quelque chose a changé.
if (generated > 0 && env.ADMIN_TOKEN) {
  try {
    const res = await fetch("https://www.bonvoleur.com/api/admin/revalidate-destinations", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    console.log(res.ok ? "Cache des destinations invalidé." : `Invalidation du cache échouée (HTTP ${res.status}).`);
  } catch (e) {
    console.log(`(invalidation du cache échouée: ${e?.message ?? e})`);
  }
}

// Journalise le run dans agent_runs -> visible dans l'historique des agents (admin).
try {
  await fetch(`${SB}/rest/v1/agent_runs`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({
      id: randomUUID(),
      agent_name: "seo-route",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: generated > 0 ? "success" : "draft",
      trigger: "auto",
      summary: generatedCities.length
        ? `${generated} fiche(s) générée(s) : ${generatedCities.join(", ")}. ${skipped} déjà à jour, ${deferred} reportée(s).`
        : `${generated} fiche(s) générée(s), ${skipped} déjà à jour, ${deferred} reportée(s).`,
      output_ref: generatedCities.length ? generatedCities.join(", ") : null,
      error: null,
    }),
  });
} catch (e) {
  console.log(`(log du run echoue: ${e?.message ?? e})`);
}
