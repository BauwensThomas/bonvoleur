// Données de la page d'accueil.
// La vitrine sert UNIQUEMENT à attirer : on montre 3 cartes "teaser" avec la
// route et le prix seulement. Aucune info actionnable (dates, compagnie, lien
// de réservation) n'est dévoilée -> impossible de retrouver l'offre soi-même,
// donc on peut montrer des deals récents sans casser l'incitation à s'inscrire.
import { getAll } from "./db";

export interface TeaserDeal {
  origin: string;
  destination: string;
  price: number;
}

export async function getHomepageDeals(): Promise<{
  totalFound: number;
  teaserDeals: TeaserDeal[] | null;
}> {
  const all = await getAll("deals");

  // Compteur et vitrine : uniquement les vrais bons plans (is_hot).
  const found = all.filter((d) => d.created_at && d.is_hot !== false);

  // Compteur : total des bons plans dénichés (preuve sociale qui grandit).
  const totalFound = found.length;

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

  return { totalFound, teaserDeals };
}
