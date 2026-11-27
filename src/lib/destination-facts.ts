// Faits verifies par destination (trajet aeroport -> centre-ville), lus depuis
// la table `destination_facts`. Cache au niveau donnee (meme principe que
// getRoutes) : une lecture par heure au plus, invalide par le tag
// "destinations" (revalidate-destinations.ts) quand les faits sont regeneres.
import "server-only";

import { unstable_cache } from "next/cache";
import { getAll } from "./db";
import type { DestinationFact } from "./types";

const getCachedFacts = unstable_cache(
  async (): Promise<Record<string, DestinationFact>> => {
    try {
      const rows = await getAll("destination_facts");
      return Object.fromEntries(rows.map((r) => [r.slug, r]));
    } catch {
      return {};
    }
  },
  ["destination-facts"],
  { tags: ["destinations"], revalidate: 3600 }
);

export async function getDestinationFact(slug: string): Promise<DestinationFact | null> {
  return (await getCachedFacts())[slug] ?? null;
}

// Durée lisible : "25 à 30 minutes", "environ 20 minutes".
export function formatTransferDuration(min: number | null, max: number | null): string {
  if (!min && !max) return "";
  const lo = min ?? max!;
  const hi = max ?? min!;
  return lo === hi ? `environ ${lo} minutes` : `${lo} à ${hi} minutes`;
}
