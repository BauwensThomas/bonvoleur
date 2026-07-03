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
  // Renonciation au droit de rétractation : case obligatoire côté UI (required).
  // On revérifie ici par sécurité : sans consentement explicite, pas de checkout.
  if (form.get("waive_withdrawal") !== "yes") {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }
  const plan: Plan = form.get("plan") === "yearly" ? "yearly" : "monthly";
  const promoCode = (form.get("promo_code") as string | null)?.trim() || null;
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

  // Si un code promo a ete transmis, on le resout en ID Stripe pour l'injecter
  // directement dans la session. Sinon on laisse l'utilisateur en saisir un manuellement.
  let discounts: { promotion_code: string }[] | undefined;
  let allowPromoCodes = true;
  if (promoCode) {
    const promos = await sb.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
    if (promos.data.length > 0) {
      discounts = [{ promotion_code: promos.data[0].id }];
      allowPromoCodes = false; // mutually exclusive avec discounts
    }
  }

  const session = await sb.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: state.subscriber.id,
    ...(discounts ? { discounts } : { allow_promotion_codes: allowPromoCodes }),
    locale: "fr",
    // Preuve de la renonciation au droit de rétractation, attachée à l'abonnement.
    subscription_data: {
      metadata: {
        withdrawal_waived: "yes",
        withdrawal_waived_at: new Date().toISOString(),
      },
    },
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
