// Configure le portail de facturation Stripe : changement de formule
// (mensuel <-> annuel) DANS LE PORTAIL, annulation en fin de période, mise à
// jour de la carte, historique des factures.
//
// NB : le portail applique le changement IMMÉDIATEMENT (Stripe ne sait pas
// différer). proration_behavior "none" => on facture le nouveau prix le jour du
// changement, sans le double-prélèvement qu'on obtient avec "create_prorations".
//
// Idempotent : met à jour la config si STRIPE_PORTAL_CONFIG_ID est dans
// .env.local, sinon la crée.
//   node scripts/setup-stripe-portal.mjs

import { readFile, appendFile } from "node:fs/promises";
import Stripe from "stripe";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sb = new Stripe(env.STRIPE_SECRET_KEY);

async function price(lookup) {
  const l = await sb.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (!l.data[0]) throw new Error(`Prix introuvable: ${lookup}`);
  return l.data[0];
}
const monthly = await price("premium_monthly");
const yearly = await price("premium_yearly");
const product = typeof monthly.product === "string" ? monthly.product : monthly.product.id;

const params = {
  business_profile: { headline: "BonVoleur Premium — gère ton abonnement" },
  features: {
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "none",
      products: [{ product, prices: [monthly.id, yearly.id] }],
    },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
};

const existing = env.STRIPE_PORTAL_CONFIG_ID;
if (existing) {
  const cfg = await sb.billingPortal.configurations.update(existing, params);
  console.log("Config portail mise à jour:", cfg.id);
} else {
  const cfg = await sb.billingPortal.configurations.create(params);
  await appendFile(".env.local", `\nSTRIPE_PORTAL_CONFIG_ID=${cfg.id}\n`);
  console.log("Config portail créée:", cfg.id, "-> ajoutée à .env.local");
}
console.log("Changement de formule activé dans le portail (immédiat, proration none).");
