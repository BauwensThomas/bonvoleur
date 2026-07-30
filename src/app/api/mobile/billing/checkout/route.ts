import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { stripe, priceIdFor, type Plan } from "@/lib/stripe";
import { update } from "@/lib/db";
import { site } from "@/lib/site";

export const OPTIONS = corsPreflight;

// Équivalent mobile de POST /api/billing/checkout (web). Même logique
// (client Stripe, code promo, renonciation au droit de rétractation), mais
// authentifié par jeton bearer et renvoie l'URL Stripe en JSON (plutôt qu'une
// redirection 303) : l'app l'ouvre elle-même dans le navigateur du téléphone.
export async function POST(req: Request) {
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }
  // Un compte premium avec un vrai client Stripe a déjà un abonnement payant
  // en cours - rien à créer. Un premium SANS client Stripe (accordé
  // manuellement, ex. compte de test admin) peut démarrer un vrai abonnement
  // payant comme un gratuit.
  if (state.tier === "premium" && state.subscriber.stripe_customer_id) {
    return withCors(NextResponse.json({ error: "Déjà premium." }, { status: 400 }));
  }

  const body = await req.json().catch(() => null);
  if (!body || body.waive_withdrawal !== true) {
    return withCors(
      NextResponse.json({ error: "Renonciation au droit de rétractation requise." }, { status: 400 })
    );
  }
  const plan: Plan = body.plan === "yearly" ? "yearly" : "monthly";
  const promoCode = typeof body.promo_code === "string" ? body.promo_code.trim() || null : null;

  try {
    const sb = stripe();

    let customerId = state.subscriber.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await sb.customers.create({
        email: state.email,
        metadata: { subscriber_id: state.subscriber.id },
      });
      customerId = customer.id;
      await update("subscribers", state.subscriber.id, { stripe_customer_id: customerId });
    }

    const price = await priceIdFor(plan);

    let discounts: { promotion_code: string }[] | undefined;
    let allowPromoCodes = true;
    if (promoCode) {
      const promos = await sb.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      if (promos.data.length > 0) {
        discounts = [{ promotion_code: promos.data[0].id }];
        allowPromoCodes = false;
      }
    }

    const session = await sb.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: state.subscriber.id,
      ...(discounts ? { discounts } : { allow_promotion_codes: allowPromoCodes }),
      locale: "fr",
      subscription_data: {
        metadata: {
          withdrawal_waived: "yes",
          withdrawal_waived_at: new Date().toISOString(),
        },
      },
      success_url: `${site.canonicalBase}/compte?upgraded=1`,
      cancel_url: `${site.canonicalBase}/compte`,
    });

    if (!session.url) {
      return withCors(NextResponse.json({ error: "Le paiement n'a pas pu démarrer." }, { status: 500 }));
    }
    return withCors(NextResponse.json({ url: session.url }));
  } catch (e) {
    // Voir le commentaire équivalent dans /api/mobile/billing/portal : sans ce
    // try/catch, une exception ici renvoie un 500 sans en-têtes CORS, que le
    // navigateur affiche comme une erreur CORS trompeuse.
    console.error("[mobile billing checkout]", e);
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return withCors(NextResponse.json({ error: message }, { status: 500 }));
  }
}
