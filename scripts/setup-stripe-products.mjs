// Crée (idempotent) le produit Premium + les prix mensuel/annuel avec les
// lookup_keys attendus par le code (premium_monthly / premium_yearly).
// Marche en TEST ou en LIVE selon la clé dans .env.local (sk_test_ / sk_live_).
//   node scripts/setup-stripe-products.mjs
//
// Ordre de mise en LIVE : 1) activer le compte Stripe, 2) mettre sk_live_ dans
// .env.local, 3) lancer CE script, 4) lancer setup-stripe-portal.mjs.

import { readFile } from "node:fs/promises";
import Stripe from "stripe";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const key = env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY manquant dans .env.local");
const sb = new Stripe(key);
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
console.log(`Mode Stripe: ${mode}`);

const PRODUCT_NAME = "BonVoleur Premium";
const PLANS = [
  { lookup: "premium_monthly", amount: 499, interval: "month", nickname: "Premium mensuel" },
  { lookup: "premium_yearly", amount: 3900, interval: "year", nickname: "Premium annuel" },
];

// Produit : on réutilise celui d'un prix existant, sinon on le crée.
async function ensureProduct() {
  for (const p of PLANS) {
    const l = await sb.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 });
    if (l.data[0]) {
      const prod = l.data[0].product;
      return typeof prod === "string" ? prod : prod.id;
    }
  }
  const created = await sb.products.create({
    name: PRODUCT_NAME,
    description: "Abonnement premium BonVoleur : tous les bons plans en direct.",
  });
  console.log(`Produit créé: ${created.id}`);
  return created.id;
}

const productId = await ensureProduct();

for (const p of PLANS) {
  const existing = await sb.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 });
  if (existing.data[0]) {
    console.log(`OK ${p.lookup} existe déjà (${existing.data[0].id}, ${existing.data[0].unit_amount / 100} ${existing.data[0].currency}).`);
    continue;
  }
  const price = await sb.prices.create({
    product: productId,
    unit_amount: p.amount,
    currency: "eur",
    recurring: { interval: p.interval },
    lookup_key: p.lookup,
    nickname: p.nickname,
  });
  console.log(`Prix créé ${p.lookup}: ${price.id} (${p.amount / 100} EUR / ${p.interval}).`);
}

console.log("\nTerminé. Pense ensuite à lancer setup-stripe-portal.mjs.");
