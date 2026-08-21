import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { getMemberDeals, type MemberFilters } from "@/lib/member-deals";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";

export const OPTIONS = corsPreflight;

// Deals de l'abonné connecté (app mobile) - équivalent bearer-token de
// /compte (web). Réutilise getMemberDeals() : gating premium/freemium,
// dédup par route, tout est déjà géré là-bas.
export async function GET(req: Request) {
  trackMobileRequest("/api/mobile/deals");
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  const { searchParams } = new URL(req.url);
  // Période de voyage (dateFrom/dateTo) réservée au premium, comme sur le
  // site web (src/app/compte/page.tsx) - on ignore ces paramètres pour un
  // gratuit plutôt que de faire confiance à l'app pour ne pas les envoyer.
  const isPremium = state.tier === "premium";
  const filters: MemberFilters = {
    origin: searchParams.get("origin") ?? undefined,
    destination: searchParams.get("destination") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    maxPrice: searchParams.has("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    dateFrom: isPremium ? searchParams.get("dateFrom") ?? undefined : undefined,
    dateTo: isPremium ? searchParams.get("dateTo") ?? undefined : undefined,
  };

  const result = await getMemberDeals(state.tier, filters);
  return withCors(NextResponse.json({ ...result, tier: state.tier }));
}
