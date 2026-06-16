// Routes pour le SEO programmatique (/vols-pas-chers/{origine}-{destination}).
// Alignées sur les routes réellement scannées (TRAVELPAYOUTS_WATCH dans scanner.py).
// Chaque route = une page optimisée pour "vols pas chers {ville} {ville}".

export interface SeoRoute {
  originIata: string;
  originCity: string;
  destIata: string;
  destCity: string;
  slug: string; // ex "bruxelles-barcelone"
}

const ORIGIN_CITY: Record<string, string> = {
  BRU: "Bruxelles",
  CRL: "Charleroi",
  CDG: "Paris",
  LYS: "Lyon",
};

const DEST_CITY: Record<string, string> = {
  LIS: "Lisbonne",
  BCN: "Barcelone",
  RAK: "Marrakech",
  FCO: "Rome",
  JFK: "New York",
  BKK: "Bangkok",
  AGP: "Malaga",
  OPO: "Porto",
  KRK: "Cracovie",
  ALC: "Alicante",
  ATH: "Athènes",
};

// origine -> destinations (mêmes paires que le scanner).
const WATCH: Record<string, string[]> = {
  BRU: ["LIS", "BCN", "RAK", "FCO", "JFK", "BKK"],
  CRL: ["AGP", "OPO", "FCO", "KRK", "ALC"],
  CDG: ["JFK", "LIS", "BCN", "ATH", "BKK"],
  LYS: ["BCN", "LIS", "FCO"],
};

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents (diacritiques combinants)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const seoRoutes: SeoRoute[] = Object.entries(WATCH).flatMap(
  ([originIata, dests]) =>
    dests.map((destIata) => {
      const originCity = ORIGIN_CITY[originIata] ?? originIata;
      const destCity = DEST_CITY[destIata] ?? destIata;
      return {
        originIata,
        originCity,
        destIata,
        destCity,
        slug: `${slugify(originCity)}-${slugify(destCity)}`,
      };
    })
);

export function getSeoRoute(slug: string): SeoRoute | undefined {
  return seoRoutes.find((r) => r.slug === slug);
}

// Autres destinations depuis la même origine (maillage interne).
export function sameOrigin(route: SeoRoute): SeoRoute[] {
  return seoRoutes.filter(
    (r) => r.originIata === route.originIata && r.slug !== route.slug
  );
}

// Mêmes destination depuis d'autres origines (maillage interne).
export function sameDestination(route: SeoRoute): SeoRoute[] {
  return seoRoutes.filter(
    (r) => r.destIata === route.destIata && r.slug !== route.slug
  );
}
