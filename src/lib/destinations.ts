// Jeu d'images de destinations, partagé par les pages route, l'accueil et les
// cartes deals. Une photo par destination dans public/destinations/{slug}.jpg.
// Si l'image manque, l'affichage retombe sur un dégradé (rien ne casse).

export interface DestinationInfo {
  slug: string; // nom de fichier sans extension (public/destinations/{slug}.jpg)
  city: string;
}

// Clé = code IATA de la destination (celui qu'on surveille).
export const DESTINATIONS: Record<string, DestinationInfo> = {
  LIS: { slug: "lisbonne", city: "Lisbonne" },
  BCN: { slug: "barcelone", city: "Barcelone" },
  RAK: { slug: "marrakech", city: "Marrakech" },
  FCO: { slug: "rome", city: "Rome" },
  JFK: { slug: "new-york", city: "New York" },
  BKK: { slug: "bangkok", city: "Bangkok" },
  OPO: { slug: "porto", city: "Porto" },
  KRK: { slug: "cracovie", city: "Cracovie" },
  ALC: { slug: "alicante", city: "Alicante" },
  ATH: { slug: "athenes", city: "Athènes" },
  AGP: { slug: "malaga", city: "Malaga" },
  GIG: { slug: "rio-de-janeiro", city: "Rio de Janeiro" },
};

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
