// Génération d'article de blog pour l'agent content-publisher.
// Si ANTHROPIC_API_KEY est défini : appel à l'API Anthropic (article long + FAQ).
// Sinon : brouillon structuré local, pour que le pipeline fonctionne hors ligne.

import Anthropic from "@anthropic-ai/sdk";
import { getAll, insert, findOne } from "./db";
import { site } from "./site";
import type { AgentRun, FaqItem } from "./types";

export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
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

async function pickTopic(): Promise<string> {
  const posts = await getAll("posts");
  const used = new Set(posts.map((p) => p.title.toLowerCase()));
  const available = topics.filter((t) => !used.has(t.toLowerCase()));
  const pool = available.length > 0 ? available : topics;
  return pool[Math.floor(Math.random() * pool.length)];
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
    "content",
    "faq",
  ],
} as const;

export async function generateArticle(): Promise<GeneratedArticle> {
  const topic = await pickTopic();

  if (!process.env.ANTHROPIC_API_KEY) {
    return localDraft(topic);
  }

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

  const prompt = `Tu es le rédacteur de ${site.name} (${site.domain}), une newsletter de deals vols pas chers pour la Belgique et la France.

Rédige un article de blog complet et optimisé pour le SEO sur le sujet : "${topic}".

Contraintes impératives :
- Français natif (BE/FR), ton complice, malin, direct, jamais corporate.
- PAS de tiret long (em dash), PAS d'émoji.
- Article LONG : entre 1200 et 1800 mots, structuré avec des sous-titres en Markdown (## et ###).
- Contenu réellement utile et concret (conseils actionnables, exemples de routes depuis BRU, CRL, CDG, LYS).
- Termine le corps par un appel à s'inscrire à la newsletter.
- Ajoute une rubrique FAQ de 4 à 6 questions/réponses pertinentes pour le SEO (ne pas inclure la FAQ dans "content", elle va dans le champ "faq").
- "content" est en Markdown et NE contient PAS le titre H1 (il est géré à part).
- "meta_title" max 60 caractères, "meta_description" max 155 caractères.
- "excerpt" : 1 à 2 phrases d'accroche.
- "slug" : court, en minuscules, mots séparés par des tirets.
- N'invente pas de prix précis présentés comme garantis ; reste sur des ordres de grandeur ou des fourchettes.`;

  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse vide de l'API.");
  }
  const data = JSON.parse(textBlock.text) as GeneratedArticle;
  data.slug = slugify(data.slug || data.title);
  if (!Array.isArray(data.faq)) data.faq = [];
  return data;
}

// Exécute l'agent content-publisher : génère un article, l'enregistre en
// brouillon et journalise l'exécution. Utilisé par le cron et le bouton admin.
export async function runContentPublisher(
  trigger: "cron" | "manuel"
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  try {
    const article = await generateArticle();

    let slug = article.slug;
    if (await findOne("posts", (p) => p.slug === slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const now = new Date().toISOString();
    const post = await insert("posts", {
      slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      faq: article.faq,
      cover_image: null,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      status: "draft", // relecture humaine avant publication
      author: "Content Publisher",
      published_at: null,
      updated_at: now,
    });

    return insert("agent_runs", {
      agent_name: "content-publisher",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "draft",
      trigger,
      summary: `Article généré en brouillon : "${article.title}".`,
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
