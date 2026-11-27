// Estimation du cout des appels Claude d'une execution (article, legende...),
// affichee dans le resume de l'agent pour voir le cout reel de chaque passage.
// Accumulateur au niveau du module : une execution a la fois (cron ou admin).
import "server-only";

const PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 5, out: 25 },
};
const WEB_SEARCH_USD = 0.01; // 10 $ pour 1000 recherches

let totalUsd = 0;
let calls = 0;

interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export function resetUsage(): void {
  totalUsd = 0;
  calls = 0;
}

export function recordUsage(model: string, usage: UsageLike | undefined | null): void {
  if (!usage) return;
  const p = PRICES[model] ?? PRICES["claude-sonnet-4-6"];
  totalUsd +=
    ((usage.input_tokens ?? 0) / 1e6) * p.in +
    ((usage.cache_read_input_tokens ?? 0) / 1e6) * p.in * 0.1 +
    ((usage.output_tokens ?? 0) / 1e6) * p.out +
    (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD;
  calls += 1;
}

export function usageSummary(): string {
  return `Coût IA estimé : ${totalUsd.toFixed(3).replace(".", ",")} $ (${calls} appel${calls > 1 ? "s" : ""}).`;
}
