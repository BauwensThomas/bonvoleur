// Alerte admin quotidienne : prévient (contact@bonvoleur.com) quand le nombre
// de bons plans VISIBLES (= "bons plans en ce moment", même calcul que l'accueil
// et /compte premium) passe sous des seuils. Un seul email envoyé :
//   - < 50  -> URGENCE
//   - < 100 -> ATTENTION
//   - >= 100 -> rien
import { getHomepageDeals } from "./homepage";
import { sendEmail } from "./email";
import { dealsAlertEmail } from "./email-templates";

export async function runDealsAlert(): Promise<{
  count: number;
  level: "urgence" | "attention" | null;
}> {
  const { liveCount } = await getHomepageDeals();

  let level: "urgence" | "attention" | null = null;
  if (liveCount < 50) level = "urgence";
  else if (liveCount < 100) level = "attention";

  if (level) await sendEmail(dealsAlertEmail(liveCount, level));
  return { count: liveCount, level };
}
