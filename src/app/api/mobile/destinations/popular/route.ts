import { NextResponse } from "next/server";
import { getDestinations } from "@/lib/routes";
import { getActiveAirports } from "@/lib/airports";
import { getAllDealsPublic } from "@/lib/deals-public";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";
import { mobileImageUrl } from "@/lib/mobile-image";
import { rateLimit } from "@/lib/rate-limit";

export const OPTIONS = corsPreflight;

// La mise en cache reelle vient du niveau donnee (voir memoire
// project_conventions_techniques 2026-08-13).
export const dynamic = "force-dynamic";
export const revalidate = 60;

const FEATURED = 8;

// "Destinations populaires" (app mobile) - equivalent de la section homepage
// du site (src/app/page.tsx) : les 8 villes avec le plus d'aeroports de
// depart ayant un bon plan actif en ce moment, pas juste le plus d'aeroports
// surveilles. Meme algorithme reimplemente ici (page-local cote web, pas
// exporte d'une lib partagee). Public, pas d'auth - meme contenu que la home.
export async function GET(req: Request) {
  const limited = rateLimit(req, "/api/mobile/destinations/popular");
  if (limited) return withCors(limited);
  trackMobileRequest("/api/mobile/destinations/popular");
  const [destGroups, airports, allDeals] = await Promise.all([
    getDestinations(),
    getActiveAirports(),
    getAllDealsPublic(),
  ]);
  const activeIatas = new Set(airports.map((a) => a.iata));

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const activeDeals = allDeals.filter((d) => {
    if (d.is_hot === false) return false;
    const seen = d.published_at ?? d.created_at;
    if (now - new Date(seen).getTime() > FRESH_MAX_MS) return false;
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dep && dep < today) return false;
    const origIata = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    return activeIatas.has(origIata);
  });

  const originsPerDest = new Map<string, Set<string>>();
  for (const d of activeDeals) {
    const destIata = d.destination.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    const origIata = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    if (!destIata || !origIata) continue;
    if (!originsPerDest.has(destIata)) originsPerDest.set(destIata, new Set());
    originsPerDest.get(destIata)!.add(origIata);
  }

  const destinations = [...destGroups]
    .filter((d) => d.routes.some((r) => activeIatas.has(r.originIata)))
    .sort(
      (a, b) =>
        (originsPerDest.get(b.destIata)?.size ?? 0) -
          (originsPerDest.get(a.destIata)?.size ?? 0) ||
        b.routes.filter((r) => activeIatas.has(r.originIata)).length -
          a.routes.filter((r) => activeIatas.has(r.originIata)).length ||
        a.destCity.localeCompare(b.destCity)
    )
    .slice(0, FEATURED)
    .map((d) => ({ slug: d.slug, city: d.destCity, image: mobileImageUrl(d.image, 384) }));

  return withCors(NextResponse.json({ destinations, totalDestinations: destGroups.length }));
}
