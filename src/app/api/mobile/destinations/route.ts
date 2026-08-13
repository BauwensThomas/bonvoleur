import { NextResponse } from "next/server";
import { getDestinations } from "@/lib/routes";
import { getActiveAirportCodes } from "@/lib/airports";
import { getAll } from "@/lib/db";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Public, pas d'auth : cache 60s cote Vercel plutot qu'un rechargement complet
// de deals+routes a chaque appel (l'app rappelle cette route tres souvent -
// egress Supabase, voir memoire project_conventions_techniques, 2026-08-13).
export const dynamic = "force-static";
export const revalidate = 60;

// Liste des destinations (app mobile) - equivalent de /vols-pas-chers sur le
// site web. Groupe par ville d'arrivee (pas par couple origine-destination),
// meme logique que la page hub (getDestinations()). Public, pas d'auth.
//
// originCount compte les aeroports ayant un bon plan ACTIF cette semaine
// (meme regle que weekCountFor()/proofFor() sur la fiche destination) - PAS
// juste le nombre d'aeroports surveilles. Sinon la liste promet un aeroport
// de depart que la fiche detaillee ne montre plus (section masquee si aucun
// deal actif), incoherence reelement rencontree (ex. Rio : 1 aeroport
// affiche sur la liste, 0 sur la fiche car son unique route n'a plus de
// deal chaud cette semaine).
//
// Regroupement par VILLE de destination (pas par code IATA) : une ville
// multi-aeroports comme Rome (FCO/CIA) peut voir le scanner utiliser des
// codes differents (voire un code generique "ROM") selon le scrape - grouper
// par IATA loupait de vrais deals recents (bug reel trouve le 2026-07-30).
export async function GET() {
  const activeIatas = await getActiveAirportCodes();
  const allDeals = await getAll("deals");

  const now = Date.now();
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const liveDeals = allDeals.filter((d) => {
    if (d.is_hot === false) return false;
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dep && dep < todayStr) return false;
    const seenAt = d.published_at ?? d.created_at;
    return now - new Date(seenAt).getTime() <= FRESH_MAX_MS;
  });

  const originsPerDestCity = new Map<string, Set<string>>();
  for (const d of liveDeals) {
    const destCity = d.destination.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim().toLowerCase();
    const origIata = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    if (!destCity || !origIata) continue;
    if (!originsPerDestCity.has(destCity)) originsPerDestCity.set(destCity, new Set());
    originsPerDestCity.get(destCity)!.add(origIata);
  }

  const destinations = (await getDestinations()).map((d) => {
    const live = originsPerDestCity.get(d.destCity.toLowerCase());
    const originCount = new Set(
      d.routes.filter((r) => activeIatas.has(r.originIata) && live?.has(r.originIata)).map((r) => r.originIata)
    ).size;
    return {
      slug: d.slug,
      destIata: d.destIata,
      destCity: d.destCity,
      region: d.region,
      image: d.image,
      originCount,
    };
  });

  return withCors(NextResponse.json({ destinations }));
}
