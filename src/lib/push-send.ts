// Notifications push : cadence DÉCOUPLÉE de l'email (décision du plan mobile,
// 2026-07-28). L'email reste plafonné à 1x/jour (premium) ou 1x/semaine
// (gratuit) via sendScheduledDigest(). Le push notifie à CHAQUE scan (jusqu'à
// 3x/jour) dès qu'un nouveau deal "chaud" (is_hot) apparaît pour un aéroport
// suivi - c'est tout l'intérêt du push par rapport à l'email. Anti-doublon
// dédié (table push_sends), séparé de `sends` (email).
import { getAll, insertMany } from "./db";
import { sendPushBatch, type PushMessage } from "./push";
import { originIata } from "./deal-send";
import { getActiveAirportCodes } from "./airports";
import type { Deal, Subscriber } from "./types";

export interface PushResult {
  notifications: number; // nombre de push envoyés (1 par abonné notifié)
  recipients: number; // nombre d'abonnés distincts notifiés
}

// Fenêtre de "nouveauté" : un scan toutes les ~8h (3x/jour), on regarde donc
// les deals créés/vus depuis un peu plus longtemps que ça pour ne rater aucun
// deal du dernier scan, l'anti-doublon (push_sends) empêchant tout doublon.
const SINCE_HOURS = 10;

// Au plus 1 notification par abonné par exécution (anti-fatigue) : si
// plusieurs deals sont nouveaux pour lui, on les regroupe dans UN seul push.
export async function sendPushForHotDeals(): Promise<PushResult> {
  const since = Date.now() - SINCE_HOURS * 60 * 60 * 1000;
  const activeIatas = await getActiveAirportCodes();
  const allDeals = await getAll("deals");
  const hotDeals = allDeals.filter((d) => {
    if (d.is_hot === false) return false;
    if (new Date(d.created_at).getTime() < since) return false;
    const iata = originIata(d.origin);
    return iata ? activeIatas.has(iata) : false;
  });
  if (hotDeals.length === 0) return { notifications: 0, recipients: 0 };

  const subs = (await getAll("subscribers")).filter(
    (s) => !s.unsubscribed_at && s.consent_at && s.push_enabled !== false && (s.push_tokens?.length ?? 0) > 0
  );
  if (subs.length === 0) return { notifications: 0, recipients: 0 };

  const alreadySent = new Set(
    (await getAll("push_sends")).map((p) => `${p.deal_id}|${p.subscriber_id}`)
  );

  type Entry = { sub: Subscriber; deals: Deal[] };
  const entries: Entry[] = [];
  for (const sub of subs) {
    const airports = new Set((sub.home_airports ?? []).map((a) => a.toUpperCase()));
    const news = hotDeals.filter((d) => {
      const iata = originIata(d.origin);
      return iata ? airports.has(iata) && !alreadySent.has(`${d.id}|${sub.id}`) : false;
    });
    if (news.length > 0) entries.push({ sub, deals: news });
  }
  if (entries.length === 0) return { notifications: 0, recipients: 0 };

  const messages: PushMessage[] = [];
  const messageOwners: Entry[] = []; // même index que messages, un message par jeton
  for (const entry of entries) {
    const { title, body } = pushContent(entry.deals);
    for (const token of entry.sub.push_tokens ?? []) {
      messages.push({ to: token, title, body, data: { type: "deals" } });
      messageOwners.push(entry);
    }
  }

  const oks = await sendPushBatch(messages);
  const notifiedSubs = new Set<string>();
  const rows: { deal_id: string; subscriber_id: string; sent_at: string }[] = [];
  const sentAt = new Date().toISOString();
  for (let i = 0; i < oks.length; i += 1) {
    if (!oks[i]) continue;
    const entry = messageOwners[i];
    notifiedSubs.add(entry.sub.id);
    for (const d of entry.deals) {
      rows.push({ deal_id: d.id, subscriber_id: entry.sub.id, sent_at: sentAt });
    }
  }
  // insertMany dédupliquerait mal si un même (deal,sub) apparaît plusieurs
  // fois (un par jeton) - on ne garde qu'une ligne par paire.
  const uniqueRows = Array.from(
    new Map(rows.map((r) => [`${r.deal_id}|${r.subscriber_id}`, r])).values()
  );
  await insertMany("push_sends", uniqueRows);

  return { notifications: notifiedSubs.size, recipients: notifiedSubs.size };
}

function pushContent(deals: Deal[]): { title: string; body: string } {
  if (deals.length === 1) {
    const d = deals[0];
    return {
      title: "Nouveau bon plan BonVoleur",
      body: `${d.origin} → ${d.destination} aux alentours de ${d.price}€`,
    };
  }
  return {
    title: "Nouveaux bons plans BonVoleur",
    body: `${deals.length} nouveaux bons plans pour toi. Ouvre l'app pour les voir.`,
  };
}
