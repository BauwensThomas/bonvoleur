// Agent Deal Writer : transforme un deal en email prêt à envoyer.
// On utilise un TEMPLATE (pas d'IA) : c'est gratuit, instantané, cohérent et
// sans risque sur les prix/dates. L'IA est réservée au blog (rare), pas aux
// emails de deals (fréquents). Exécuté auto à la création d'un deal + manuel.

import { getById, update, insert } from "./db";
import { discountPct } from "./site";
import { formatDealDates } from "./dates";
import type { AgentRun, Deal, DealEmail } from "./types";

interface GeneratedEmail {
  subject: string;
  body: string;
}

export async function generateDealEmail(deal: Deal): Promise<GeneratedEmail> {
  return localEmail(deal);
}

// Exécute l'agent pour un deal : génère l'email, l'attache au deal, journalise.
export async function runDealWriter(
  dealId: string,
  trigger: "auto" | "manuel"
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const triggerLabel = trigger; // "auto" | "manuel"
  try {
    const deal = await getById("deals", dealId);
    if (!deal) throw new Error("Deal introuvable.");

    const generated = await generateDealEmail(deal);
    const email: DealEmail = {
      ...generated,
      generated_at: new Date().toISOString(),
    };
    await update("deals", dealId, { email });

    return insert("agent_runs", {
      agent_name: "deal-writer",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "draft",
      trigger: triggerLabel,
      summary: `Email généré pour ${deal.origin} vers ${deal.destination}${
        trigger === "auto" ? " (automatique à la création)" : ""
      }.`,
      output_ref: dealId,
      error: null,
    });
  } catch (err) {
    return insert("agent_runs", {
      agent_name: "deal-writer",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "error",
      trigger: triggerLabel,
      summary: "Échec de la génération de l'email du deal.",
      output_ref: dealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Modèle local de secours (sans clé API).
function localEmail(deal: Deal): GeneratedEmail {
  const pct =
    deal.normal_price && deal.normal_price > 0
      ? discountPct(deal.price, deal.normal_price)
      : null;
  const dest = deal.destination;
  const subject = `${dest} aux alentours de ${deal.price}€ A/R depuis ${deal.origin}`.slice(
    0,
    80
  );

  const lines = [
    `Bon plan vol : ${deal.origin} vers ${deal.destination}`,
    "",
    `Prix : aux alentours de ${deal.price} euros aller-retour${
      deal.normal_price ? ` (prix normal ${deal.normal_price} euros${pct ? `, soit -${pct}%` : ""})` : ""
    }`,
    deal.dates ? `Dates : ${formatDealDates(deal.dates)}` : null,
    deal.airline ? `Compagnie : ${deal.airline}` : null,
    `Réserver : ${deal.booking_url}`,
    "",
    "Conseil : les bons prix partent vite, réserve rapidement.",
    deal.is_error_fare
      ? "Attention : il s'agit probablement d'une erreur de prix. Elle peut être annulée par la compagnie. Réserve vite, sans frais non remboursables."
      : null,
    "",
    "Tu peux te désinscrire à tout moment.",
  ].filter((l) => l !== null);

  return { subject, body: lines.join("\n") };
}
