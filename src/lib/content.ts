// Génération d'article de blog pour l'agent content-publisher.
// Si ANTHROPIC_API_KEY est défini : appel à l'API Anthropic (article long + FAQ).
// Sinon : brouillon structuré local, pour que le pipeline fonctionne hors ligne.

import Anthropic from "@anthropic-ai/sdk";
import { getAll, insert, findOne } from "./db";
import { site } from "./site";
import { DESTINATIONS } from "./destinations";
import { getDestinations } from "./routes";
import type { AgentRun, FaqItem } from "./types";

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
const SIMILARITY_THRESHOLD = 0.22;

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
    const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
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
    const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
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
    return res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}

// Photo d'illustration de l'article via Unsplash (URL hébergée). Renvoie null
// sans clé ou en cas d'échec (l'article reste publiable sans image).
async function unsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return null;
    const p = (await res.json())?.results?.[0];
    if (!p) return null;
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

  // 1) Sujet : on tente un sujet tendance (recherche web), sinon liste curée.
  //    Dans les deux cas, on évite les sujets traités depuis moins de 30 jours.
  const recent = await recentTitles(30);
  const topic = (await pickTrendingTopic(recent)) ?? (await pickTopic());

  // 2) Faits réels (recherche web) à intégrer dans l'article.
  const facts = await gatherFacts(topic);

  // 3) Articles déjà publiés : on les donne au modèle pour qu'il choisisse un
  //    angle DIFFÉRENT et ne rabâche pas les mêmes sections.
  const existing = (await getAll("posts"))
    .map((p) => `- "${p.title}" : ${p.excerpt ?? ""}`)
    .join("\n");

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

  const prompt = `Tu es le rédacteur en chef de ${site.name} (${site.domain}), un média de deals de vols pas chers pour la Belgique et la France. Tu écris pour être LU et pour RANKER sur Google.

Rédige un article de blog complet, riche et optimisé SEO sur le sujet : "${topic}".

${facts ? `INFORMATIONS FACTUELLES VÉRIFIÉES (issues d'une recherche web) à intégrer quand c'est pertinent, sans rien inventer en plus :\n${facts}\n` : ""}
${existing ? `ARTICLES DÉJÀ PUBLIÉS sur le blog. Tu dois écrire un article NETTEMENT DIFFÉRENT et complémentaire : angle distinct, sections et exemples qui ne se recoupent pas avec ceux-ci. Ne réécris pas un "guide complet" générique qui répète ces sujets :\n${existing}\n` : ""}
Style attendu (identique à nos pages de route) : factuel et concret, avec de vraies compagnies aériennes, des durées de vol réalistes, des meilleures périodes, des fourchettes de prix (jamais de prix garanti), des conseils actionnables.

Contraintes impératives :
- Français natif (BE/FR), ton complice, malin, direct, jamais corporate. Phrases courtes.
- INTERDIT : tiret long (em dash) et émoji, partout. OBLIGATOIRE : français correct avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù...), jamais de texte sans accents.
- Article TRES LONG et fouillé : viser 1800 à 2500 mots. C'est important pour le SEO : développe vraiment chaque section, donne des exemples concrets, des chiffres d'ordre de grandeur, des listes, des conseils actionnables.
- Structure Markdown claire : plusieurs sections "## " et sous-sections "### ", des listes à puces, du **gras** sur les points clés. NE PAS mettre de titre H1 dans "content" (le H1 est géré à part).
- Couvre le sujet en profondeur : contexte, conseils pratiques, exemples de routes réelles depuis BRU (Bruxelles), CRL (Charleroi), CDG (Paris), LYS (Lyon), erreurs à éviter, astuces de réservation, bagages, périodes idéales.
- Inclure au moins 2 liens internes en Markdown vers des pages du site : la page d'inscription [inscris-toi gratuitement](/#inscription) et une fiche DESTINATION pertinente (URL = la ville d'arrivée uniquement), par exemple [vols pas chers vers Barcelone](/vols-pas-chers/barcelone), [vols pas chers vers Lisbonne](/vols-pas-chers/lisbonne) ou [voir toutes nos routes](/vols-pas-chers). N'utilise JAMAIS d'URL du type /vols-pas-chers/ville-depart-ville-arrivee.
- Termine le corps par un appel clair à s'inscrire à la newsletter.
- Rubrique FAQ : 5 à 6 questions/réponses utiles et recherchées (réponses de 2 à 4 phrases). NE PAS l'inclure dans "content" : elle va dans le champ "faq".
- "meta_title" : max 60 caractères, accrocheur, avec le mot-clé. "meta_description" : max 155 caractères.
- "excerpt" : 1 à 2 phrases d'accroche.
- "slug" : court, minuscules, mots séparés par des tirets.
- "image_query" : 2 à 4 mots EN ANGLAIS décrivant une photo d'illustration qui colle à l'article (ex. "Lisbon tram", "airplane window view", "Barcelona skyline"). Vise une image qui représente vraiment le sujet de l'article.
- N'invente pas de prix présentés comme garantis : reste sur des fourchettes ou des ordres de grandeur ("aux alentours de", "à partir d'environ").`;

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
  return data;
}

// Exécute l'agent content-publisher : génère un article, le PUBLIE directement
// et journalise l'exécution. Utilisé par le cron et le bouton admin.
export async function runContentPublisher(
  trigger: "cron" | "manuel"
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  try {
    // Génère, et si le contenu ressemble trop à un article existant, régénère
    // (jusqu'à 3 essais) pour éviter les doublons.
    let article = await generateArticle();
    for (let attempt = 1; attempt < 3; attempt += 1) {
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
      content: sanitizeLinks(article.content, await validDestSlugs()),
      faq: article.faq,
      cover_image: await unsplashImage(article.image_query || article.title),
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      status: "published", // publication directe (relecture a posteriori si besoin)
      author: "Thomas & l'équipe BonVoleur",
      published_at: now,
      updated_at: now,
    });

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
