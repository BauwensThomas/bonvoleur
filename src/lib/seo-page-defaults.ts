// Valeurs de titre/meta description PAR DÉFAUT des pages sans colonne dédiée
// en base (surchargeables via seo_override:{chemin}:{champ}, voir
// settings.ts). Source unique - utilisé à la fois par les pages elles-mêmes
// (generateMetadata) et par l'agent seo-suggester (pour connaître la vraie
// valeur "actuelle" avant de proposer un remplacement) : si ces défauts
// changent un jour, ne les modifier qu'ICI pour que les deux restent alignés.
export const SEO_PAGE_DEFAULTS: Record<string, { title: string; description: string }> = {
  "/": {
    title: "BonVoleur - Vols pas chers depuis la Belgique et la France",
    description: "",
  },
  "/blog": {
    title: "Blog voyage et bons plans",
    description:
      "Guides destinations, conseils voyage et astuces pour voler moins cher depuis la Belgique et la France.",
  },
  "/vols-pas-chers": {
    title: "Vols pas chers depuis la Belgique et la France",
    description:
      "Toutes nos destinations : vols pas chers depuis la Belgique et la France. Choisis ta destination, on te prévient par email.",
  },
};

// Fiche destination : titre/description générés à partir du nom de ville
// (pas de valeur fixe par chemin, une par ville).
export function destinationDefaultTitle(city: string): string {
  return `Vols pas chers vers ${city}`;
}
export function destinationDefaultDescription(city: string): string {
  return `Les meilleurs bons plans de vols vers ${city}. Choisis ton aéroport de départ, on surveille les prix et on te prévient par email.`;
}
