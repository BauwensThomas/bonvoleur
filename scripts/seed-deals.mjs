// Seed de deals de test pour l'espace membre (/compte).
// Les created_at sont calculés par rapport a l'horloge reelle, pour que le
// gating "gratuit = deals de +48h" soit toujours demontrable.
// Lancer : node scripts/seed-deals.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "data", "deals.json");

const HOUR = 3600 * 1000;
const now = Date.now();
const iso = (hoursAgo) => new Date(now - hoursAgo * HOUR).toISOString();

// hoursAgo < 48 = "en direct" (premium seulement) ; >= 48 = visible aussi par les gratuits.
const seed = [
  // --- En direct (moins de 48h) ---
  ["Bruxelles (BRU)", "Barcelone (BCN)", 41, null, "2026-09-12 au 2026-09-15", "Ryanair", false, 3],
  ["Charleroi (CRL)", "Malaga (AGP)", 39, null, "Octobre, plusieurs dates", "Ryanair", false, 12],
  ["Paris (CDG)", "New York (JFK)", 298, 690, "Janvier a mars 2027", "French Bee", true, 22],
  ["Lyon (LYS)", "Lisbonne (LIS)", 58, null, "Septembre", "TAP", false, 36],
  // --- Plus de 48h (visibles par les gratuits) ---
  ["Bruxelles (BRU)", "Rome (FCO)", 52, null, "Septembre a octobre", "Ryanair", false, 60],
  ["Charleroi (CRL)", "Porto (OPO)", 49, null, "Septembre", "Ryanair", false, 84],
  ["Paris (CDG)", "Athenes (ATH)", 88, null, "Mai 2027", "Aegean", false, 108],
  ["Lyon (LYS)", "Barcelone (BCN)", 54, null, "Aout a septembre", "Vueling", false, 132],
  ["Bruxelles (BRU)", "Marrakech (RAK)", 79, null, "Novembre", "Air Arabia", false, 168],
  ["Charleroi (CRL)", "Cracovie (KRK)", 35, null, "Octobre", "Ryanair", false, 216],
  ["Bruxelles (BRU)", "Bangkok (BKK)", 399, 820, "Janvier 2027", "Qatar Airways", false, 264],
  ["Paris (CDG)", "Tokyo (HND)", 489, null, "Fevrier 2027", "ANA", false, 312],
];

const deals = seed.map(([origin, destination, price, normal, dates, airline, errorFare, hoursAgo], i) => ({
  id: `seed-${i + 1}`,
  origin,
  destination,
  price,
  normal_price: normal,
  discount_pct: normal ? Math.round((1 - price / normal) * 100) : null,
  dates,
  airline,
  booking_url: `https://www.aviasales.com/?seed=${i + 1}`,
  is_error_fare: errorFare,
  is_hot: true,
  valid_until: null,
  published_at: iso(hoursAgo),
  email: null,
  created_at: iso(hoursAgo),
}));

await writeFile(out, JSON.stringify(deals, null, 2) + "\n", "utf-8");
console.log(`Seed ecrit : ${deals.length} deals dans ${out}`);
console.log(`En direct (<48h) : ${deals.filter((d) => now - new Date(d.created_at).getTime() < 48 * HOUR).length}`);
