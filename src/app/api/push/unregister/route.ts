import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { update } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Retire le jeton Expo Push de ce telephone (deconnexion, ou push desactive
// dans les Reglages) - evite de continuer a notifier un appareil qui ne veut
// plus recevoir de push, ou un jeton devenu invalide apres deconnexion.
export async function POST(req: Request) {
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return withCors(NextResponse.json({ error: "Jeton manquant." }, { status: 400 }));
  }

  const tokens = (state.subscriber.push_tokens ?? []).filter((t) => t !== token);
  await update("subscribers", state.subscriber.id, { push_tokens: tokens });

  return withCors(NextResponse.json({ ok: true }));
}
