// Exécute l'agent seo-suggester : analyse les opportunités détectées
// (seo-opportunities.ts) et génère de vraies propositions de correction via
// l'API Anthropic, comme runContentPublisher() dans content.ts (même pattern :
// route Vercel cron -> fonction TypeScript -> appel direct à l'API, journalisé
// dans agent_runs). Ne publie/applique jamais rien : dépose en `pending`.
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { getAll, insert, findOne } from "./db";
import { detectSeoOpportunities, classifyPage, pageSlug, type Opportunity } from "./seo-opportunities";
import { destinationSlug } from "./routes";
import { sendEmail } from "./email";
import { seoSuggestionsAlertEmail } from "./email-templates";
import type { AgentRun, SeoSuggestionType } from "./types";

const MAX_PAGES_PER_RUN = 10;

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";
      const transient =
        status === 529 || status === 429 || (typeof status === "number" && status >= 500) || /overload/i.test(msg);
      if (!transient || i === attempts - 1) throw err;
      const waitMs = 2000 * 2 ** i;
      console.warn(`[seo-suggest] ${label} : erreur transitoire (${status ?? msg}), nouvel essai dans ${waitMs / 1000}s`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

interface PageContext {
  page: string;
  pageType: string;
  opportunities: Opportunity[];
  currentTitle?: string | null;
  currentMetaTitle?: string | null;
  currentMetaDescription?: string | null;
  currentIntro?: string | null;
  currentTips?: string[] | null;
  applyNote: string; // ce qui est réellement applicable en base pour ce type de page
}

async function buildPageContexts(topPages: { page: string; opportunities: Opportunity[] }[]): Promise<PageContext[]> {
  const [posts, routes] = await Promise.all([getAll("posts"), getAll("routes")]);
  const postsBySlug = new Map(posts.map((p) => [p.slug, p]));
  // Piège : le slug d'une FICHE destination (destinationSlug, basé sur la
  // ville) n'est PAS le slug d'une ligne `routes` (basé sur la paire
  // origine-destination) - une destination regroupe plusieurs routes. On
  // garde la 1ère route avec une intro non vide pour cette ville, comme le
  // fait déjà getDestinations() côté affichage (même règle de priorité).
  const routesByDestSlug = new Map<string, (typeof routes)[number]>();
  for (const r of routes) {
    const dSlug = destinationSlug(r.destination_city);
    const existing = routesByDestSlug.get(dSlug);
    if (!existing || (!existing.intro && r.intro)) routesByDestSlug.set(dSlug, r);
  }

  return topPages.map(({ page, opportunities }) => {
    const pageType = classifyPage(page);
    const slug = pageSlug(page);

    if (pageType === "blog-article") {
      const post = postsBySlug.get(slug);
      return {
        page,
        pageType,
        opportunities,
        currentTitle: post?.title ?? null,
        currentMetaTitle: post?.meta_title ?? null,
        currentMetaDescription: post?.meta_description ?? null,
        applyNote: "Article de blog : title/meta_title/meta_description sont des colonnes réelles, directement applicables.",
      };
    }

    if (pageType === "destination") {
      const route = routesByDestSlug.get(slug);
      return {
        page,
        pageType,
        opportunities,
        currentIntro: route?.intro ?? null,
        currentTips: route?.tips ?? null,
        applyNote:
          "Fiche destination : le titre/meta sont GÉNÉRÉS automatiquement à partir du nom de ville (pas de colonne de surcharge en base) - NE PROPOSE PAS de suggestion title/meta_description sur ce type de page, ça ne peut être appliqué nulle part. Seul \"content\" est exploitable ICI, et UNIQUEMENT comme remplacement complet du paragraphe d'intro (jamais un mélange intro+tip, jamais une instruction du type \"ajouter...\" - le texte final complet, prêt à publier tel quel).",
      };
    }

    return {
      page,
      pageType,
      opportunities,
      applyNote: "Pas de donnees structurees par page pour ce type - aucune suggestion n'est automatiquement applicable ici, ne propose que si le signal est vraiment solide et precise-le dans reason.",
    };
  });
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          page: { type: "string" },
          suggestion_type: { type: "string", enum: ["title", "meta_description", "internal_links", "content"] },
          current_value: { type: "string" },
          proposed_value: { type: "string" },
          reason: { type: "string" },
        },
        required: ["page", "suggestion_type", "current_value", "proposed_value", "reason"],
      },
    },
  },
  required: ["suggestions"],
} as const;

interface RawSuggestion {
  page: string;
  suggestion_type: SeoSuggestionType;
  current_value: string;
  proposed_value: string;
  reason: string;
}

// Filet de sécurité : le modèle omet parfois l'accent sur 1-2 mots isolés
// (ex. "eviter" au lieu de "éviter") même quand le reste du texte a des
// accents ailleurs - un simple "contient au moins un accent" ne suffit pas à
// le détecter (voir memoire feedback_social_clipper_accents). Un seul appel
// Haiku (bon marche) corrige tous les textes du run d'un coup via un
// délimiteur, plutôt qu'un appel par suggestion.
const SEP = "\n===SEP===\n";
async function reaccentuateBatch(client: Anthropic, texts: string[]): Promise<string[]> {
  const nonEmpty = texts.filter((t) => t.trim().length > 0);
  if (nonEmpty.length === 0) return texts;
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: `Ajoute UNIQUEMENT les accents francais manquants a chacun de ces textes (certains peuvent deja etre corrects). Ne change RIEN d'autre : ni les mots, ni la ponctuation, ni les majuscules. Les textes sont separes par "${SEP.trim()}" - garde EXACTEMENT le meme nombre de textes dans le meme ordre, separes par le meme delimiteur. Ne traduis pas, n'ajoute aucun commentaire.\n\n${texts.join(SEP)}`,
        },
      ],
    });
    const out = res.content.find((b) => b.type === "text");
    if (!out || out.type !== "text") return texts;
    const fixed = out.text.trim().split(SEP.trim()).map((t) => t.trim());
    if (fixed.length !== texts.length) return texts; // désaccord de compte -> on garde l'original par sécurité
    return fixed;
  } catch {
    return texts;
  }
}

async function generateSuggestions(contexts: PageContext[]): Promise<RawSuggestion[]> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const pagesBlock = contexts
    .map((c, i) => {
      const opps = c.opportunities
        .map((o) => {
          if (o.type === "regression") {
            return `  - Régression : ${o.clicksPrevious} clics -> ${o.clicksCurrent} clics (${Math.round(o.dropPct * 100)}% de baisse)`;
          }
          const extra = o.type === "low_ctr" ? `, CTR attendu ~${Math.round(o.expectedCtr * 100)}%` : "";
          return `  - "${o.query}" : position moyenne ${o.position.toFixed(1)}, ${o.impressions} impressions, ${o.clicks} clics, CTR ${(o.ctr * 100).toFixed(1)}%${extra}`;
        })
        .join("\n");
      const current = [
        c.currentTitle ? `Titre actuel : ${c.currentTitle}` : "",
        c.currentMetaTitle ? `Meta title actuel : ${c.currentMetaTitle}` : "",
        c.currentMetaDescription ? `Meta description actuelle : ${c.currentMetaDescription}` : "",
        c.currentIntro ? `Intro actuelle : ${c.currentIntro}` : "",
        c.currentTips?.length ? `Tips actuels : ${c.currentTips.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return `### Page ${i + 1} : ${c.page} (type: ${c.pageType})\n${current || "(pas de contenu structuré connu pour cette page)"}\nCe qui est réellement applicable : ${c.applyNote}\nSignaux détectés :\n${opps}`;
    })
    .join("\n\n");

  const prompt = `Tu es le responsable SEO de bonvoleur.com (vols pas chers Belgique/France). Le nom de la marque s'écrit EXACTEMENT "BonVoleur" - UN SEUL MOT, B et V majuscules, jamais "Bon Voleur" en deux mots. Voici des pages avec un signal Google Search Console qui mérite une correction. Pour chacune, propose une correction CONCRÈTE et prête à l'emploi (jamais un conseil vague du type "améliore le titre").

${pagesBlock}

Pour chaque page, choisis le type de correction le plus pertinent PARMI CEUX AUTORISÉS pour cette page (voir "Ce qui est réellement applicable" donné pour chaque page ci-dessus - ne propose JAMAIS un type explicitement écarté par cette note) et rédige une proposition complète :
- title : un titre COMPLET prêt à l'emploi - il REMPLACE entièrement la valeur actuelle, jamais une instruction ("ajoute...", "améliore...").
- meta_description : une meta description COMPLÈTE (155 caractères max) qui REMPLACE entièrement la valeur actuelle - jamais une instruction.
- internal_links : liste précise de 2-3 pages du site vers lesquelles ajouter un lien, avec l'ancre suggérée (ceci reste une note pour un humain, pas un remplacement de champ).
- content : le texte COMPLET et final qui REMPLACE le champ concerné (ex. le nouveau paragraphe d'intro en entier) - jamais un mélange de plusieurs modifications, jamais une instruction du type "ajoute" ou "complète".

Règles impératives :
- Français natif (BE/FR), pas de tiret long (em dash), pas d'émoji.
- N'invente aucune métrique : reprends exactement les chiffres donnés ci-dessus dans "reason".
- current_value : reprends EXACTEMENT (mot pour mot) la valeur actuelle donnée ci-dessus pour ce champ précis, sinon laisse une chaîne vide.
- Ne force pas une suggestion si tu n'as rien de solide à proposer pour une page - dans ce cas, ne l'inclus simplement pas dans le résultat.
- Au maximum UNE suggestion par page (celle qui a le plus d'impact).

RAPPEL FINAL CRITIQUE : dans "proposed_value" ET "reason", mets TOUS les accents français, sur CHAQUE mot concerné, sans exception (é, è, ê, à, â, ç, ô, î, ù, ë, ï, œ...). Exemples de mots courants à ne jamais rendre sans accent : été, départ, après, déjà, réel, réserver, éviter, concrètes, préparer, période. Si tu cites le nom de la marque, c'est "BonVoleur" (un seul mot), jamais "Bon Voleur". Relis-toi mot par mot avant de répondre.`;

  const response = await withRetry(
    () =>
      client.messages.create({
        model,
        max_tokens: 8000,
        thinking: { type: "disabled" },
        output_config: { format: { type: "json_schema", schema } },
        messages: [{ role: "user", content: prompt }],
      }),
    "génération suggestions SEO"
  );

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Réponse vide de l'API.");
  const data = JSON.parse(textBlock.text) as { suggestions: RawSuggestion[] };
  const suggestions = data.suggestions ?? [];
  if (suggestions.length === 0) return suggestions;

  // Filet de sécurité accents : corrige proposed_value ET reason d'un coup.
  const toFix = [
    ...suggestions.map((s) => s.proposed_value),
    ...suggestions.map((s) => s.reason),
  ];
  const fixed = await reaccentuateBatch(client, toFix);
  suggestions.forEach((s, i) => {
    s.proposed_value = fixed[i] ?? s.proposed_value;
    s.reason = fixed[suggestions.length + i] ?? s.reason;
  });
  return suggestions;
}

export async function runSeoSuggester(trigger: "cron" | "manuel"): Promise<AgentRun> {
  const startedAt = new Date().toISOString();

  if (!process.env.ANTHROPIC_API_KEY) {
    return insert("agent_runs", {
      agent_name: "seo-suggester",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "skip",
      trigger,
      summary: "ANTHROPIC_API_KEY absent.",
      output_ref: null,
      error: null,
    });
  }

  const opportunities = await detectSeoOpportunities();
  if (opportunities.length === 0) {
    return insert("agent_runs", {
      agent_name: "seo-suggester",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "skip",
      trigger,
      summary: "Aucune opportunité détectée (historique probablement encore trop court).",
      output_ref: null,
      error: null,
    });
  }

  // Regroupe par page, priorise par impressions totales, garde les N meilleures.
  const byPage = new Map<string, Opportunity[]>();
  for (const o of opportunities) {
    const list = byPage.get(o.page) ?? [];
    list.push(o);
    byPage.set(o.page, list);
  }
  const totalImpressions = (opps: Opportunity[]) =>
    opps.reduce((sum, o) => sum + (o.type === "regression" ? o.clicksPrevious * 10 : o.impressions), 0);
  const topPages = [...byPage.entries()]
    .map(([page, opps]) => ({ page, opportunities: opps }))
    .sort((a, b) => totalImpressions(b.opportunities) - totalImpressions(a.opportunities))
    .slice(0, MAX_PAGES_PER_RUN);

  try {
    const contexts = await buildPageContexts(topPages);
    const contextsByPage = new Map(contexts.map((c) => [c.page, c]));
    const raw = await generateSuggestions(contexts);

    // current_value programmatique (pas celui transcrit par le modèle) : la
    // page de validation affiche un avant/après, il doit être fiable à 100%,
    // pas dépendre de la fidélité de transcription du modèle.
    function realCurrentValue(s: RawSuggestion): string | null {
      const ctx = contextsByPage.get(s.page);
      if (!ctx) return null;
      if (ctx.pageType === "blog-article") {
        if (s.suggestion_type === "title") return ctx.currentTitle ?? null;
        if (s.suggestion_type === "meta_description") return ctx.currentMetaDescription ?? null;
      }
      if (ctx.pageType === "destination" && s.suggestion_type === "content") {
        return ctx.currentIntro ?? null;
      }
      return null;
    }

    let created = 0;
    let duplicates = 0;
    for (const s of raw) {
      if (!s.page || !s.proposed_value) continue;
      const existing = await findOne(
        "seo_suggestions",
        (row) => row.page === s.page && row.suggestion_type === s.suggestion_type && row.status === "pending"
      );
      if (existing) {
        duplicates++;
        continue;
      }
      await insert("seo_suggestions", {
        page: s.page,
        suggestion_type: s.suggestion_type,
        current_value: realCurrentValue(s),
        proposed_value: s.proposed_value,
        reason: s.reason || null,
        status: "pending",
        detected_at: new Date().toISOString(),
        applied_at: null,
        apply_note: null,
      });
      created++;
    }

    // Prévient l'admin par email uniquement si de VRAIES nouvelles propositions
    // ont été créées (pas à chaque run - un run qui ne trouve que des doublons
    // ne doit pas spammer). Le total (pas juste `created`) reflète ce que
    // l'admin verra réellement sur la page de validation.
    if (created > 0) {
      const pendingCount = (await getAll("seo_suggestions")).filter((s) => s.status === "pending").length;
      await sendEmail(seoSuggestionsAlertEmail(pendingCount));
    }

    return insert("agent_runs", {
      agent_name: "seo-suggester",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      trigger,
      summary: `${opportunities.length} opportunité(s) détectée(s), ${topPages.length} page(s) analysée(s), ${created} nouvelle(s) suggestion(s), ${duplicates} déjà en attente.`,
      output_ref: null,
      error: null,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erreur inconnue";
    return insert("agent_runs", {
      agent_name: "seo-suggester",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "error",
      trigger,
      summary: "Échec de la génération des suggestions.",
      output_ref: null,
      error,
    });
  }
}
