// Deals affichés dans l'espace membre (/compte).
//
// Principe : on garde TOUS les deals en base (historique / contrôle des
// aéroports). L'affichage déduplique par route et applique le gating par tier :
//  - premium : voit chaque route FRAÎCHE (revue il y a <= FRESH_MAX_DAYS) avec
//    son deal le plus récent (date "vu" = published_at) -> dates récentes.
//  - gratuit : ne voit qu'un aperçu (FREE_MAX_DEALS) des deals DÉCOUVERTS il y a
//    plus de FREE_DELAY_HOURS (96h / 4 j), affichés avec leur date de découverte
//    -> dates anciennes. Pas de filtre de fraîcheur (deals "anciens" assumés).
//    C'est ce qui rend le premium intéressant.
import { getAll } from "./db";
import { FRESH_MAX_MS } from "./deal-freshness";
import { destinationRegion } from "./destinations";
import { getActiveAirportCodes } from "./airports";
import type { Deal, Tier } from "./types";

export const FREE_DELAY_HOURS = 96; // 4 jours de retard pour le gratuit
const FREE_DELAY_MS = FREE_DELAY_HOURS * 3600 * 1000;
// Le gratuit ne voit qu'un aperçu limité. Le premium voit toutes les routes.
export const FREE_MAX_DEALS = 6;

export interface MemberFilters {
  origin?: string; // code IATA de départ (ex. "BRU")
  destination?: string; // texte libre (ville ou code)
  region?: string; // région de la destination (ex. "Europe", "Asie")
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
  const onSite = await getActiveAirportCodes();
  const iataOf = (s: string) => s.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
  let all = (await getAll(
    "deals",
    "id,origin,destination,price,normal_price,discount_pct,dates,airline,booking_url,is_error_fare,is_hot,valid_until,published_at,created_at"
  )).filter(
    (d) => d.is_hot !== false && onSite.has(iataOf(d.origin)),
  );

  // Date réelle du dernier scan : le plus récent "vu" de tous les deals
  // (calculé AVANT le filtre de fraîcheur, pour refléter le vrai dernier scan).
  const lastRefresh =
    all.length > 0
      ? all.reduce((m, d) => (seenAt(d) > m ? seenAt(d) : m), seenAt(all[0]))
      : null;

  // On ne montre jamais un deal dont la DATE DE DÉPART est déjà passée.
  const today = new Date(now).toISOString().slice(0, 10);
  all = all.filter((d) => {
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    return !dep || dep >= today;
  });

  // Filtres (s'appliquent aux deux tiers).
  if (filters.origin) {
    const iata = filters.origin.toUpperCase();
    all = all.filter((d) => d.origin.toUpperCase().includes(`(${iata})`));
  }
  if (filters.destination) {
    const q = filters.destination.trim().toLowerCase();
    if (q) all = all.filter((d) => d.destination.toLowerCase().includes(q));
  }
  if (filters.region) {
    all = all.filter((d) => destinationRegion(d.destination) === filters.region);
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

  // Premium : routes FRAÎCHES uniquement (revues il y a <= FRESH_MAX_DAYS, donc
  // encore d'actualité), une entrée par route, la plus récemment vue.
  const fresh = all.filter(
    (d) => now - new Date(seenAt(d)).getTime() <= FRESH_MAX_MS,
  );
  const premium = newestPerRoute(fresh, seenAt).sort((a, b) =>
    seenAt(b).localeCompare(seenAt(a)),
  );

  // Gratuit : les FREE_MAX_DEALS routes les plus récemment découvertes parmi les
  // deals découverts il y a >= FREE_DELAY (4 j) et dont le départ est à venir.
  // Pas de filtre de fraîcheur ici : ce sont des deals "anciens" assumés (teaser),
  // donc on les garde affichés tant que le voyage est encore réservable.
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
