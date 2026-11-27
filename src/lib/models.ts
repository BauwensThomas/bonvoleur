// Modeles Claude utilises par le site, centralises pour maitriser le cout.
// Tarifs par million de jetons (entree / sortie), verifies le 2026-11-27 :
//   claude-haiku-5-5  : 0,10 $ / 0,50 $   (taches courtes, recherche web, controles)
//   claude-sonnet-5-5 : 2 $ / 10 $        (redaction longue)
//   (avant : haiku-4-5 1 $ / 5 $, sonnet-4-6 3 $ / 15 $)
// Pas de variable d'environnement qui remplace ces choix par defaut : une
// ANTHROPIC_MODEL oubliee sur claude-opus-4-8 (5 $ / 25 $) a deja coute cher.
// Seule ANTHROPIC_ARTICLE_MODEL (explicite) permet de tester un autre modele
// de redaction.
import type Anthropic from "@anthropic-ai/sdk";

export const CHEAP_MODEL = "claude-haiku-5-5";
export const ARTICLE_MODEL = process.env.ANTHROPIC_ARTICLE_MODEL || "claude-sonnet-5-5";

// Reflexion desactivee (donc non facturee). Claude Sonnet 5.5 refuse
// `{ type: "disabled" }` (400) : on y utilise `between_tools`. Les types du SDK
// installe (0.102) ne connaissent pas encore cette valeur, d'ou le cast.
export function noThinking(model: string): Anthropic.ThinkingConfigParam {
  const cfg = model.startsWith("claude-sonnet-5-5") ? { type: "between_tools" } : { type: "disabled" };
  return cfg as unknown as Anthropic.ThinkingConfigParam;
}
