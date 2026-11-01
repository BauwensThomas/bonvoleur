// Prix observe pour une destination, calcule depuis les offres reelles du
// scanner (rien n'est ecrit a la main) : une nouvelle destination est couverte
// des qu'une offre existe, et la date affichee est celle de la derniere
// observation. Memes regles de fraicheur que la vitrine de l'accueil.

export interface ObservedDeal {
  origin: string;
  destination: string;
  price: number;
  published_at: string | null;
  created_at: string;
  dates: string;
}

export interface ObservedPrice {
  price: number;
  origin: string;
  seenAt: string;
}

const iataOf = (s: string) => s.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function pickObservedPrice(
  deals: ObservedDeal[],
  destCity: string,
  activeAirports: Set<string>,
  now = Date.now()
): ObservedPrice | null {
  const today = new Date(now).toISOString().slice(0, 10);
  const city = norm(destCity);
  let best: ObservedPrice | null = null;
  for (const d of deals) {
    if (!d.created_at || typeof d.price !== "number" || d.price <= 0) continue;
    // Nom exact de la ville ("Bangkok (BKK)" -> "bangkok") : un startsWith
    // confondrait Nice et Nicosie.
    if (norm(d.destination).split("(")[0].trim() !== city) continue;
    if (!activeAirports.has(iataOf(d.origin))) continue;
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dep && dep < today) continue;
    if (!best || d.price < best.price) {
      best = { price: Math.round(d.price), origin: d.origin, seenAt: d.published_at ?? d.created_at };
    }
  }
  return best;
}
