import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { update } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";

export const OPTIONS = corsPreflight;

// Enregistre le jeton Expo Push du telephone (app mobile) sur l'abonne
// connecte. Idempotent : rejouer avec le meme jeton ne duplique rien.
export async function POST(req: Request) {
  trackMobileRequest("/api/push/register");
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  // Un vrai jeton Expo Push tient largement dans 200 caracteres
  // ("ExponentPushToken[...]") - borne defensive contre un abus du champ.
  if (!token || token.length > 200) {
    return withCors(NextResponse.json({ error: "Jeton invalide." }, { status: 400 }));
  }

  const tokens = new Set(state.subscriber.push_tokens ?? []);
  tokens.add(token);
  // Plafond volontairement bas (hygiene + anti-partage de compte en famille,
  // pas juste anti-abus technique) - garde les N plus recents. Suffisant pour
  // un usage personnel normal (telephone + tablette, changement d'appareil).
  const capped = Array.from(tokens).slice(-3);
  await update("subscribers", state.subscriber.id, { push_tokens: capped });

  return withCors(NextResponse.json({ ok: true }));
}
