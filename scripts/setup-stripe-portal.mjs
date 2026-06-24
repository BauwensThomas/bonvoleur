// Configure le portail de facturation Stripe : autorise le changement de formule
// (mensuel <-> annuel), l'annulation à la fin de période, la mise à jour de la
// carte et l'historique des factures. À lancer une fois (ou après changement de
// prix). Écrit STRIPE_PORTAL_CONFIG_ID dans .env.local.
//
// Usage : node scripts/setup-stripe-portal.mjs

import { readFile, appendFile } from "node:fs/promises";
import Stripe from "stripe";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sb = new Stripe(env.STRIPE_SECRET_KEY);

async function priceId(lookup) {
  const l = await sb.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (!l.data[0]) throw new Error(`Prix introuvable: ${lookup}`);
  return l.data[0];
}
const monthly = await priceId("premium_monthly");
const yearly = await priceId("premium_yearly");
const product = typeof monthly.product === "string" ? monthly.product : monthly.product.id;

const config = await sb.billingPortal.configurations.create({
  business_profile: {
    headline: "BonVoleur Premium — gère ton abonnement",
  },
  features: {
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: [{ product, prices: [monthly.id, yearly.id] }],
    },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
});

await appendFile(".env.local", `\nSTRIPE_PORTAL_CONFIG_ID=${config.id}\n`);
console.log("Config portail créée:", config.id);
console.log("-> changement mensuel<->annuel activé, annulation en fin de période.");
console.log("STRIPE_PORTAL_CONFIG_ID ajouté à .env.local.");
