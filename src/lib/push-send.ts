// Notifications push : cadence DÉCOUPLÉE de l'email (décision du plan mobile,
// 2026-07-28). L'email reste plafonné à 1x/jour (premium) ou 1x/semaine
// (gratuit) via sendScheduledDigest(). Le push notifie à CHAQUE scan (jusqu'à
// 3x/jour) dès qu'un nouveau deal "chaud" (is_hot) apparaît pour un aéroport
// suivi - c'est tout l'intérêt du push par rapport à l'email. Anti-doublon
// dédié (table push_sends), séparé de `sends` (email).
//
// IMPORTANT : un gratuit ne voit un deal que 4 jours après sa découverte
// (FREE_DELAY_HOURS, member-deals.ts) - le notifier dès la création l'enverrait
// vers un deal invisible dans son propre compte. Le push doit donc respecter
// la MÊME règle de visibilité que getMemberDeals() : un premium est notifié dès
// que le deal est frais, un gratuit seulement au moment où le délai de 4 jours
// vient de s'écouler (pas avant, pas des jours après).
import { getAll, insertMany } from "./db";
import { sendPushBatch, type PushMessage } from "./push";
import { originIata } from "./deal-send";
import { getActiveAirportCodes } from "./airports";
import { FREE_DELAY_HOURS } from "./member-deals";
import type { Deal, Subscriber } from "./types";

export interface PushResult {
  notifications: number; // nombre de push envoyés (1 par abonné notifié)
  recipients: number; // nombre d'abonnés distincts notifiés
}

// Fenêtre de "nouveauté" : un scan toutes les ~8h (3x/jour) - on regarde donc
// un peu plus large pour ne rater aucun deal du dernier scan, l'anti-doublon
// (push_sends) empêchant tout envoi en double d'un run à l'autre.
const SCAN_WINDOW_MS = 10 * 60 * 60 * 1000;
const FREE_DELAY_MS = FREE_DELAY_HOURS * 60 * 60 * 1000;

// Un deal est-il devenu visible pour CE tier depuis le dernier scan (donc
// "nouveau" du point de vue de cet abonné) ?
function justBecameVisible(deal: Deal, tier: Subscriber["tier"], now: number): boolean {
  const age = now - new Date(deal.created_at).getTime();
  if (tier === "premium") {
    // Visible dès sa création : "nouveau" = créé depuis le dernier scan.
    return age <= SCAN_WINDOW_MS;
  }
  // Gratuit : visible seulement à partir de FREE_DELAY_MS - "nouveau" = vient
  // tout juste de franchir ce seuil depuis le dernier scan (pas avant, pas
  // des jours après - sinon on renotifie indéfiniment un vieux deal chaque
  // fois qu'il resterait "chaud").
  return age >= FREE_DELAY_MS && age < FREE_DELAY_MS + SCAN_WINDOW_MS;
}

// Départ pas encore passé (même règle que member-deals.ts) - inutile de
// notifier un vol qu'on ne peut plus réserver.
function departureNotPast(deal: Deal, todayStr: string): boolean {
  const dep = (deal.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return !dep || dep >= todayStr;
}

// Au plus 1 notification par abonné par exécution (anti-fatigue) : si
// plusieurs deals sont nouveaux pour lui, on les regroupe dans UN seul push.
export async function sendPushForHotDeals(): Promise<PushResult> {
  const now = Date.now();
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const activeIatas = await getActiveAirportCodes();
  const allDeals = await getAll("deals");
  const candidateDeals = allDeals.filter((d) => {
    if (d.is_hot === false) return false;
    if (!departureNotPast(d, todayStr)) return false;
    const iata = originIata(d.origin);
    return iata ? activeIatas.has(iata) : false;
  });
  if (candidateDeals.length === 0) return { notifications: 0, recipients: 0 };

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
    const news = candidateDeals.filter((d) => {
      const iata = originIata(d.origin);
      if (!iata || !airports.has(iata)) return false;
      if (alreadySent.has(`${d.id}|${sub.id}`)) return false;
      return justBecameVisible(d, sub.tier, now);
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
