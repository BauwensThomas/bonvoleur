// Configuration centrale de la marque et constantes du site.

export const site = {
  name: "BonVoleur",
  domain: "bonvoleur.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Les meilleurs deals vols depuis la Belgique et la France",
  description:
    "BonVoleur déniche les vols pas chers depuis les aéroports belges et français et t'envoie les meilleures alertes par email. Tu réserves, tu voyages.",
  email: "contact@bonvoleur.com",
  promise: "On déniche les vols pas chers à ta place, tu n'as plus qu'à réserver.",
  // Réseaux sociaux (à adapter avec tes vrais comptes).
  social: {
    instagram: "https://instagram.com/bonvoleur.be",
    facebook: "https://facebook.com/bonvoleur.be",
  },
} as const;

// Heures d'actualisation du scanner (heure de Bruxelles). Sert au compte à
// rebours de l'espace premium. Doit rester aligné avec SCAN_TIMES
// (scripts/scanner.py) et le cron de .github/workflows/scanner.yml.
export const scanTimes = ["07:30", "13:30", "19:30"] as const;

// Aéroports proposés à l'inscription.
// IMPORTANT : on ne propose QUE des aéroports qu'on scanne activement et qui
// ont des bons plans de façon fiable (grosses bases low-cost). Ainsi un abonné
// a toujours des deals pour son aéroport. Doit rester aligné avec
// TRAVELPAYOUTS_WATCH dans scripts/scanner.py.
export const airports = [
  { iata: "BRU", city: "Bruxelles", country: "BE" },
  { iata: "CRL", city: "Charleroi", country: "BE" },
  { iata: "CDG", city: "Paris", country: "FR" },
  { iata: "LYS", city: "Lyon", country: "FR" },
] as const;

// Exemples de deals pour la landing (statiques tant qu'il n'y a pas de vrais deals).
export const sampleDeals = [
  {
    origin: "Bruxelles (BRU)",
    destination: "Lisbonne (LIS)",
    price: 79,
    normal_price: 180,
    dates: "Septembre à novembre",
    airline: "TAP / Ryanair",
  },
  {
    origin: "Charleroi (CRL)",
    destination: "Barcelone (BCN)",
    price: 49,
    normal_price: 130,
    dates: "Octobre, plusieurs dates",
    airline: "Ryanair",
  },
  {
    origin: "Paris (CDG)",
    destination: "New York (JFK)",
    price: 320,
    normal_price: 650,
    dates: "Janvier à mars",
    airline: "French Bee",
  },
] as const;

export function discountPct(price: number, normal: number): number {
  if (!normal || normal <= 0) return 0;
  return Math.round((1 - price / normal) * 100);
}
