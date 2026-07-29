import { NextResponse } from "next/server";
import { getDestinations } from "@/lib/routes";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Liste des destinations (app mobile) - equivalent de /vols-pas-chers sur le
// site web. Groupe par ville d'arrivee (pas par couple origine-destination),
// meme logique que la page hub (getDestinations()). Public, pas d'auth.
export async function GET() {
  const destinations = (await getDestinations()).map((d) => ({
    slug: d.slug,
    destIata: d.destIata,
    destCity: d.destCity,
    region: d.region,
    image: d.image,
    originCount: new Set(d.routes.map((r) => r.originIata)).size,
  }));

  return withCors(NextResponse.json({ destinations }));
}
