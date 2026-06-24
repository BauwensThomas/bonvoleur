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

// Programme l'arrêt de tous les abonnements actifs d'un client à la fin de la
// période déjà payée (pas de remboursement, pas de nouvelle facturation).
// Utilisé quand l'abonné se désinscrit : il ne doit plus jamais être débité.
export async function cancelSubscriptionsAtPeriodEnd(
  customerId: string
): Promise<number> {
  const subs = await stripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  let n = 0;
  for (const s of subs.data) {
    const stoppable = ["active", "trialing", "past_due", "unpaid"].includes(
      s.status
    );
    if (stoppable && !s.cancel_at_period_end) {
      await stripe().subscriptions.update(s.id, { cancel_at_period_end: true });
      n++;
    }
  }
  return n;
}
