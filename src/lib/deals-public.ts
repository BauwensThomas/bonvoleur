// Deals pour les indicateurs PUBLICS uniquement (aucune personnalisation) :
// compte de bons plans actifs par destination/aéroport sur les écrans
// publics de l'app mobile. JAMAIS utilisé pour /compte, /api/mobile/deals ou
// l'admin (qui ont besoin du temps réel - restent sur getAll("deals")
// directement). Cache court (60s, même tolérance que getHomepageDeals) : le
// scanner tourne ~3x/jour, pas besoin d'un aller-retour Supabase à chaque
// appel. Voir memoire project_conventions_techniques (2026-08-13, egress).
//
// getPublicFreshDeals() (pas getAll("deals")) : query étroite (colonnes +
// fenêtre FRESH_MAX_DAYS) plutôt que la table entière - getAll("deals")
// dépassait la limite de 2 Mo par entrée du cache de données Next.js une
// fois la table au-delà de ~6800 lignes (voir memoire
// project_conventions_techniques, 2026-08-27).
import "server-only";

import { unstable_cache } from "next/cache";
import { getPublicFreshDeals } from "./db";
import { FRESH_MAX_DAYS } from "./deal-freshness";

export const getAllDealsPublic = unstable_cache(
  async () => getPublicFreshDeals(FRESH_MAX_DAYS),
  ["all-deals-public"],
  { tags: ["deals-public"], revalidate: 60 }
);
