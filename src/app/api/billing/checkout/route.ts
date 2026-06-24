import { NextResponse } from "next/server";
import { getMemberState } from "@/lib/member-auth";
import { stripe, priceIdFor, type Plan } from "@/lib/stripe";
import { update } from "@/lib/db";

// Crée une session Stripe Checkout (abonnement) pour l'abonné connecté, puis
// redirige vers la page de paiement hébergée par Stripe. Le passage en premium
// se fait via le webhook (pas ici), pour ne se fier qu'à un paiement confirmé.
export async function POST(req: Request) {
  const state = await getMemberState();
  const origin = new URL(req.url).origin;

  // Doit être un abonné confirmé et pas déjà premium.
  if (state.status !== "member") {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }
  if (state.tier === "premium") {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }

  const form = await req.formData();
  const plan: Plan = form.get("plan") === "yearly" ? "yearly" : "monthly";
  const sb = stripe();

  // Client Stripe : réutilise celui de l'abonné, sinon le crée et le stocke.
  let customerId = state.subscriber.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await sb.customers.create({
      email: state.email,
      metadata: { subscriber_id: state.subscriber.id },
    });
    customerId = customer.id;
    await update("subscribers", state.subscriber.id, {
      stripe_customer_id: customerId,
    });
  }

  const price = await priceIdFor(plan);
  const session = await sb.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: state.subscriber.id,
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${origin}/compte?upgraded=1`,
    cancel_url: `${origin}/compte`,
  });

  if (!session.url) {
    return NextResponse.redirect(`${origin}/compte?billing_error=1`, {
      status: 303,
    });
  }
  return NextResponse.redirect(session.url, { status: 303 });
}
