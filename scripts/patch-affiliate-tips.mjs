// Ajoute les tips affiliés (Booking, GetYourGuide, AirHelp) aux routes
// dont la destination_iata est dans TARGET_IATA. Usage :
//   node scripts/patch-affiliate-tips.mjs
import { readFile } from "node:fs/promises";

const TARGET_IATA = ["NAP", "BOM"]; // Naples, Mumbai

const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* CI */ }

const SB = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !SK) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
const h = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

const AFFILIATE_SUFFIX = (city) => {
  const enc = encodeURIComponent(city);
  return [
    `Hébergement : [Booking.com](https://www.booking.com/searchresults.fr.html?ss=${enc}) centralise les hôtels, appartements et gîtes à ${city} à tous les prix. Réserve tôt pour les meilleures options.`,
    `Activités sur place : [GetYourGuide](https://www.getyourguide.com/fr-fr/s/?q=${enc}) regroupe les visites guidées, musées et excursions à ${city} avec réservation immédiate.`,
    `Protection vol : avec les compagnies low cost, les retards arrivent. Si ton vol est retardé de plus de 3 heures, [AirHelp](https://airhelp.tp.st/nZiaMXbN) réclame jusqu'à 600 € d'indemnisation pour toi.`,
  ];
};

const MARKER = "Hébergement : [Booking.com]";

const rows = await fetch(
  `${SB}/rest/v1/routes?destination_iata=in.(${TARGET_IATA.join(",")})&select=slug,destination_city,tips`,
  { headers: h }
).then((r) => r.json());

console.log(`${rows.length} route(s) trouvée(s).`);

for (const row of rows) {
  const existingTips = Array.isArray(row.tips) ? row.tips : [];
  if (existingTips.some((t) => t.includes(MARKER))) {
    console.log(`${row.slug} — tips affiliés déjà présents, ignoré.`);
    continue;
  }
  const newTips = [...existingTips, ...AFFILIATE_SUFFIX(row.destination_city)];
  const res = await fetch(`${SB}/rest/v1/routes?slug=eq.${row.slug}`, {
    method: "PATCH",
    headers: { ...h, Prefer: "return=minimal" },
    body: JSON.stringify({ tips: newTips, updated_at: new Date().toISOString() }),
  });
  console.log(`${row.slug} — ${res.ok ? "OK" : `ERREUR ${res.status}: ${await res.text()}`}`);
}
console.log("Terminé.");
