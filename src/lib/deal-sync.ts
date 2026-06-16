// Synchronisation "pull" des deals.
// Le scanner ne tourne PAS sur la machine du site : il tourne sur un hebergeur
// (GitHub Actions, VM gratuite...) et publie les deals sous forme de JSON public
// (ex. fichier commit sur le repo -> raw.githubusercontent.com, ou un endpoint).
// Le site local va CHERCHER ce JSON ici et l'integre dans sa base locale.
//
// Configurer l'URL source dans .env.local : DEALS_SOURCE_URL=...
// Le JSON attendu : un tableau d'objets { origin, destination, price,
// booking_url, normal_price?, dates?, airline?, is_error_fare?, is_hot?, valid_until? }.
import { findOne, insert } from "./db";
import { discountPct } from "./site";
import { runDealWriter } from "./deal-writer";

export interface SyncResult {
  fetched: number;
  added: number;
  duplicates: number;
  skipped: number;
}

interface RawDeal {
  origin?: unknown;
  destination?: unknown;
  price?: unknown;
  booking_url?: unknown;
  normal_price?: unknown;
  dates?: unknown;
  airline?: unknown;
  is_error_fare?: unknown;
  is_hot?: unknown;
  valid_until?: unknown;
}

export async function syncDealsFromRemote(): Promise<SyncResult> {
  const url = process.env.DEALS_SOURCE_URL;
  if (!url) {
    throw new Error("DEALS_SOURCE_URL non configuré (.env.local).");
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Source deals injoignable : ${res.status}`);
  }
  const raw = (await res.json()) as unknown;
  const list: RawDeal[] = Array.isArray(raw) ? raw : [];

  let added = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const b of list) {
    const origin = String(b.origin ?? "");
    const destination = String(b.destination ?? "");
    const price = Number(b.price);
    const bookingUrl = String(b.booking_url ?? "");
    if (!origin || !destination || !price || !bookingUrl) {
      skipped += 1;
      continue;
    }

    const existing = await findOne("deals", (d) => d.booking_url === bookingUrl);
    if (existing) {
      duplicates += 1;
      continue;
    }

    const normal = b.normal_price ? Number(b.normal_price) : null;
    const deal = await insert("deals", {
      origin,
      destination,
      price,
      normal_price: normal,
      discount_pct: normal ? discountPct(price, normal) : null,
      dates: String(b.dates ?? ""),
      airline: b.airline ? String(b.airline) : null,
      booking_url: bookingUrl,
      is_error_fare: Boolean(b.is_error_fare),
      is_hot: b.is_hot !== false,
      valid_until: b.valid_until ? String(b.valid_until) : null,
      published_at: null,
      email: null,
    });

    // Genere l'email (Deal Writer). L'envoi reste gere par le flux digest/auto
    // (pas d'envoi automatique au moment de la synchro pour eviter les surprises).
    await runDealWriter(deal.id, "auto");
    added += 1;
  }

  return { fetched: list.length, added, duplicates, skipped };
}
