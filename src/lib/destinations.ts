// Jeu d'images de destinations, partagé par les pages route, l'accueil et les
// cartes deals. Une photo par destination dans public/destinations/{slug}.jpg.
// Si l'image manque, l'affichage retombe sur un dégradé (rien ne casse).

// Image de secours par défaut quand une destination n'a pas (encore) de photo :
// on ne montre jamais une vignette vide. Modifiable dans /admin/photos (stockée
// en base) ; cette valeur est le repli si rien n'est défini. Visuel avion.
export const DEFAULT_DEST_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80";

export type Region = "Europe" | "Afrique" | "Amérique" | "Asie" | "Océanie";

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
  JFK: { slug: "new-york", city: "New York", region: "Amérique" },
  BKK: { slug: "bangkok", city: "Bangkok", region: "Asie" },
  OPO: { slug: "porto", city: "Porto", region: "Europe" },
  KRK: { slug: "cracovie", city: "Cracovie", region: "Europe" },
  ALC: { slug: "alicante", city: "Alicante", region: "Europe" },
  ATH: { slug: "athenes", city: "Athènes", region: "Europe" },
  AGP: { slug: "malaga", city: "Malaga", region: "Europe" },
  GIG: { slug: "rio-de-janeiro", city: "Rio de Janeiro", region: "Amérique" },
};

// Région d'une destination (par libellé "Ville (XXX)" ou code IATA). "Autre"
// si inconnue (destination auto pas encore catégorisée).
export function destinationRegion(labelOrIata: string): Region | "Autre" {
  const iata =
    labelOrIata.length === 3 ? labelOrIata.toUpperCase() : iataOf(labelOrIata);
  return (iata && DESTINATIONS[iata]?.region) || "Autre";
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
