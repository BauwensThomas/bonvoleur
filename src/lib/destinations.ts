// Jeu d'images de destinations, partagé par les pages route, l'accueil et les
// cartes deals. Une photo par destination dans public/destinations/{slug}.jpg.
// Si l'image manque, l'affichage retombe sur un dégradé (rien ne casse).

// Image de secours par défaut quand une destination n'a pas (encore) de photo :
// on ne montre jamais une vignette vide. Modifiable dans /admin/photos (stockée
// en base) ; cette valeur est le repli si rien n'est défini. Visuel avion.
export const DEFAULT_DEST_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80";

export type Region =
  | "Europe"
  | "Amérique du Nord"
  | "Amérique du Sud"
  | "Caraïbes"
  | "Afrique"
  | "Moyen-Orient"
  | "Asie"
  | "Océanie";

// Ordre d'affichage des régions (du plus proche / fréquent au plus lointain).
export const REGION_ORDER: Region[] = [
  "Europe",
  "Afrique",
  "Moyen-Orient",
  "Asie",
  "Amérique du Nord",
  "Amérique du Sud",
  "Caraïbes",
  "Océanie",
];

// Carte IATA -> région, SOURCE DE VÉRITÉ (prioritaire sur la colonne DB, qui
// pouvait être mal devinée, ex. Dubaï classé "Asie"). Pour reclasser une ville :
// une ligne ici suffit, sans toucher la base.
export const REGION_BY_IATA: Record<string, Region> = {
  // Europe (aéroports de départ + destinations européennes)
  BRU: "Europe", CRL: "Europe", ANR: "Europe", OST: "Europe", LGG: "Europe",
  CDG: "Europe", ORY: "Europe", BVA: "Europe", LYS: "Europe", NCE: "Europe",
  MRS: "Europe", BOD: "Europe", TLS: "Europe", NTE: "Europe", LIL: "Europe",
  SXB: "Europe", LIS: "Europe", OPO: "Europe", BCN: "Europe", AGP: "Europe",
  ALC: "Europe", MAD: "Europe", VLC: "Europe", PMI: "Europe", FCO: "Europe",
  NAP: "Europe", ATH: "Europe", KRK: "Europe",
  // Afrique (Maghreb, Afrique de l'Ouest/Est/Sud, océan Indien)
  RAK: "Afrique", CMN: "Afrique", BKO: "Afrique", DKR: "Afrique", ABJ: "Afrique",
  NBO: "Afrique", JNB: "Afrique", MRU: "Afrique", RUN: "Afrique",
  // Moyen-Orient (Golfe)
  DXB: "Moyen-Orient", DOH: "Moyen-Orient",
  // Asie
  BKK: "Asie", DPS: "Asie", DEL: "Asie", BOM: "Asie",
  // Amérique du Nord
  JFK: "Amérique du Nord", EWR: "Amérique du Nord", YUL: "Amérique du Nord",
  YYZ: "Amérique du Nord", MIA: "Amérique du Nord", LAX: "Amérique du Nord",
  CUN: "Amérique du Nord", MEX: "Amérique du Nord",
  // Amérique du Sud
  GIG: "Amérique du Sud", GRU: "Amérique du Sud", EZE: "Amérique du Sud",
  LIM: "Amérique du Sud", BOG: "Amérique du Sud",
  // Caraïbes
  PUJ: "Caraïbes",
};

export interface DestinationInfo {
  slug: string; // nom de fichier sans extension (public/destinations/{slug}.jpg)
  city: string;
  region: Region;
}

// Clé = code IATA de la destination (celui qu'on surveille).
export const DESTINATIONS: Record<string, DestinationInfo> = {
  LIS: { slug: "lisbonne", city: "Lisbonne", region: "Europe" },
  BCN: { slug: "barcelone", city: "Barcelone", region: "Europe" },
  RAK: { slug: "marrakech", city: "Marrakech", region: "Afrique" },
  FCO: { slug: "rome", city: "Rome", region: "Europe" },
  JFK: { slug: "new-york", city: "New York", region: "Amérique du Nord" },
  BKK: { slug: "bangkok", city: "Bangkok", region: "Asie" },
  OPO: { slug: "porto", city: "Porto", region: "Europe" },
  KRK: { slug: "cracovie", city: "Cracovie", region: "Europe" },
  ALC: { slug: "alicante", city: "Alicante", region: "Europe" },
  ATH: { slug: "athenes", city: "Athènes", region: "Europe" },
  AGP: { slug: "malaga", city: "Malaga", region: "Europe" },
  GIG: { slug: "rio-de-janeiro", city: "Rio de Janeiro", region: "Amérique du Sud" },
};

// Région d'une destination (par libellé "Ville (XXX)" ou code IATA). La carte
// REGION_BY_IATA fait foi ; sinon repli sur DESTINATIONS ; sinon "Autre".
export function destinationRegion(labelOrIata: string): Region | "Autre" {
  const iata =
    labelOrIata.length === 3 ? labelOrIata.toUpperCase() : iataOf(labelOrIata);
  if (!iata) return "Autre";
  return REGION_BY_IATA[iata] ?? DESTINATIONS[iata]?.region ?? "Autre";
}

// Région finale d'une route : le calcul par IATA (REGION_BY_IATA) FAIT FOI ;
// sinon la valeur stockée en base ; sinon "Autre".
export function resolveRegion(
  labelOrIata: string,
  dbRegion?: string | null
): string {
  const computed = destinationRegion(labelOrIata);
  if (computed !== "Autre") return computed;
  return dbRegion || "Autre";
}

// Extrait le code IATA d'un libellé du type "Lisbonne (LIS)".
function iataOf(label: string): string | null {
  const m = label.match(/\(([A-Z]{3})\)/);
  return m ? m[1] : null;
}

// Chemin de l'image pour une destination (libellé "Ville (XXX)" ou code IATA).
// Renvoie null si la destination n'a pas d'image connue.
export function destinationImage(labelOrIata: string): string | null {
  const iata =
    labelOrIata.length === 3 ? labelOrIata.toUpperCase() : iataOf(labelOrIata);
  if (iata && DESTINATIONS[iata]) {
    return `/destinations/${DESTINATIONS[iata].slug}.jpg`;
  }
  return null;
}
