import { NextResponse } from "next/server";
import { getDestinations } from "@/lib/routes";
import { getActiveAirportCodes } from "@/lib/airports";
import { getAll } from "@/lib/db";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

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

  const originsPerDest = new Map<string, Set<string>>();
  for (const d of liveDeals) {
    const destIata = d.destination.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    const origIata = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    if (!destIata || !origIata) continue;
    if (!originsPerDest.has(destIata)) originsPerDest.set(destIata, new Set());
    originsPerDest.get(destIata)!.add(origIata);
  }

  const destinations = (await getDestinations()).map((d) => {
    const live = originsPerDest.get(d.destIata);
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
