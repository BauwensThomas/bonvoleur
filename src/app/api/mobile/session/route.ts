import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";

export const OPTIONS = corsPreflight;

// Statut de connexion pour l'app mobile - équivalent bearer-token de
// getMemberState() (web, cookie). Appelé au lancement de l'app.
export async function GET(req: Request) {
  trackMobileRequest("/api/mobile/session");
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
      premium_until: state.subscriber.premium_until ?? null,
      premium_cancel_at_period_end: state.subscriber.premium_cancel_at_period_end ?? false,
      premium_interval: state.subscriber.premium_interval ?? null,
      has_stripe_customer: Boolean(state.subscriber.stripe_customer_id),
    })
  );
}
