// Deals affichés dans l'espace membre (/compte).
//
// Principe : on garde TOUS les deals en base (historique / contrôle des
// aéroports). L'affichage déduplique par route et applique le gating par tier :
//  - premium : voit chaque route avec son deal le plus récent (date "vu" =
//    published_at, rafraîchie à chaque scan) -> dates récentes.
//  - gratuit : ne voit qu'un aperçu (FREE_MAX_DEALS) des deals DÉCOUVERTS il y a
//    plus de 72h (created_at), et on affiche leur date de découverte -> dates
//    anciennes. C'est ce qui rend le premium intéressant.
import { getAll } from "./db";
import { FRESH_MAX_MS } from "./deal-freshness";
import type { Deal, Tier } from "./types";

export const FREE_DELAY_HOURS = 72;
const FREE_DELAY_MS = FREE_DELAY_HOURS * 3600 * 1000;
// Le gratuit ne voit qu'un aperçu limité. Le premium voit toutes les routes.
export const FREE_MAX_DEALS = 3;

export interface MemberFilters {
  origin?: string; // code IATA de départ (ex. "BRU")
  destination?: string; // texte libre (ville ou code)
  maxPrice?: number;
  dateFrom?: string; // date de départ min (YYYY-MM-DD) - premium
  dateTo?: string; // date de départ max (YYYY-MM-DD) - premium
}

export interface MemberDealsResult {
  deals: Deal[];
  total: number; // nombre de routes visibles en premium
  liveLockedForFree: number; // routes que le premium voit mais pas le gratuit
  lastRefresh: string | null; // date réelle du dernier scan (max published_at/created_at)
}

const routeKey = (d: Deal) => `${d.origin}||${d.destination}`;
// Date "vu pour la dernière fois" (premium). À défaut, première détection.
const seenAt = (d: Deal) => d.published_at ?? d.created_at;

// Garde, pour chaque route, le deal qui maximise `pick` (ex. date la plus récente).
function newestPerRoute(deals: Deal[], pick: (d: Deal) => string): Deal[] {
  const best = new Map<string, Deal>();
  for (const d of deals) {
    const cur = best.get(routeKey(d));
    if (!cur || pick(d).localeCompare(pick(cur)) > 0) best.set(routeKey(d), d);
  }
  return [...best.values()];
}

export async function getMemberDeals(
  tier: Tier,
  filters: MemberFilters = {},
): Promise<MemberDealsResult> {
  const now = Date.now();
  let all = (await getAll("deals")).filter((d) => d.is_hot !== false);

  // Date réelle du dernier scan : le plus récent "vu" de tous les deals
  // (calculé AVANT le filtre de fraîcheur, pour refléter le vrai dernier scan).
  const lastRefresh =
    all.length > 0
      ? all.reduce((m, d) => (seenAt(d) > m ? seenAt(d) : m), seenAt(all[0]))
      : null;

  // Fraîcheur : on ne montre PAS aux membres les deals non revus depuis plus de
  // FRESH_MAX_DAYS jours (ils restent en base pour l'historique).
  all = all.filter((d) => now - new Date(seenAt(d)).getTime() <= FRESH_MAX_MS);

  // Filtres (s'appliquent aux deux tiers).
  if (filters.origin) {
    const iata = filters.origin.toUpperCase();
    all = all.filter((d) => d.origin.toUpperCase().includes(`(${iata})`));
  }
  if (filters.destination) {
    const q = filters.destination.trim().toLowerCase();
    if (q) all = all.filter((d) => d.destination.toLowerCase().includes(q));
  }
  if (typeof filters.maxPrice === "number" && !Number.isNaN(filters.maxPrice)) {
    all = all.filter((d) => d.price <= filters.maxPrice!);
  }
  // Période de voyage (premium) : on filtre sur la DATE DE DÉPART du deal.
  if (filters.dateFrom || filters.dateTo) {
    all = all.filter((d) => {
      const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (!dep) return false;
      if (filters.dateFrom && dep < filters.dateFrom) return false;
      if (filters.dateTo && dep > filters.dateTo) return false;
      return true;
    });
  }

  // Premium : une entrée par route, la plus récemment vue.
  const premium = newestPerRoute(all, seenAt).sort((a, b) =>
    seenAt(b).localeCompare(seenAt(a)),
  );

  // Gratuit : une entrée par route, parmi les deals découverts il y a >= 72h,
  // le plus récemment découvert. On trie/affiche sur la date de découverte.
  const olderThanDelay = all.filter(
    (d) => now - new Date(d.created_at).getTime() >= FREE_DELAY_MS,
  );
  const free = newestPerRoute(olderThanDelay, (d) => d.created_at).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const total = premium.length;
  const freeVisible = Math.min(free.length, FREE_MAX_DEALS);
  const liveLockedForFree = Math.max(0, total - freeVisible);

  const deals = tier === "premium" ? premium : free.slice(0, FREE_MAX_DEALS);

  return { deals, total, liveLockedForFree, lastRefresh };
}
