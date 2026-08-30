// Données de la page d'accueil.
// La vitrine sert UNIQUEMENT à attirer : on montre 3 cartes "teaser" avec la
// route et le prix seulement. Aucune info actionnable (dates, compagnie, lien
// de réservation) n'est dévoilée -> impossible de retrouver l'offre soi-même,
// donc on peut montrer des deals récents sans casser l'incitation à s'inscrire.
import { unstable_cache } from "next/cache";
import { getPublicFreshDeals } from "./db";
import { FRESH_MAX_MS } from "./deal-freshness";
import { getActiveAirportCodes } from "./airports";

export interface TeaserDeal {
  origin: string;
  destination: string;
  price: number;
}

// Mise en cache DONNÉE (pas de personnalisation ici, aucun paramètre) - le
// scanner tourne ~3x/jour donc un filet de sécurité court (60s) suffit à
// rester perçu comme "en direct" sans retaper Supabase à chaque appel
// (utilisé par l'accueil ET plusieurs routes API mobile). Voir memoire
// project_conventions_techniques (2026-08-13, egress Supabase).
export const getHomepageDeals = unstable_cache(computeHomepageDeals, ["homepage-deals"], {
  tags: ["deals-public"],
  revalidate: 60,
});

async function computeHomepageDeals(): Promise<{
  teaserDeals: TeaserDeal[] | null;
  liveCount: number; // bons plans frais en ce moment (preuve sociale)
  destinationCount: number; // destinations distinctes parmi ces deals
}> {
  const [all, onSite] = await Promise.all([
    getPublicFreshDeals(7),
    getActiveAirportCodes(),
  ]);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const iataOf = (s: string) => s.match(/\(([A-Z]{3})\)/)?.[1] ?? "";

  // Vitrine : vrais bons plans (is_hot), encore frais (vus < fenêtre), dont la
  // date de départ n'est PAS passée, et depuis un aéroport actif sur le site.
  const found = all.filter((d) => {
    if (!d.created_at || d.is_hot === false) return false;
    const seen = d.published_at ?? d.created_at;
    if (now - new Date(seen).getTime() > FRESH_MAX_MS) return false;
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dep && dep < today) return false;
    if (!onSite.has(iataOf(d.origin))) return false;
    return true;
  });

  // Teaser : 3 deals les plus récents, un seul par route (pas de doublon).
  const seenAt = (d: (typeof found)[number]) => d.published_at ?? d.created_at;
  const byRecent = [...found].sort((a, b) =>
    seenAt(b).localeCompare(seenAt(a)),
  );

  const seenRoutes = new Set<string>();
  const unique = byRecent.filter((d) => {
    const key = `${d.origin}->${d.destination}`;
    if (seenRoutes.has(key)) return false;
    seenRoutes.add(key);
    return true;
  });

  const teaserDeals =
    unique.length > 0
      ? unique.slice(0, 3).map((d) => ({
          origin: d.origin,
          destination: d.destination,
          price: d.price,
        }))
      : null;

  // liveCount = ce que voit le premium : 1 deal par route (dédupliqué), comme
  // dans getMemberDeals. `unique` est déjà dédupliqué par route ci-dessus.
  const destinationCount = new Set(unique.map((d) => d.destination)).size;

  return { teaserDeals, liveCount: unique.length, destinationCount };
}
