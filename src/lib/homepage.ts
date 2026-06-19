// Données de la page d'accueil.
// On NE montre PAS les deals de la semaine en cours (sinon personne ne
// s'inscrit). On affiche les deals plus anciens (semaine passée) comme preuve,
// et on tease le nombre de deals trouvés cette semaine pour donner envie.
import { getAll } from "./db";

export interface HomeDeal {
  origin: string;
  destination: string;
  price: number;
  normal_price: number | null;
  dates: string;
  airline: string | null;
  postedAt: string; // date à laquelle le deal a été déniché
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getHomepageDeals(): Promise<{
  totalFound: number;
  pastDeals: HomeDeal[] | null;
}> {
  const all = await getAll("deals");
  const now = Date.now();

  // Vitrine et compteur : uniquement les vrais bons plans (is_hot), pas les
  // simples "meilleurs prix dispo" gardés pour la garantie hebdo.
  const found = all.filter((d) => d.created_at && d.is_hot !== false);

  // Teaser : nombre TOTAL de bons plans dénichés par le script (preuve sociale
  // qui grandit avec le temps). On garde tous les deals, donc ce compteur
  // reflète tout ce qui a été trouvé.
  const totalFound = found.length;

  // Vitrine publique : deals de PLUS d'une semaine (on ne dévoile pas l'actuel).
  const past = found
    .filter((d) => now - new Date(d.created_at).getTime() >= WEEK_MS)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Un seul deal par trajet (pas de doublon de route), le plus récent gardé.
  const seenRoutes = new Set<string>();
  const unique = past.filter((d) => {
    const key = `${d.origin}->${d.destination}`;
    if (seenRoutes.has(key)) return false;
    seenRoutes.add(key);
    return true;
  });

  const pastDeals =
    unique.length > 0
      ? unique.slice(0, 6).map((d) => ({
          origin: d.origin,
          destination: d.destination,
          price: d.price,
          normal_price: d.normal_price,
          dates: d.dates,
          airline: d.airline,
          postedAt: d.published_at ?? d.created_at,
        }))
      : null;

  return { totalFound, pastDeals };
}
