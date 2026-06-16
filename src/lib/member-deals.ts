// Deals affichés dans l'espace membre (/compte).
// Gating par tier : le premium voit tout en direct, le gratuit ne voit que les
// deals dont la détection date de plus de 48h (champ created_at). Pas de job
// différé : un simple filtre à la lecture.
import { getAll } from "./db";
import type { Deal, Tier } from "./types";

export const FREE_DELAY_HOURS = 48;
const FREE_DELAY_MS = FREE_DELAY_HOURS * 3600 * 1000;

export interface MemberFilters {
  origin?: string; // code IATA de départ (ex. "BRU")
  destination?: string; // texte libre (ville ou code)
  maxPrice?: number;
}

export interface MemberDealsResult {
  deals: Deal[];
  total: number; // nombre de deals après filtres, avant gating
  liveLockedForFree: number; // deals en direct cachés à un gratuit (incitation premium)
}

function isFresh(deal: Deal, now: number): boolean {
  return now - new Date(deal.created_at).getTime() < FREE_DELAY_MS;
}

export async function getMemberDeals(
  tier: Tier,
  filters: MemberFilters = {},
): Promise<MemberDealsResult> {
  const now = Date.now();
  let all = (await getAll("deals")).filter((d) => d.is_hot !== false);

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

  all.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const total = all.length;
  const liveLockedForFree = all.filter((d) => isFresh(d, now)).length;

  const deals = tier === "premium" ? all : all.filter((d) => !isFresh(d, now));

  return { deals, total, liveLockedForFree };
}
