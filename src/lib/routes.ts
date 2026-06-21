// Couche routes : pour l'instant basée sur les routes codées en dur (seo-routes),
// mais async et centralisée pour que la base (table `routes`) puisse l'augmenter
// plus tard (Étapes 3-4 : auto-génération de fiches) sans changer les pages.

import { seoRoutes, slugify, type SeoRoute } from "./seo-routes";
import { destinationImage } from "./destinations";

// Slug d'une destination (par ville), ex "Rio de Janeiro" -> "rio-de-janeiro".
export function destinationSlug(destCity: string): string {
  return slugify(destCity);
}

export interface DestinationGroup {
  destIata: string;
  destCity: string;
  slug: string; // slug de destination
  image: string | null; // photo de la destination (si dispo)
  routes: SeoRoute[]; // les routes (origines) qui desservent cette destination
}

// Toutes les routes connues. Codées en dur pour l'instant ; la base viendra
// s'ajouter ici (merge par slug) aux étapes suivantes.
export async function getRoutes(): Promise<SeoRoute[]> {
  return seoRoutes;
}

// Regroupe les routes par destination (pour la page destination + onglets).
export async function getDestinations(): Promise<DestinationGroup[]> {
  const routes = await getRoutes();
  const map = new Map<string, DestinationGroup>();
  for (const r of routes) {
    const slug = destinationSlug(r.destCity);
    let group = map.get(slug);
    if (!group) {
      group = {
        destIata: r.destIata,
        destCity: r.destCity,
        slug,
        image: destinationImage(r.destIata),
        routes: [],
      };
      map.set(slug, group);
    }
    group.routes.push(r);
  }
  return [...map.values()];
}

export async function getDestination(
  slug: string
): Promise<DestinationGroup | undefined> {
  return (await getDestinations()).find((d) => d.slug === slug);
}
