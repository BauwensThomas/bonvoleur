import { NextResponse } from "next/server";
import { getMemberState } from "@/lib/member-auth";

// Endpoint leger : retourne uniquement le tier de l'utilisateur connecte.
// Utilise par SummerPromoPopup (client) pour savoir si l'affichage est pertinent.
export async function GET() {
  const state = await getMemberState();
  const tier =
    state.status === "member" && state.tier === "premium" ? "premium" : "free";
  return NextResponse.json({ tier }, { status: 200 });
}
