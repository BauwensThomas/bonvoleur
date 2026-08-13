// Deals pour les indicateurs PUBLICS uniquement (aucune personnalisation) :
// compte de bons plans actifs par destination/aéroport sur les écrans
// publics de l'app mobile. JAMAIS utilisé pour /compte, /api/mobile/deals ou
// l'admin (qui ont besoin du temps réel - restent sur getAll("deals")
// directement). Cache court (60s, même tolérance que getHomepageDeals) : le
// scanner tourne ~3x/jour, pas besoin d'un aller-retour Supabase à chaque
// appel. Voir memoire project_conventions_techniques (2026-08-13, egress).
import "server-only";

import { unstable_cache } from "next/cache";
import { getAll } from "./db";
import type { Deal } from "./types";

export const getAllDealsPublic = unstable_cache(
  async (): Promise<Deal[]> => getAll("deals"),
  ["all-deals-public"],
  { tags: ["deals-public"], revalidate: 60 }
);
