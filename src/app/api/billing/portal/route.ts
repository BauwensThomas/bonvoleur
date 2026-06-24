import { NextResponse } from "next/server";
import { getMemberState } from "@/lib/member-auth";
import { stripe } from "@/lib/stripe";

// Ouvre le portail de facturation Stripe : l'abonné gère/annule son abonnement,
// met à jour sa carte, voit ses factures.
export async function POST(req: Request) {
  const state = await getMemberState();
  const origin = new URL(req.url).origin;

  if (state.status !== "member" || !state.subscriber.stripe_customer_id) {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: state.subscriber.stripe_customer_id,
    return_url: `${origin}/compte`,
    // Config qui autorise le changement de formule (mensuel <-> annuel) + annulation.
    ...(process.env.STRIPE_PORTAL_CONFIG_ID
      ? { configuration: process.env.STRIPE_PORTAL_CONFIG_ID }
      : {}),
  });
  return NextResponse.redirect(session.url, { status: 303 });
}
