// Envoi d'un deal aux abonnés ciblés.
// Cible : les abonnés dont l'aéroport choisi (home_airport) correspond à
// l'origine du deal, non désinscrits. L'email vient de deal.email (Deal Writer).

import { getAll, getById, insert, insertMany } from "./db";
import { sendEmail, sendBatch, type EmailMessage } from "./email";
import { emailLayout } from "./email-templates";
import { site, discountPct } from "./site";
import { unsubscribeUrl as unsubUrl } from "./unsubscribe";
import type { Deal, EmailFrequency, Subscriber, Tier } from "./types";

// Fréquence effective d'un abonné : sa préférence, ou le défaut selon son tier
// (premium = 1 deal/jour, gratuit = 1 deal/semaine).
function effectiveFrequency(sub: Subscriber): EmailFrequency {
  return sub.email_frequency ?? (sub.tier === "premium" ? "daily" : "weekly");
}

export interface SendResult {
  sent: number;
  skipped: number;
  targetIata: string | null;
}

// Extrait le code IATA (3 lettres) de l'origine, ex "Bruxelles (BRU)" -> "BRU".
export function originIata(origin: string): string | null {
  const paren = origin.match(/\(([A-Za-z]{3})\)/);
  if (paren) return paren[1].toUpperCase();
  const bare = origin.trim().match(/^([A-Za-z]{3})$/);
  return bare ? bare[1].toUpperCase() : null;
}

function matches(sub: Subscriber, iata: string | null): boolean {
  if (sub.unsubscribed_at) return false;
  if (!sub.consent_at) return false; // double opt-in : inscription non confirmée
  if (!iata) return false;
  return (sub.home_airports ?? []).map((a) => a.toUpperCase()).includes(iata);
}


// Carte d'un deal (réutilisée en email simple et en digest).
function dealCard(deal: Deal): string {
  const pct =
    deal.normal_price && deal.normal_price > 0
      ? discountPct(deal.price, deal.normal_price)
      : null;
  const priceLine = pct
    ? `<span style="font-size:28px;font-weight:800;color:#0369a1;">${deal.price}€</span>
       <span style="font-size:14px;color:#94a3b8;text-decoration:line-through;margin-left:8px;">${deal.normal_price}€</span>
       <span style="display:inline-block;margin-left:8px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;">-${pct}%</span>`
    : `<span style="font-size:28px;font-weight:800;color:#0369a1;">${deal.price}€</span>`;
  const notes: string[] = [];
  if (deal.airline) notes.push(`Compagnie : ${escapeHtml(deal.airline)}`);
  if (deal.dates) notes.push(`Dates : ${escapeHtml(deal.dates)}`);
  const notesHtml = notes.length
    ? `<div style="margin-top:6px;font-size:13px;color:#475569;">${notes.join(" &nbsp;-&nbsp; ")}</div>`
    : "";
  const errorHtml = deal.is_error_fare
    ? `<div style="margin-top:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:12px;color:#92400e;">Erreur de prix probable. Le tarif peut être annulé par la compagnie. Réserve vite.</div>`
    : "";
  return `<tr><td style="padding:8px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;">
      <tr><td style="padding:16px 18px;">
        <div style="font-size:17px;font-weight:700;color:#0f172a;">${escapeHtml(deal.origin)} &rarr; ${escapeHtml(deal.destination)}</div>
        <div style="margin-top:6px;"><span style="font-size:13px;color:#64748b;">aux alentours de </span>${priceLine}<span style="font-size:13px;color:#64748b;"> aller-retour</span></div>
        ${notesHtml}
        ${errorHtml}
        <a href="${deal.booking_url}" style="display:inline-block;margin-top:12px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:11px 22px;border-radius:9px;">Reserver ce vol</a>
      </td></tr>
    </table>
  </td></tr>`;
}

const hurryLine = `<tr><td style="padding:6px 28px 0;font-size:13px;font-weight:700;color:#ea580c;">Les bons prix partent vite, ne traine pas.</td></tr>`;

// Email d'un seul deal.
export function dealHtml(deal: Deal, unsubscribeUrl: string): string {
  const intro = `<tr><td style="padding:22px 28px 0;font-size:15px;color:#334155;">Un nouveau bon plan pour toi :</td></tr>`;
  return emailLayout("Bon plan vol", intro + hurryLine + dealCard(deal) + spacer(), unsubscribeUrl);
}

// Email digest : plusieurs deals dans un seul email.
export function digestHtml(deals: Deal[], unsubscribeUrl: string): string {
  const intro = `<tr><td style="padding:22px 28px 0;font-size:16px;font-weight:700;color:#0f172a;">${deals.length} bon${deals.length > 1 ? "s" : ""} plan${deals.length > 1 ? "s" : ""} pour toi</td></tr>`;
  const cards = deals.map(dealCard).join("");
  return emailLayout("Tes bons plans", intro + hurryLine + cards + spacer(), unsubscribeUrl);
}

function spacer(): string {
  return `<tr><td style="height:14px;"></td></tr>`;
}

// Bouton CTA vers l'espace compte (voir TOUS les bons plans).
function accountCta(accountUrl: string): string {
  return `<tr><td align="center" style="padding:10px 28px 20px;">
    <a href="${accountUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:9px;">Voir tous mes bons plans</a>
  </td></tr>`;
}

// Digest teaser : jusqu'à 3 bons plans PAR aéroport + bouton vers le compte.
// (On ne met pas tout dans l'email : ça pousse l'abonné à venir sur le site.)
export function teaserDigestHtml(
  groups: { origin: string; deals: Deal[] }[],
  accountUrl: string,
  unsubscribeUrl: string,
  trackingToken?: string
): string {
  const intro = `<tr><td style="padding:22px 28px 0;font-size:15px;color:#334155;">Voici un aperçu de tes meilleurs bons plans. Retrouve-les tous (et plus) sur ton compte.</td></tr>`;
  const sections = groups
    .map((g) => {
      const header = `<tr><td style="padding:18px 28px 2px;font-size:16px;font-weight:800;color:#0f172a;">Depuis ${escapeHtml(g.origin)}</td></tr>`;
      return header + g.deals.map(dealCard).join("");
    })
    .join("");
  return emailLayout(
    "Tes bons plans",
    intro + hurryLine + sections + accountCta(accountUrl) + spacer(),
    unsubscribeUrl,
    trackingToken
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Envoie le deal aux abonnés ciblés. Retourne le nombre d'envois.
export async function sendDealToSubscribers(dealId: string): Promise<SendResult> {
  const deal = await getById("deals", dealId);
  if (!deal) throw new Error("Deal introuvable.");
  if (!deal.email) throw new Error("L'email du deal n'est pas encore généré.");

  const iata = originIata(deal.origin);
  const subs = (await getAll("subscribers")).filter((s) => matches(s, iata));

  let sent = 0;
  for (const sub of subs) {
    try {
      const unsubscribeUrl = unsubUrl(sub.email, sub.unsubscribe_token ?? "");
      await sendEmail(
        {
          to: sub.email,
          subject: deal.email.subject,
          html: dealHtml(deal, unsubscribeUrl),
          text: deal.email.body,
          replyTo: site.email,
          listUnsubscribe: unsubscribeUrl,
        },
        sub.tier,
      );
      await insert("sends", {
        deal_id: deal.id,
        subscriber_id: sub.id,
        sent_at: new Date().toISOString(),
        opened_at: null,
      });
      sent += 1;
    } catch (err) {
      console.error(`[deal-send] échec pour ${sub.email}:`, err);
    }
  }

  // Marque le deal comme publié (diffusé) s'il ne l'était pas.
  if (!deal.published_at && sent > 0) {
    const { update } = await import("./db");
    await update("deals", deal.id, { published_at: new Date().toISOString() });
  }

  return { sent, skipped: subs.length - sent, targetIata: iata };
}

// Variante pour le pipeline automatique : envoie et journalise une exécution.
export async function sendDealAuto(dealId: string): Promise<SendResult> {
  const result = await sendDealToSubscribers(dealId);
  const deal = await getById("deals", dealId);
  await insert("agent_runs", {
    agent_name: "deal-sender",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: result.sent > 0 ? "success" : "draft",
    trigger: "auto",
    summary: `Deal ${deal?.origin ?? ""} vers ${deal?.destination ?? ""} envoyé à ${result.sent} abonné(s) (aéroport ${result.targetIata ?? "?"}).`,
    output_ref: dealId,
    error: null,
  });
  return result;
}

// DIGEST : pour un lot de deals, envoie à chaque abonné UN seul email
// regroupant les deals qui correspondent à ses aéroports choisis.
export interface DigestResult {
  emails: number; // nombre d'emails envoyés (un par abonné concerné)
  recipients: number;
}

export async function sendDigest(dealIds: string[]): Promise<DigestResult> {
  const allDeals = await getAll("deals");
  const deals = allDeals.filter((d) => dealIds.includes(d.id));
  const subs = await getAll("subscribers");

  let emails = 0;
  for (const sub of subs) {
    if (sub.unsubscribed_at || !sub.consent_at) continue; // confirmés seulement
    // Deals dont l'origine correspond à un des aéroports de l'abonné.
    const theirs = deals.filter((d) => matches(sub, originIata(d.origin)));
    if (theirs.length === 0) continue;

    const unsubscribeUrl = unsubUrl(sub.email, sub.unsubscribe_token ?? "");
    const subject =
      theirs.length === 1
        ? (theirs[0].email?.subject ?? "Un bon plan vol pour toi")
        : `${theirs.length} bons plans vol pour toi`;
    try {
      await sendEmail(
        {
          to: sub.email,
          subject,
          html: digestHtml(theirs, unsubscribeUrl),
          text: theirs
            .map((d) => `${d.origin} -> ${d.destination} : aux alentours de ${d.price} EUR\n${d.booking_url}`)
            .join("\n\n"),
          replyTo: site.email,
          listUnsubscribe: unsubscribeUrl,
        },
        sub.tier,
      );
      for (const d of theirs) {
        await insert("sends", {
          deal_id: d.id,
          subscriber_id: sub.id,
          sent_at: new Date().toISOString(),
          opened_at: null,
        });
      }
      emails += 1;
    } catch (err) {
      console.error(`[digest] échec pour ${sub.email}:`, err);
    }
  }

  // Marque les deals comme publiés.
  const { update } = await import("./db");
  for (const d of deals) {
    if (!d.published_at) {
      await update("deals", d.id, { published_at: new Date().toISOString() });
    }
  }

  await insert("agent_runs", {
    agent_name: "deal-sender",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: emails > 0 ? "success" : "draft",
    trigger: "auto",
    summary: `Digest de ${deals.length} deal(s) envoyé à ${emails} abonné(s).`,
    output_ref: null,
    error: null,
  });

  return { emails, recipients: emails };
}

// DIGEST PROGRAMMÉ :
//  - premium quotidien : { tier:"premium", sinceDays:1, periodDays:1, hotOnly:true }
//      -> 1 email/jour max, uniquement de vrais bons plans (is_hot).
//  - garantie hebdo (tous) : { tier:null, sinceDays:7, periodDays:7, hotOnly:false }
//      -> tout abonné non servi depuis 7 jours reçoit la meilleure offre de son
//         aéroport (même si modeste) : personne ne paie pour rien.
// Double garde : pas deux fois le même deal (table sends) + 1 email max/période.
interface DigestOptions {
  tier: Tier | null; // null = tous les tiers
  frequency?: EmailFrequency; // ne servir que les abonnés ayant cette fréquence
  sinceDays: number;
  periodDays: number;
  hotOnly: boolean;
  maxDeals?: number;
  // Répartition de la charge ("sharding") : si `slot`/`scansPerDay` sont fournis,
  // on n'envoie qu'aux abonnés dont le créneau == slot (créneau stable dérivé de
  // leur id). Permet d'étaler l'envoi sur les N scans du jour sans qu'un abonné
  // reçoive plus que son quota. `byInscriptionWeekday` (gratuit hebdo) restreint
  // en plus au jour de la semaine de l'inscription -> étalement sur 7 jours.
  slot?: number;
  scansPerDay?: number;
  byInscriptionWeekday?: boolean;
}

// Créneau stable d'un abonné (0..scans-1) à partir de son id (hash déterministe).
function daySlot(id: string, scans: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return scans > 0 ? h % scans : 0;
}

// Jour de la semaine de l'inscription (0 = dimanche .. 6 = samedi, UTC).
function inscriptionWeekday(sub: Subscriber): number {
  const d = sub.consent_at ?? sub.created_at;
  return new Date(d).getUTCDay();
}

export async function sendScheduledDigest(
  opts: DigestOptions
): Promise<DigestResult> {
  const { tier, frequency, sinceDays, periodDays, hotOnly } = opts;
  const { slot, scansPerDay, byInscriptionWeekday } = opts;
  const sharded = slot != null && scansPerDay != null && scansPerDay > 0;
  const todayWeekday = new Date().getUTCDay();
  const since = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const allDeals = await getAll("deals");
  const recent = allDeals.filter((d) => {
    if (new Date(d.created_at).getTime() < since) return false;
    if (hotOnly && d.is_hot === false) return false;
    return true;
  });

  const subs = (await getAll("subscribers")).filter((s) => {
    if (s.unsubscribed_at) return false;
    if (!s.consent_at) return false; // double opt-in : non confirmé -> pas d'envoi
    if (tier !== null && s.tier !== tier) return false;
    // Respecte la préférence de fréquence ("none" = jamais d'email).
    if (frequency && effectiveFrequency(s) !== frequency) return false;
    // Sharding : on ne sert que les abonnés de CE créneau (étalement sur les
    // scans), et pour le gratuit hebdo, ceux dont c'est le jour d'inscription
    // (étalement sur la semaine). Sans slot (appel manuel) -> aucun filtre.
    if (sharded) {
      if (daySlot(s.id, scansPerDay!) !== slot) return false;
      if (byInscriptionWeekday && inscriptionWeekday(s) !== todayWeekday) return false;
    }
    return true;
  });
  const sends = await getAll("sends");
  const alreadySent = new Set(
    sends.map((s) => `${s.deal_id}|${s.subscriber_id}`)
  );
  // Dernier envoi par abonné (pour le plafond par période).
  const lastSentAt = new Map<string, number>();
  // Premier envoi par abonné + ouvertures (pour la sunset policy).
  const firstSentAt = new Map<string, number>();
  const hasOpened = new Set<string>();
  const SUNSET_MS = 8 * 7 * 24 * 60 * 60 * 1000; // 8 semaines sans ouverture
  const eightWeeksAgo = Date.now() - SUNSET_MS;

  for (const s of sends) {
    if (!s.sent_at) continue;
    const t = new Date(s.sent_at).getTime();
    if (t > (lastSentAt.get(s.subscriber_id) ?? 0)) lastSentAt.set(s.subscriber_id, t);
    if (!firstSentAt.has(s.subscriber_id) || t < firstSentAt.get(s.subscriber_id)!) {
      firstSentAt.set(s.subscriber_id, t);
    }
    if (s.opened_at) hasOpened.add(s.subscriber_id);
  }

  const accountUrl = `${site.url}/compte`;
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1) Construire un message par abonné qui a des bons plans frais à recevoir.
  type Entry = { sub: Subscriber; shown: Deal[]; msg: EmailMessage };
  const entries: Entry[] = [];
  for (const sub of subs) {
    // Plafond : déjà servi dans la période en cours ? on saute.
    const last = lastSentAt.get(sub.id);
    if (last && Date.now() - last < periodMs) continue;

    // Sunset : a reçu des emails depuis plus de 8 semaines sans jamais en ouvrir un.
    const first = firstSentAt.get(sub.id);
    if (first && first < eightWeeksAgo && !hasOpened.has(sub.id)) continue;

    // Pour CHAQUE aéroport de l'abonné : jusqu'à 3 bons plans (pas déjà reçus,
    // date non passée, 1 par route, les moins chers). Le freemium n'a qu'un seul
    // aéroport, le premium plusieurs -> on incite à venir voir TOUT sur le compte.
    const groups: { origin: string; deals: Deal[] }[] = [];
    for (const ap of (sub.home_airports ?? []).map((a) => a.toUpperCase())) {
      const seenRoutes = new Set<string>();
      const apDeals = recent
        .filter((d) => {
          if (originIata(d.origin) !== ap) return false;
          if (alreadySent.has(`${d.id}|${sub.id}`)) return false;
          const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
          return !dep || dep >= todayStr;
        })
        .sort((a, b) => a.price - b.price)
        .filter((d) => {
          const key = `${d.origin}||${d.destination}`;
          if (seenRoutes.has(key)) return false;
          seenRoutes.add(key);
          return true;
        })
        .slice(0, 3);
      if (apDeals.length) groups.push({ origin: apDeals[0].origin, deals: apDeals });
    }

    const shown = groups.flatMap((g) => g.deals);
    if (shown.length === 0) continue;

    const unsubscribeUrl = unsubUrl(sub.email, sub.unsubscribe_token ?? "");
    entries.push({
      sub,
      shown,
      msg: {
        to: sub.email,
        subject: "Tes bons plans de vols",
        html: teaserDigestHtml(groups, accountUrl, unsubscribeUrl, sub.unsubscribe_token ?? undefined),
        text:
          groups
            .map(
              (g) =>
                `Depuis ${g.origin} :\n` +
                g.deals
                  .map((d) => `  ${d.origin} -> ${d.destination} : aux alentours de ${d.price} EUR`)
                  .join("\n")
            )
            .join("\n\n") + `\n\nVoir tous tes bons plans : ${accountUrl}`,
        replyTo: site.email,
        listUnsubscribe: unsubscribeUrl,
      },
    });
  }

  // 2) Envoyer par BATCH (groupé par tier pour le routage provider), puis
  //    enregistrer la dédup EN MASSE pour les seuls envois réussis. Évite le
  //    timeout Vercel et les limites de débit quel que soit le nombre d'abonnés.
  let emails = 0;
  const sentAt = new Date().toISOString();
  const sendRows: {
    deal_id: string;
    subscriber_id: string;
    sent_at: string;
    opened_at: null;
  }[] = [];
  for (const t of ["premium", "free"] as const) {
    const group = entries.filter((e) => (e.sub.tier === "premium") === (t === "premium"));
    if (group.length === 0) continue;
    const oks = await sendBatch(group.map((e) => e.msg), t);
    for (let i = 0; i < group.length; i += 1) {
      if (!oks[i]) continue;
      emails += 1;
      for (const d of group[i].shown) {
        sendRows.push({
          deal_id: d.id,
          subscriber_id: group[i].sub.id,
          sent_at: sentAt,
          opened_at: null,
        });
      }
    }
  }
  await insertMany("sends", sendRows);

  // Libellé basé sur la fréquence ciblée (daily = premium, weekly = gratuit),
  // pas sur hotOnly (les deux crons utilisent hotOnly:true).
  const label =
    frequency === "daily"
      ? "quotidien (premium)"
      : frequency === "weekly"
      ? "hebdomadaire (gratuit)"
      : hotOnly
      ? "deals chauds"
      : "tous deals";
  await insert("agent_runs", {
    agent_name: "deal-sender",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: emails > 0 ? "success" : "draft",
    trigger: "cron",
    summary: `Digest ${label} envoyé à ${emails} abonné(s).`,
    output_ref: null,
    error: null,
  });

  return { emails, recipients: emails };
}
