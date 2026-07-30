// Notifications push : cadence DÉCOUPLÉE de l'email (décision du plan mobile,
// 2026-07-28). L'email reste plafonné à 1x/jour (premium) ou 1x/semaine
// (gratuit) via sendScheduledDigest(). Le push notifie à CHAQUE scan (jusqu'à
// 3x/jour) dès qu'un nouveau deal "chaud" (is_hot) apparaît pour un aéroport
// suivi - c'est tout l'intérêt du push par rapport à l'email. Anti-doublon
// dédié (table push_sends), séparé de `sends` (email).
//
// FIABILITÉ : plutôt que de redéduire les règles de visibilité (délai
// gratuit, dédoublonnage par route, plafond des 6 deals gratuits) et risquer
// une divergence avec ce que l'app affiche réellement, on appelle getMemberDeals()
// - LA fonction qui fait autorité pour /compte et /api/mobile/deals - filtrée
// sur CHAQUE aéroport suivi. Un deal n'est candidat au push QUE s'il apparaît
// dans ce résultat : garantie qu'il est bien visible pour cet abonné à cet
// instant, zéro divergence possible avec la liste réelle.
import { getAll, insertMany } from "./db";
import { sendPushBatch, type PushMessage } from "./push";
import { getMemberDeals } from "./member-deals";
import type { Deal, Subscriber, Tier } from "./types";

export interface PushResult {
  notifications: number; // nombre de push envoyés (1 par abonné notifié)
  recipients: number; // nombre d'abonnés distincts notifiés
}

// Fenêtre de "nouveauté" : un scan toutes les ~8h (3x/jour) - on regarde donc
// un peu plus large pour ne rater aucun deal du dernier scan, l'anti-doublon
// (push_sends) empêchant tout envoi en double d'un run à l'autre.
const SCAN_WINDOW_MS = 10 * 60 * 60 * 1000;

// "Vu" pour la 1ère fois par CE scan (donc digne d'un push) - même notion que
// seenAt() de member-deals.ts pour un premium (published_at ?? created_at),
// et created_at pour un gratuit (date de découverte, pas de republication).
function justAppeared(deal: Deal, tier: Tier, now: number): boolean {
  const at = tier === "premium" ? deal.published_at ?? deal.created_at : deal.created_at;
  return now - new Date(at).getTime() <= SCAN_WINDOW_MS;
}

// Au plus 1 notification par abonné par exécution (anti-fatigue) : si
// plusieurs deals sont nouveaux pour lui, on les regroupe dans UN seul push.
export async function sendPushForHotDeals(): Promise<PushResult> {
  const now = Date.now();

  const subs = (await getAll("subscribers")).filter(
    (s) => !s.unsubscribed_at && s.consent_at && s.push_enabled !== false && (s.push_tokens?.length ?? 0) > 0
  );
  if (subs.length === 0) return { notifications: 0, recipients: 0 };

  // Cache par (tier, aéroport) - un seul appel getMemberDeals() par paire
  // réellement utilisée, même si plusieurs abonnés partagent le même aéroport.
  const cache = new Map<string, Deal[]>();
  async function visibleDealsFor(tier: Tier, iata: string): Promise<Deal[]> {
    const key = `${tier}|${iata}`;
    if (!cache.has(key)) {
      const result = await getMemberDeals(tier, { origin: iata });
      cache.set(key, result.deals);
    }
    return cache.get(key)!;
  }

  const alreadySent = new Set(
    (await getAll("push_sends")).map((p) => `${p.deal_id}|${p.subscriber_id}`)
  );

  type Entry = { sub: Subscriber; deals: Deal[] };
  const entries: Entry[] = [];
  for (const sub of subs) {
    const seenIds = new Set<string>();
    const news: Deal[] = [];
    for (const iata of sub.home_airports ?? []) {
      const visible = await visibleDealsFor(sub.tier, iata.toUpperCase());
      for (const d of visible) {
        if (seenIds.has(d.id)) continue;
        if (alreadySent.has(`${d.id}|${sub.id}`)) continue;
        if (!justAppeared(d, sub.tier, now)) continue;
        seenIds.add(d.id);
        news.push(d);
      }
    }
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
