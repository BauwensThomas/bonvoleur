// Régénère des articles de blog longs et optimisés SEO directement dans Supabase.
// Utilise l'API Anthropic (clé dans .env.local). Remplace les anciens articles.
// Lancer : node scripts/generate-articles.mjs
//
// NB : l'agent "live" (lib/content.ts) ajoute en plus la recherche de sujet
// TENDANCE via web search ; ce script utilise une liste curée pour une
// régénération fiable et rapide.

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const SITE = { name: "BonVoleur", domain: "bonvoleur.com" };

const TOPICS = [
  "10 destinations soleil pas chères depuis Bruxelles ou Charleroi",
  "Tout sur le bagage cabine des compagnies low-cost (Ryanair, easyJet, Vueling)",
  "Erreurs de prix sur les vols : comment en profiter sans se faire avoir",
];

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" }, slug: { type: "string" }, excerpt: { type: "string" },
    meta_title: { type: "string" }, meta_description: { type: "string" }, content: { type: "string" },
    faq: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
  },
  required: ["title", "slug", "excerpt", "meta_title", "meta_description", "content", "faq"],
};

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70);

function prompt(topic) {
  return `Tu es le rédacteur en chef de ${SITE.name} (${SITE.domain}), un média de deals de vols pas chers pour la Belgique et la France. Tu écris pour être LU et pour RANKER sur Google.

Rédige un article de blog complet, riche et optimisé SEO sur le sujet : "${topic}".

Contraintes impératives :
- Français natif (BE/FR), ton complice, malin, direct, jamais corporate. Phrases courtes.
- INTERDIT : tiret long (em dash) et émoji, partout.
- Article TRES LONG et fouillé : viser 1800 à 2500 mots. Développe vraiment chaque section, avec exemples concrets, chiffres d'ordre de grandeur, listes, conseils actionnables.
- Structure Markdown claire : plusieurs sections "## " et sous-sections "### ", listes à puces, **gras** sur les points clés. PAS de titre H1 dans "content".
- Exemples de routes réelles depuis BRU (Bruxelles), CRL (Charleroi), CDG (Paris), LYS (Lyon).
- Inclure au moins 2 liens internes en Markdown : [inscris-toi gratuitement](/#inscription) et une route, ex. [vols pas chers Bruxelles - Barcelone](/vols-pas-chers/bruxelles-barcelone) ou [toutes nos routes](/vols-pas-chers).
- Termine le corps par un appel à s'inscrire à la newsletter.
- FAQ : 5 à 6 questions/réponses utiles (2 à 4 phrases). PAS dans "content", dans le champ "faq".
- "meta_title" max 60 caractères ; "meta_description" max 155 caractères ; "excerpt" 1 à 2 phrases ; "slug" court en minuscules avec tirets.
- N'invente pas de prix garantis : fourchettes ou ordres de grandeur ("aux alentours de").`;
}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const model = env.ANTHROPIC_MODEL || "claude-opus-4-8";
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Supprime les anciens articles.
const del = await sb.from("posts").delete().gte("created_at", "1970-01-01");
console.log(del.error ? `Suppression: ERREUR ${del.error.message}` : "Anciens articles supprimes.");

for (const topic of TOPICS) {
  process.stdout.write(`Generation : ${topic.slice(0, 50)}... `);
  const res = await client.messages.create({
    model, max_tokens: 16000, thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt(topic) }],
  });
  const block = res.content.find((b) => b.type === "text");
  const a = JSON.parse(block.text);
  const now = new Date().toISOString();
  const { error } = await sb.from("posts").insert({
    id: randomUUID(),
    slug: slugify(a.slug || a.title),
    title: a.title, excerpt: a.excerpt, content: a.content,
    faq: Array.isArray(a.faq) ? a.faq : [],
    cover_image: null, meta_title: a.meta_title, meta_description: a.meta_description,
    status: "published", author: "Thomas & l'équipe Bon Voleur",
    published_at: now, updated_at: now, created_at: now,
  });
  console.log(error ? `ERREUR ${error.message}` : `OK (${a.content.length} caracteres)`);
}
console.log("Termine.");
