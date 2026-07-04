// Génération d'article de blog pour l'agent content-publisher.
// Si ANTHROPIC_API_KEY est défini : appel à l'API Anthropic (article long + FAQ).
// Sinon : brouillon structuré local, pour que le pipeline fonctionne hors ligne.

import Anthropic from "@anthropic-ai/sdk";
import { getAll, insert, findOne } from "./db";
import { site } from "./site";
import { DESTINATIONS } from "./destinations";
import { getDestinations } from "./routes";
import { rehostImage } from "./rehost";
import { notifySocial } from "./social";
import type { AgentRun, FaqItem } from "./types";

async function getActiveAirportNames(): Promise<string[]> {
  try {
    const rows = await getAll("airports");
    const NAMES: Record<string, string> = {
      BRU: "Bruxelles", CRL: "Charleroi", LGG: "Liège", ANR: "Anvers", OST: "Ostende",
      CDG: "Paris CDG", ORY: "Paris Orly", BVA: "Paris Beauvais",
      LYS: "Lyon", NCE: "Nice", MRS: "Marseille", BOD: "Bordeaux",
      TLS: "Toulouse", NTE: "Nantes", LIL: "Lille", MPL: "Montpellier", SXB: "Strasbourg",
    };
    return rows
      .filter((r: { active: boolean }) => r.active)
      .map((r: { iata: string }) => NAMES[r.iata] ?? r.iata);
  } catch {
    return ["Bruxelles", "Charleroi", "Paris CDG", "Lyon"];
  }
}

// Routes actives : destinations disponibles sur le site avec leurs origines actives.
async function getActiveRoutes(): Promise<string> {
  try {
    const airports = await getAll("airports");
    const activeIatas = new Set(
      airports.filter((a: { active: boolean }) => a.active).map((a: { iata: string }) => a.iata)
    );
    const routes = await getAll("routes");
    const byDest = new Map<string, Set<string>>();
    for (const r of routes) {
      if (!activeIatas.has(r.origin_iata)) continue;
      const dest: string = r.destination_city ?? "";
      if (!dest) continue;
      if (!byDest.has(dest)) byDest.set(dest, new Set());
      byDest.get(dest)!.add(r.origin_city ?? r.origin_iata);
    }
    return [...byDest.entries()]
      .map(([dest, origins]) => `${dest} (depuis ${[...origins].join(", ")})`)
      .join(" | ");
  } catch {
    return "";
  }
}

// Deals recents : destinations avec activite recente, SANS prix ni dates.
// Sert a creer du FOMO et pousser a l'inscription premium.
async function getRecentDealDestinations(): Promise<string[]> {
  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const deals = await getAll("deals");
    const recent = deals.filter((d: { created_at: string }) => d.created_at >= since);
    const destCount = new Map<string, number>();
    for (const d of recent) {
      const dest: string = d.destination ?? "";
      if (!dest) continue;
      destCount.set(dest, (destCount.get(dest) ?? 0) + 1);
    }
    return [...destCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([dest]) => dest);
  } catch {
    return [];
  }
}

// Detecte un texte francais sorti SANS accents (bug ponctuel de generation).
const ACCENT_RE = /[àâäçéèêëîïôöùûüœ]/i;
function looksUnaccented(text: string): boolean {
  return typeof text === "string" && text.length > 60 && !ACCENT_RE.test(text);
}

// Filet de securite : reaccentue un texte via un appel bon marche, sans rien
// changer d'autre. Utilise quand le modele rend du francais sans accents.
async function reaccentuate(client: Anthropic, text: string): Promise<string> {
  if (!text || ACCENT_RE.test(text)) return text;
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 16000,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: `Ajoute UNIQUEMENT les accents francais manquants a ce texte. Ne change RIEN d'autre : ni les mots, ni la ponctuation, ni le Markdown, ni les liens, ni les majuscules, ni les retours a la ligne. Ne traduis pas, n'ajoute aucun commentaire ni delimiteur. Reponds UNIQUEMENT avec le texte corrige.\n\n${text}`,
        },
      ],
    });
    const out = res.content.find((b) => b.type === "text");
    let fixed = out && out.type === "text" ? out.text.trim() : null;
    if (!fixed) return text;
    fixed = fixed.replace(/^---\s*(\n|$)/, "").replace(/\n---\s*$/, "").trim();
    return fixed;
  } catch {
    return text; // en cas d'echec, on garde le texte (mieux que rien)
  }
}

// Sécurité : réécrit tout lien interne /vols-pas-chers/... vers une fiche
// DESTINATION valide (retire un prefixe d'aeroport de depart, sinon renvoie au
// hub). Garantit qu'un article généré n'a aucun lien cassé ni redirigé.
// La liste des slugs valides vient de la base (toutes les destinations, y
// compris celles ajoutees automatiquement) + les destinations codees en dur.
const ORIGIN_SLUGS = ["bruxelles", "charleroi", "paris", "lyon"];
async function validDestSlugs(): Promise<Set<string>> {
  const set = new Set(Object.values(DESTINATIONS).map((d) => d.slug));
  try {
    for (const d of await getDestinations()) set.add(d.slug);
  } catch {
    /* base indispo : on garde la liste codee en dur */
  }
  return set;
}
// Retire les balises (notamment <cite ...> ajoutées par la recherche web), en
// gardant le texte. Évite que des balises fuient dans le contenu publié.
function stripTags(s: string): string {
  return s.replace(/<\/?[^>]+>/g, "").replace(/ {2,}/g, " ");
}

function sanitizeLinks(md: string, valid: Set<string>): string {
  return md.replace(/\/vols-pas-chers\/([a-z0-9-]+)/g, (_m, slug: string) => {
    let s = slug;
    for (const o of ORIGIN_SLUGS) {
      if (s.startsWith(`${o}-`)) {
        s = s.slice(o.length + 1);
        break;
      }
    }
    return valid.has(s) ? `/vols-pas-chers/${s}` : "/vols-pas-chers";
  });
}

export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  image_query: string;
  faq: FaqItem[];
}

const topics = [
  "Les meilleures périodes pour trouver des vols pas chers depuis la Belgique",
  "10 destinations soleil pas chères depuis Bruxelles ou Charleroi",
  "Comment voyager léger : tout sur le bagage cabine des compagnies low-cost",
  "Week-ends en Europe à petit prix au départ de la Belgique et de la France",
  "Erreurs de prix sur les vols : comment en profiter sans se faire avoir",
  "Aéroports belges et français : lequel choisir pour payer moins cher",
  "City-trips pas chers : nos destinations préférées pour un long week-end",
  "Voyager hors saison : payer son vol jusqu'à 50% moins cher",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

// Anti-doublon de CONTENU : si un nouvel article partage trop de mots avec un
// article existant, c'est probablement le même sujet -> on régénère.
// Seuil de similarité (Jaccard sur les mots significatifs de 6+ lettres).
const SIMILARITY_THRESHOLD = 0.28;

function wordSet(text: string): Set<string> {
  return new Set(
    (text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .match(/[a-z]{6,}/g) ?? [])
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter);
}

async function maxSimilarity(content: string): Promise<number> {
  const set = wordSet(content);
  const posts = await getAll("posts");
  let max = 0;
  for (const p of posts) {
    const s = jaccard(set, wordSet(p.content));
    if (s > max) max = s;
  }
  return max;
}

// Titres des articles publiés/créés depuis moins de N jours (anti-répétition).
async function recentTitles(days = 30): Promise<string[]> {
  const posts = await getAll("posts");
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return posts
    .filter((p) => {
      const d = new Date(p.published_at ?? p.created_at).getTime();
      return d >= since;
    })
    .map((p) => p.title);
}

// Sujet de secours (liste curée), en évitant ceux des 30 derniers jours.
async function pickTopic(): Promise<string> {
  const recent = (await recentTitles(30)).map((t) => t.toLowerCase());
  const available = topics.filter((t) => !recent.includes(t.toLowerCase()));
  const pool = available.length > 0 ? available : topics;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Cherche un sujet TENDANCE via la recherche web (ce qui est demandé en ce
// moment côté voyage/vols), en évitant les sujets récents. Null si indisponible.
async function pickTrendingTopic(recent: string[]): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    // Appel court (recherche d'un titre) : Haiku, 5x moins cher.
    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
    const res = await withRetry(() => client.messages.create({
      model,
      max_tokens: 1200,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Tu écris pour ${site.name}, un blog de vols pas chers pour la Belgique et la France. Cherche sur le web les sujets de voyage et de vols les plus recherchés / tendance en ce moment (saison actuelle, destinations populaires, vacances scolaires, événements). Propose UN seul titre d'article de blog, en français, accrocheur et optimisé SEO, concret, lié aux vols pas chers depuis la Belgique ou la France. N'utilise AUCUN de ces sujets déjà traités récemment : ${recent.join(" ; ") || "(aucun)"}. Évite absolument les sujets fourre-tout du type « guide complet », « tout savoir » ou « le guide ultime » qui recoupent plusieurs articles : choisis un angle PRÉCIS et original (une destination donnée, une compagnie, une période ou un événement précis, une astuce concrète). Réponds UNIQUEMENT par le titre, sans guillemets ni explication.`,
        },
      ],
    }), "sujet tendance");
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join(" ")
      .trim();
    const title = text
      .split("\n")
      .map((s) => s.trim().replace(/^["'#\s-]+|["']+$/g, ""))
      .filter(Boolean)
      .pop();
    return title ? title.slice(0, 90) : null;
  } catch {
    return null; // pas d'accès web search ou erreur : on retombe sur la liste curée
  }
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    excerpt: { type: "string" },
    meta_title: { type: "string" },
    meta_description: { type: "string" },
    image_query: { type: "string" },
    content: { type: "string" },
    faq: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: [
    "title",
    "slug",
    "excerpt",
    "meta_title",
    "meta_description",
    "image_query",
    "content",
    "faq",
  ],
} as const;

// Réessaie un appel sur erreur transitoire (529 surcharge, 429, 5xx) avec un
// backoff exponentiel. Évite qu'un créneau cron rate à cause d'un pic de charge.
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 4
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";
      const transient =
        status === 529 ||
        status === 429 ||
        (typeof status === "number" && status >= 500) ||
        /overload/i.test(msg);
      if (!transient || i === attempts - 1) throw err;
      const waitMs = 2000 * 2 ** i; // 2s, 4s, 8s
      console.warn(
        `[content] ${label} : erreur transitoire (${status ?? msg}), nouvel essai dans ${waitMs / 1000}s`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

// Collecte des faits RÉELS via la recherche web, pour ancrer l'article (mêmes
// types d'infos que les pages route : compagnies, durées, périodes, fourchettes).
async function gatherFacts(topic: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return "";
  try {
    const client = new Anthropic();
    // Collecte de faits (recherche web) : Haiku, 5x moins cher.
    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
    const res = await withRetry(() => client.messages.create({
      model,
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Recherche sur le web des informations FACTUELLES et vérifiables utiles pour un article sur : "${topic}" (contexte : vols pas chers depuis la Belgique et la France, aéroports BRU, CRL, CDG, LYS). Donne une liste de faits concrets et exacts : compagnies aériennes réelles, durées de vol, meilleures périodes, fourchettes de prix réalistes, règles de bagages cabine, etc. N'invente rien. Français, sans émoji, sans tiret long.`,
        },
      ],
    }), "faits web");
    return stripTags(
      res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n")
        .trim()
    );
  } catch {
    return "";
  }
}

// Photo d'illustration de l'article via Unsplash (URL hébergée). Renvoie null
// sans clé ou en cas d'échec (l'article reste publiable sans image).
async function unsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query) {
    console.warn("[unsplash] clé manquante ou query vide");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) {
      console.warn(`[unsplash] API ${res.status} pour "${query}"`);
      return null;
    }
    const results = (await res.json())?.results ?? [];
    if (!results.length) {
      console.warn(`[unsplash] aucun résultat pour "${query}"`);
      return null;
    }
    // Choisit aléatoirement parmi les résultats pour éviter les photos répétées
    const p = results[Math.floor(Math.random() * results.length)];
    if (p.links?.download_location) {
      fetch(p.links.download_location, {
        headers: { Authorization: `Client-ID ${key}` },
      }).catch(() => {});
    }
    return p.urls?.regular ?? p.urls?.full ?? null;
  } catch {
    return null;
  }
}

export async function generateArticle(): Promise<GeneratedArticle> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return localDraft(await pickTopic());
  }

  // 1) Données réelles du site (en parallèle pour gagner du temps).
  const [activeAirports, activeRoutes, recentDealDests] = await Promise.all([
    getActiveAirportNames(),
    getActiveRoutes(),
    getRecentDealDestinations(),
  ]);

  // 2) Sujet : on tente un sujet tendance (recherche web), sinon liste curée.
  //    Dans les deux cas, on évite les sujets traités depuis moins de 30 jours.
  const recent = await recentTitles(30);
  const topic = (await pickTrendingTopic(recent)) ?? (await pickTopic());

  // 3) Faits réels (recherche web) à intégrer dans l'article.
  const facts = await gatherFacts(topic);

  // 3) Articles déjà publiés : on les donne au modèle pour qu'il choisisse un
  //    angle DIFFÉRENT et ne rabâche pas les mêmes sections.
  const existing = (await getAll("posts"))
    .map((p) => `- "${p.title}" : ${p.excerpt ?? ""}`)
    .join("\n");

  const client = new Anthropic();
  // Article long optimise SEO : Sonnet 4.6 (bon rapport qualite/cout, ~1,7x
  // moins cher qu'Opus). Surchargeable via ANTHROPIC_MODEL.
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const prompt = `Tu es le rédacteur en chef de ${site.name} (${site.domain}), un média de deals de vols pas chers pour la Belgique et la France. Tu écris pour être LU et pour RANKER sur Google.

Rédige un article de blog complet, riche et optimisé SEO sur le sujet : "${topic}".

${facts ? `INFORMATIONS FACTUELLES VÉRIFIÉES (issues d'une recherche web) à intégrer quand c'est pertinent, sans rien inventer en plus :\n${facts}\n` : ""}
${activeRoutes ? `DESTINATIONS RÉELLEMENT DISPONIBLES SUR LE SITE (routes avec aéroport actif) : utilise cette liste pour citer des exemples concrets et vrais. Ne cite que des destinations de cette liste quand tu donnes des exemples de routes.\n${activeRoutes}\n` : ""}
${recentDealDests.length > 0 ? `DESTINATIONS AVEC DES BONS PLANS RÉCENTS (14 derniers jours) : ${recentDealDests.join(", ")}. Tu peux mentionner ces destinations comme "des destinations qui ont récemment eu des bons plans" ou "des vols en promo repérés ces derniers jours" SANS jamais citer de prix ni de dates précises. L'objectif est de créer de l'envie et du FOMO pour pousser le lecteur à s'inscrire à la newsletter premium. Exemple de formulation : "Des bons plans ont récemment été repérés vers [destination] - exactement le genre d'alerte que nos abonnés reçoivent en premier."\n` : ""}
${existing ? `ARTICLES DÉJÀ PUBLIÉS sur le blog. Tu dois écrire un article NETTEMENT DIFFÉRENT et complémentaire : angle distinct, sections et exemples qui ne se recoupent pas avec ceux-ci. Ne réécris pas un "guide complet" générique qui répète ces sujets :\n${existing}\n` : ""}
Style attendu (identique à nos pages de route) : factuel et concret, avec de vraies compagnies aériennes, des durées de vol réalistes, des meilleures périodes, des fourchettes de prix (jamais de prix garanti), des conseils actionnables.

Contraintes impératives :
- Français natif (BE/FR), ton complice, malin, direct, jamais corporate. Phrases courtes.
- INTERDIT : tiret long (em dash) et émoji, partout. OBLIGATOIRE : français correct avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù...), jamais de texte sans accents.
- Article TRES LONG et fouillé : viser 1800 à 2500 mots. C'est important pour le SEO : développe vraiment chaque section, donne des exemples concrets, des chiffres d'ordre de grandeur, des listes, des conseils actionnables.
- Structure Markdown claire : plusieurs sections "## " et sous-sections "### ", des listes à puces, du **gras** sur les points clés. NE PAS mettre de titre H1 dans "content" (le H1 est géré à part).
- Couvre le sujet en profondeur : contexte, conseils pratiques, exemples de routes réelles depuis nos aéroports en Belgique et en France, erreurs à éviter, astuces de réservation, bagages, périodes idéales. Aéroports actuellement actifs sur le site (les seuls que tu peux citer) : ${activeAirports.join(", ")}. Un aéroport absent de cette liste n'est pas disponible sur le site : le citer créerait une fausse promesse pour le lecteur.
- Inclure au moins 2 liens internes en Markdown vers des pages du site : la page d'inscription [inscris-toi gratuitement](/#inscription) ET un lien vers nos fiches destinations.
- Intègre 2 à 3 liens affiliés naturellement dans le texte (jamais dans les 2 premiers paragraphes, jamais en bloc, toujours avec une ancre de texte naturelle). Choisis selon le sujet : [Booking.com](https://www.booking.com/index.fr.html?selected_currency=EUR) pour l'hébergement, [GetYourGuide](https://www.getyourguide.com/fr-fr/) pour les activités, [Kiwi.com](https://kiwi.tp.st/v3Xycmps) pour comparer les vols, [AirHelp](https://airhelp.tp.st/nZiaMXbN) si les retards ou annulations sont évoqués, [DiscoverCars](https://www.discovercars.com/fr) si la voiture est mentionnée, [Kiwitaxi](https://kiwitaxi.tp.st/nEAHNURD) pour les transferts aéroport. Pour ce dernier : si l'article porte sur une ville d'arrivée précise, lie vers SA fiche (URL = la ville uniquement, ex. un article sur Tirana -> [vols vers Tirana](/vols-pas-chers/tirana) ; notre système redirige automatiquement vers le hub si cette fiche n'existe pas encore). Sinon, lie simplement vers [toutes nos destinations](/vols-pas-chers). NE lie JAMAIS vers une ville SANS RAPPORT avec le sujet juste parce qu'elle sert d'exemple, et n'utilise JAMAIS d'URL du type /vols-pas-chers/ville-depart-ville-arrivee.
- Termine le corps par un appel clair à s'inscrire à la newsletter.
- Rubrique FAQ : 5 à 6 questions/réponses utiles et recherchées (réponses de 2 à 4 phrases). NE PAS l'inclure dans "content" : elle va dans le champ "faq".
- "meta_title" : max 60 caractères, accrocheur, avec le mot-clé. "meta_description" : max 155 caractères.
- "excerpt" : 1 à 2 phrases d'accroche.
- "slug" : court, minuscules, mots séparés par des tirets.
- "image_query" : 2 à 4 mots EN ANGLAIS très spécifiques au sujet (ville, monument, paysage précis). Obligatoire : la requête doit nommer un lieu, une activité ou un objet concret (ex. "Lisbon yellow tram", "Tirana Albania castle", "Lyon France river"). INTERDIT : requêtes génériques comme "airplane travel", "vacation beach", "flight airport".
- N'invente pas de prix présentés comme garantis : reste sur des fourchettes ou des ordres de grandeur ("aux alentours de", "à partir d'environ").
- Si le pays de la destination utilise une monnaie autre que l'euro, donne un ordre de grandeur du taux de change : environ combien vaut 1 € dans cette monnaie, ET environ combien vaut 1 unité de cette monnaie en euros. Précise que c'est approximatif et variable (ex. "environ 1 € = X, soit 1 X = Y €, à titre indicatif").

RAPPEL FINAL CRITIQUE : TOUT le texte (title, excerpt, content, meta_title, meta_description, FAQ) doit être en français avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù, ë, ï, œ...). Ne renvoie JAMAIS de texte sans accents.`;

  const response = await withRetry(
    () =>
      client.messages.create({
        model,
        max_tokens: 16000,
        thinking: { type: "disabled" },
        output_config: { format: { type: "json_schema", schema } },
        messages: [{ role: "user", content: prompt }],
      }),
    "generation article"
  );

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse vide de l'API.");
  }
  const data = JSON.parse(textBlock.text) as GeneratedArticle;
  data.slug = slugify(data.slug || data.title);
  if (!Array.isArray(data.faq)) data.faq = [];

  // Filet de sécurité : si l'IA a oublié les liens affiliés, on en injecte 2.
  const AFFILIATE_DOMAINS = ["booking.com", "getyourguide.com", "kiwi.com", "airhelp.com", "discovercars.com", "kiwitaxi.com", "hostelworld.com", "viator.com", "airalo.com"];
  const affiliateCount = AFFILIATE_DOMAINS.filter((d) => data.content.includes(d)).length;
  if (affiliateCount < 2) {
    data.content += `\n\n## Pour préparer ton voyage\n\nPour comparer et réserver, quelques outils incontournables : [Kiwi.com](https://kiwi.tp.st/v3Xycmps) pour trouver les meilleures combinaisons de vols, [Booking.com](https://www.booking.com/index.fr.html?selected_currency=EUR) pour l'hébergement à tous les prix, et [DiscoverCars](https://www.discovercars.com/fr) pour louer une voiture sans frais cachés sur place. Et si ton vol est retardé de plus de 3h, [AirHelp](https://airhelp.tp.st/nZiaMXbN) réclame jusqu'à 600 € d'indemnisation pour toi.`;
  }

  // Filet de securite : si le modele a rendu l'article SANS accents (observe
  // avec la sortie structuree json_schema), on reaccentue avant publication.
  if (looksUnaccented(data.content)) {
    data.title = await reaccentuate(client, data.title);
    data.excerpt = await reaccentuate(client, data.excerpt);
    data.content = await reaccentuate(client, data.content);
    data.meta_title = await reaccentuate(client, data.meta_title);
    data.meta_description = await reaccentuate(client, data.meta_description);
    data.faq = await Promise.all(
      data.faq.map(async (f) => ({
        question: await reaccentuate(client, f.question),
        answer: await reaccentuate(client, f.answer),
      }))
    );
  }
  return data;
}

// Exécute l'agent content-publisher : génère un article, le PUBLIE directement
// et journalise l'exécution. Utilisé par le cron et le bouton admin.
const PUBLISH_INTERVAL_DAYS = 3;

export async function runContentPublisher(
  trigger: "cron" | "manuel"
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();

  // Pour le cron quotidien : skip si le dernier article date de moins de 3 jours.
  // Permet de rattraper un raté Vercel le lendemain sans surpublier.
  if (trigger === "cron") {
    const posts = await getAll("posts");
    const last = posts
      .filter((p) => p.published_at)
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];
    if (last?.published_at) {
      const daysSince =
        (Date.now() - new Date(last.published_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < PUBLISH_INTERVAL_DAYS) {
        return insert("agent_runs", {
          agent_name: "content-publisher",
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          status: "skip",
          trigger,
          summary: `Dernier article il y a ${daysSince.toFixed(1)}j - prochain dans ${(PUBLISH_INTERVAL_DAYS - daysSince).toFixed(1)}j.`,
          output_ref: null,
          error: null,
        });
      }
    }
  }

  try {
    // Génère, et si le contenu ressemble trop à un article existant, régénère
    // (jusqu'à 5 essais) pour éviter les doublons.
    let article = await generateArticle();
    for (let attempt = 1; attempt < 5; attempt += 1) {
      if ((await maxSimilarity(article.content)) <= SIMILARITY_THRESHOLD) break;
      article = await generateArticle();
    }

    let slug = article.slug;
    if (await findOne("posts", (p) => p.slug === slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const now = new Date().toISOString();
    const post = await insert("posts", {
      slug,
      title: article.title,
      excerpt: article.excerpt,
      content: sanitizeLinks(stripTags(article.content), await validDestSlugs()),
      faq: article.faq,
      cover_image: await rehostImage(
        await unsplashImage(article.image_query || article.title),
        "articles",
        slug
      ),
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      status: "published", // publication directe (relecture a posteriori si besoin)
      author: "Thomas & l'équipe BonVoleur",
      published_at: now,
      updated_at: now,
    });

    // Réseaux sociaux : prévient Make (webhook) pour publier sur IG/FB.
    // Ne lève jamais -> ne bloque pas la publication de l'article.
    await notifySocial(post);

    return insert("agent_runs", {
      agent_name: "content-publisher",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      trigger,
      summary: `Article généré et publié : "${article.title}".`,
      output_ref: post.id,
      error: null,
    });
  } catch (err) {
    return insert("agent_runs", {
      agent_name: "content-publisher",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "error",
      trigger,
      summary: "Échec de la génération de l'article.",
      output_ref: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Brouillon local de secours (sans appel API).
function localDraft(topic: string): GeneratedArticle {
  const content = `## Introduction

${topic} : voici notre guide complet pour voyager moins cher depuis la Belgique et la France. Cet article est un brouillon généré localement. Connecte une clé ANTHROPIC_API_KEY pour produire automatiquement un article long et optimisé SEO.

## Ce qu'il faut retenir

- Compare toujours plusieurs aéroports de départ (BRU, CRL, CDG, LYS).
- Reste flexible sur les dates : quelques jours d'écart peuvent diviser le prix.
- Active les alertes pour réserver dès qu'un bon prix tombe.

## Nos conseils concrets

Développe ici les conseils liés au sujet. Ajoute des exemples de routes et des fourchettes de prix réalistes.

## Conclusion

Pour ne rater aucun bon plan, inscris-toi gratuitement à la newsletter ${site.name}.`;

  return {
    title: topic,
    slug: slugify(topic),
    excerpt:
      "Brouillon généré localement. Relis et complète avant publication.",
    meta_title: topic.slice(0, 60),
    meta_description:
      "Guide pour voyager moins cher depuis la Belgique et la France.".slice(
        0,
        155
      ),
    image_query: "travel airplane",
    content,
    faq: [
      {
        question: "Comment trouver des vols pas chers depuis la Belgique ?",
        answer:
          "Compare plusieurs aéroports, reste flexible sur les dates et active les alertes de BonVoleur.",
      },
      {
        question: "Quand réserver pour payer moins cher ?",
        answer:
          "En général plusieurs semaines à l'avance et hors vacances scolaires, mais les bons plans peuvent tomber à tout moment.",
      },
    ],
  };
}
