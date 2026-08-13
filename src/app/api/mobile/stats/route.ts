import { NextResponse } from "next/server";
import { getAll } from "@/lib/db";
import { getActiveAirports } from "@/lib/airports";
import { getHomepageDeals } from "@/lib/homepage";
import { getDestinations } from "@/lib/routes";
import { getReviewStats } from "@/lib/reviews";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const revalidate = 60;

// Stats publiques (écran d'accueil app, avant connexion) - mêmes chiffres que
// la barre de stats de la homepage web (src/app/page.tsx). Pas d'auth : ce
// sont les mêmes données déjà visibles publiquement sur bonvoleur.com.
export async function GET() {
  const [{ liveCount }, airports, destGroups, reviewStats] = await Promise.all([
    getHomepageDeals(),
    getActiveAirports(),
    getDestinations(),
    getReviewStats(),
  ]);

  const activeIatas = new Set(airports.map((a) => a.iata));
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const activeDeals = (await getAll("deals")).filter((d) => {
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
  const totalDest = destGroups.filter((d) =>
    d.routes.some((r) => originsPerDest.has(r.destIata))
  ).length;

  return withCors(
    NextResponse.json({
      liveCount,
      airportsCount: airports.length,
      totalDest,
      reviewAverage: reviewStats.average,
      reviewTotal: reviewStats.total,
    })
  );
}
