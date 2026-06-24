import "server-only";
import Stripe from "stripe";

// Client Stripe côté serveur (singleton). Clé secrète uniquement.
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquant (.env.local).");
  return (_stripe ??= new Stripe(key));
}

export type Plan = "monthly" | "yearly";

// On référence les tarifs par leur « clé de recherche » Stripe (stable et
// lisible), pas par un price_id codé en dur.
const LOOKUP: Record<Plan, string> = {
  monthly: "premium_monthly",
  yearly: "premium_yearly",
};

export async function priceIdFor(plan: Plan): Promise<string> {
  const lookup = LOOKUP[plan] ?? LOOKUP.monthly;
  const list = await stripe().prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
  });
  const id = list.data[0]?.id;
  if (!id) throw new Error(`Tarif Stripe introuvable pour la clé « ${lookup} ».`);
  return id;
}
