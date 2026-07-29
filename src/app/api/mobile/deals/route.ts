import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { getMemberDeals, type MemberFilters } from "@/lib/member-deals";

// Deals de l'abonné connecté (app mobile) - équivalent bearer-token de
// /compte (web). Réutilise getMemberDeals() : gating premium/freemium,
// dédup par route, tout est déjà géré là-bas.
export async function GET(req: Request) {
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters: MemberFilters = {
    origin: searchParams.get("origin") ?? undefined,
    destination: searchParams.get("destination") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    maxPrice: searchParams.has("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };

  const result = await getMemberDeals(state.tier, filters);
  return NextResponse.json(result);
}
