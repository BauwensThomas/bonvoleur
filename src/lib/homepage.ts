// Données de la page d'accueil.
// La vitrine sert UNIQUEMENT à attirer : on montre 3 cartes "teaser" avec la
// route et le prix seulement. Aucune info actionnable (dates, compagnie, lien
// de réservation) n'est dévoilée -> impossible de retrouver l'offre soi-même,
// donc on peut montrer des deals récents sans casser l'incitation à s'inscrire.
import { getAll } from "./db";
import { FRESH_MAX_MS } from "./deal-freshness";

export interface TeaserDeal {
  origin: string;
  destination: string;
  price: number;
}

export async function getHomepageDeals(): Promise<{
  teaserDeals: TeaserDeal[] | null;
}> {
  const all = await getAll("deals");
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  // Vitrine : vrais bons plans (is_hot), encore frais (vus < fenêtre) et dont la
  // date de départ n'est PAS passée.
  const found = all.filter((d) => {
    if (!d.created_at || d.is_hot === false) return false;
    const seen = d.published_at ?? d.created_at;
    if (now - new Date(seen).getTime() > FRESH_MAX_MS) return false;
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dep && dep < today) return false;
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

  return { teaserDeals };
}
