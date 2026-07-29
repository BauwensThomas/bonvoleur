import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Statut de connexion pour l'app mobile - équivalent bearer-token de
// getMemberState() (web, cookie). Appelé au lancement de l'app.
export async function GET(req: Request) {
  const state = await getMobileMemberState(req);

  if (state.status !== "member") {
    return withCors(
      NextResponse.json({ status: state.status, email: "email" in state ? state.email : null })
    );
  }

  return withCors(
    NextResponse.json({
      status: "member",
      email: state.email,
      tier: state.tier,
      home_airports: state.subscriber.home_airports,
      push_enabled: state.subscriber.push_enabled ?? true,
    })
  );
}
