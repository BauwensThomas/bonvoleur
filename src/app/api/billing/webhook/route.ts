import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { findOne, update } from "@/lib/db";
import type { Tier } from "@/lib/types";

// Webhook Stripe : SOURCE DE VÉRITÉ du tier. On ne passe premium qu'ici, sur un
// événement signé par Stripe (paiement confirmé / abonnement actif), et on
// repasse free à l'annulation ou au non-paiement.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // corps BRUT requis pour vérifier la signature

  if (!secret || !sig) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature invalide:", (err as Error).message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const setTierByCustomer = async (customerId: string | null, tier: Tier) => {
    if (!customerId) return;
    const sub = await findOne(
      "subscribers",
      (s) => s.stripe_customer_id === customerId
    );
    if (sub && sub.tier !== tier) await update("subscribers", sub.id, { tier });
  };
  const customerId = (
    c: string | { id: string } | null | undefined
  ): string | null => (typeof c === "string" ? c : c?.id ?? null);

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const cust = customerId(s.customer);
      if (s.client_reference_id) {
        await update("subscribers", s.client_reference_id, {
          tier: "premium",
          ...(cust ? { stripe_customer_id: cust } : {}),
        });
      } else {
        await setTierByCustomer(cust, "premium");
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const cust = customerId(sub.customer);
      const row = cust
        ? await findOne("subscribers", (s) => s.stripe_customer_id === cust)
        : null;
      if (row) {
        // active / trialing / past_due (grâce) -> premium ; sinon -> free.
        const premium = ["active", "trialing", "past_due"].includes(sub.status);
        const periodEnd = sub.items.data[0]?.current_period_end ?? null;
        await update("subscribers", row.id, {
          tier: premium ? "premium" : "free",
          premium_until: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          premium_cancel_at_period_end: sub.cancel_at_period_end ?? false,
          premium_interval: sub.items.data[0]?.price?.recurring?.interval ?? null,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const cust = customerId(sub.customer);
      const row = cust
        ? await findOne("subscribers", (s) => s.stripe_customer_id === cust)
        : null;
      if (row) {
        await update("subscribers", row.id, {
          tier: "free",
          premium_until: null,
          premium_cancel_at_period_end: null,
          premium_interval: null,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
