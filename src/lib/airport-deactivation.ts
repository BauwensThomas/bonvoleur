// Notifie immédiatement (email + push) les abonnés dont l'aéroport suivi
// vient d'être désactivé par l'admin - complémentaire du bandeau jaune déjà
// présent dans le digest habituel (sendScheduledDigest, rappel passif tant
// que les préférences ne sont pas mises à jour). Déclenché une seule fois,
// au moment du toggle admin (pas dans le cron).
import { getAll } from "./db";
import { sendBatch } from "./email";
import { sendPushBatch, type PushMessage } from "./push";
import { airportDeactivatedEmail } from "./email-templates";
import { getAirportName, getActiveAirportCodes } from "./airports";
import { unsubscribeUrl } from "./unsubscribe";
import type { EmailMessage } from "./email";

export async function notifyAirportDeactivated(iata: string): Promise<void> {
  const code = iata.toUpperCase();
  const city = getAirportName(code);
  // Appelé APRÈS la mise à jour en base : reflète déjà la désactivation.
  const activeCodes = await getActiveAirportCodes();

  const subs = (await getAll("subscribers")).filter(
    (s) =>
      !s.unsubscribed_at &&
      s.consent_at &&
      (s.home_airports ?? []).map((a) => a.toUpperCase()).includes(code)
  );
  if (subs.length === 0) return;

  const emailMsgs: EmailMessage[] = [];
  const pushMsgs: PushMessage[] = [];

  for (const sub of subs) {
    const remaining = (sub.home_airports ?? [])
      .map((a) => a.toUpperCase())
      .filter((a) => a !== code && activeCodes.has(a))
      .map(getAirportName);

    emailMsgs.push(
      airportDeactivatedEmail(
        sub.email,
        city,
        remaining,
        unsubscribeUrl(sub.email, sub.unsubscribe_token ?? "")
      )
    );

    if (sub.push_enabled !== false && (sub.push_tokens?.length ?? 0) > 0) {
      const body =
        remaining.length > 0
          ? `${city} désactivé temporairement. Tu reçois toujours des bons plans pour ${remaining.join(", ")}.`
          : `${city} désactivé temporairement (pas assez de bons plans). Choisis un autre aéroport pour continuer.`;
      for (const token of sub.push_tokens ?? []) {
        pushMsgs.push({
          to: token,
          title: "Aéroport désactivé",
          body,
          data: { type: "airport-deactivated" },
        });
      }
    }
  }

  await Promise.all([
    sendBatch(emailMsgs),
    pushMsgs.length > 0 ? sendPushBatch(pushMsgs) : Promise.resolve([]),
  ]);
}
