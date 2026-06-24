// Lance l'écouteur de webhooks Stripe en local, en forçant le compte BonVoleur
// (via STRIPE_SECRET_KEY de .env.local) pour éviter toute confusion avec un
// autre compte (ex. un autre projet) connecté dans la CLI Stripe.
//
// Usage : npm run stripe:listen   (garde ce terminal ouvert pendant les tests)
// Puis, dans un AUTRE terminal : npm run dev

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sk = env.STRIPE_SECRET_KEY;
if (!sk) {
  console.error("STRIPE_SECRET_KEY manquant dans .env.local.");
  process.exit(1);
}

const child = spawn(
  "stripe",
  [
    "listen",
    "--api-key",
    sk,
    "--forward-to",
    "localhost:3000/api/billing/webhook",
  ],
  { stdio: "inherit" }
);
child.on("error", (e) => {
  console.error("CLI Stripe introuvable ?", e.message);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 0));
