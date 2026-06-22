// Couche routes : fusionne les routes codées en dur (seo-routes + route-content)
// avec la table `routes` de la base. La base AUGMENTE/écrase par slug (contenu +
// photo générés). Tolérant : si la table est absente, on garde le codé en dur.

import { getAll } from "./db";
import { seoRoutes, slugify, type SeoRoute } from "./seo-routes";
import { ROUTE_CONTENT, type RouteContent } from "./route-content";
import { destinationImage, destinationRegion } from "./destinations";
import { getDefaultDestImage } from "./settings";
import type { Route } from "./types";

export interface FullRoute extends SeoRoute {
  content: RouteContent | null;
  image: string | null;
  imageCredit: string | null;
  region: string;
}

export function destinationSlug(destCity: string): string {
  return slugify(destCity);
}

function hardcodedBase(): Map<string, FullRoute> {
  const m = new Map<string, FullRoute>();
  for (const r of seoRoutes) {
    m.set(r.slug, {
      ...r,
      content: ROUTE_CONTENT[r.slug] ?? null,
      image: destinationImage(r.destIata), // /public/destinations/{slug}.jpg si connu
      imageCredit: null,
      region: destinationRegion(r.destIata),
    });
  }
  return m;
}

function fromDbRow(r: Route): FullRoute {
  return {
    slug: r.slug,
    originIata: r.origin_iata,
    originCity: r.origin_city,
    destIata: r.destination_iata,
    destCity: r.destination_city,
    content: r.intro
      ? {
          intro: r.intro,
          airlines: r.airlines ?? [],
          duration: r.duration ?? "",
          bestPeriod: r.best_period ?? "",
          tips: r.tips ?? [],
        }
      : null,
    image: r.image_url ?? null,
    imageCredit: r.image_credit ?? null,
    region: r.region || destinationRegion(r.destination_iata),
  };
}

export async function getRoutes(): Promise<FullRoute[]> {
  const map = hardcodedBase();
  try {
    const rows = await getAll("routes");
    for (const r of rows) {
      const db = fromDbRow(r);
      const base = map.get(db.slug);
      map.set(db.slug, {
        ...(base ?? db),
        ...db,
        // garder le codé en dur quand la base n'a pas (encore) l'info
        content: db.content ?? base?.content ?? null,
        image: db.image ?? base?.image ?? null,
        imageCredit: db.imageCredit ?? base?.imageCredit ?? null,
        region: db.region || base?.region || "Autre",
      });
    }
  } catch {
    // table `routes` absente ou Supabase indispo : on garde le codé en dur
  }
  return [...map.values()];
}

export async function getRoute(slug: string): Promise<FullRoute | undefined> {
  return (await getRoutes()).find((r) => r.slug === slug);
}

export interface DestinationGroup {
  destIata: string;
  destCity: string;
  slug: string;
  image: string | null;
  imageCredit: string | null;
  content: RouteContent | null;
  region: string;
  routes: FullRoute[];
}

// Regroupe par destination (1 fiche par ville d'arrivée). Contenu et photo
// pris sur la 1re route disponible vers cette destination (le contenu concerne
// la ville, pas le couple) -> pas de doublon de fiche.
export async function getDestinations(
  applyDefaultImage = true
): Promise<DestinationGroup[]> {
  const routes = await getRoutes();
  const map = new Map<string, DestinationGroup>();
  for (const r of routes) {
    const slug = destinationSlug(r.destCity);
    let g = map.get(slug);
    if (!g) {
      g = {
        destIata: r.destIata,
        destCity: r.destCity,
        slug,
        image: null,
        imageCredit: null,
        content: null,
        region: r.region,
        routes: [],
      };
      map.set(slug, g);
    }
    g.routes.push(r);
    if (!g.image && r.image) {
      g.image = r.image;
      g.imageCredit = r.imageCredit;
    }
    if (!g.content && r.content) g.content = r.content;
  }
  const list = [...map.values()];
  // Affichage : on ne laisse jamais une destination sans image (repli configuré
  // dans /admin/photos). applyDefaultImage=false pour l'admin (voir le vrai état).
  if (applyDefaultImage) {
    const fallback = await getDefaultDestImage();
    for (const g of list) if (!g.image) g.image = fallback;
  }
  return list;
}

export async function getDestination(
  slug: string
): Promise<DestinationGroup | undefined> {
  return (await getDestinations()).find((d) => d.slug === slug);
}
