// Envoi d'un deal aux abonnés ciblés.
// Cible : les abonnés dont l'aéroport choisi (home_airport) correspond à
// l'origine du deal, non désinscrits. L'email vient de deal.email (Deal Writer).

import { getAll, getById, insert } from "./db";
import { sendEmail } from "./email";
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
  if (!iata) return false;
  return (sub.home_airports ?? []).map((a) => a.toUpperCase()).includes(iata);
}

// Petits logos (SVG inline). Rendus dans les clients qui le supportent ;
// le libellé texte reste à côté comme repli.
const IG_LOGO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0369a1" style="vertical-align:middle;margin-right:5px;"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.21 15.6 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zm0 2.25a4.15 4.15 0 1 1 0 8.3 4.15 4.15 0 0 1 0-8.3zm6.6-3.7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`;
const FB_LOGO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0369a1" style="vertical-align:middle;margin-right:5px;"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>`;

const linkStyle = "color:#0369a1;text-decoration:none;";

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
    ? `<div style="margin-top:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:12px;color:#92400e;">Erreur de prix probable. Le tarif peut etre annule par la compagnie. Reserve vite.</div>`
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

function wrap(subtitle: string, inner: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0ea5e9;padding:18px 28px;">
          <span style="font-size:18px;font-weight:800;color:#ffffff;">BonVoleur<span style="color:#bae6fd;">.com</span></span>
          <span style="float:right;color:#e0f2fe;font-size:13px;">${subtitle}</span>
        </td></tr>
        ${inner}
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;">
          <p style="margin:0 0 6px;font-size:14px;"><a href="${site.url}" style="${linkStyle}font-weight:bold;">${site.domain}</a></p>
          <p style="margin:0 0 12px;font-size:14px;">
            <a href="${site.social.instagram}" style="${linkStyle}margin-right:16px;">${IG_LOGO}Instagram</a>
            <a href="${site.social.facebook}" style="${linkStyle}">${FB_LOGO}Facebook</a>
          </p>
          <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;">${site.name} - tu recois cet email car tu es inscrit.</p>
          <a href="${unsubscribeUrl}" style="display:inline-block;border:1px solid #cbd5e1;border-radius:8px;padding:7px 14px;font-size:12px;color:#64748b;text-decoration:none;">Se desinscrire</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const hurryLine = `<tr><td style="padding:6px 28px 0;font-size:13px;font-weight:700;color:#ea580c;">Les bons prix partent vite, ne traine pas.</td></tr>`;

// Email d'un seul deal.
export function dealHtml(deal: Deal, unsubscribeUrl: string): string {
  const intro = `<tr><td style="padding:22px 28px 0;font-size:15px;color:#334155;">Un nouveau bon plan pour toi :</td></tr>`;
  return wrap("Bon plan vol", intro + hurryLine + dealCard(deal) + spacer(), unsubscribeUrl);
}

// Email digest : plusieurs deals dans un seul email.
export function digestHtml(deals: Deal[], unsubscribeUrl: string): string {
  const intro = `<tr><td style="padding:22px 28px 0;font-size:16px;font-weight:700;color:#0f172a;">${deals.length} bon${deals.length > 1 ? "s" : ""} plan${deals.length > 1 ? "s" : ""} pour toi</td></tr>`;
  const cards = deals.map(dealCard).join("");
  return wrap("Tes bons plans", intro + hurryLine + cards + spacer(), unsubscribeUrl);
}

function spacer(): string {
  return `<tr><td style="height:14px;"></td></tr>`;
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
    if (sub.unsubscribed_at) continue;
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
}

export async function sendScheduledDigest(
  opts: DigestOptions
): Promise<DigestResult> {
  const { tier, frequency, sinceDays, periodDays, hotOnly, maxDeals = 8 } = opts;
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
    if (tier !== null && s.tier !== tier) return false;
    // Respecte la préférence de fréquence ("none" = jamais d'email).
    if (frequency && effectiveFrequency(s) !== frequency) return false;
    return true;
  });
  const sends = await getAll("sends");
  const alreadySent = new Set(
    sends.map((s) => `${s.deal_id}|${s.subscriber_id}`)
  );
  // Dernier envoi par abonné (pour le plafond par période).
  const lastSentAt = new Map<string, number>();
  for (const s of sends) {
    if (!s.sent_at) continue;
    const t = new Date(s.sent_at).getTime();
    if (t > (lastSentAt.get(s.subscriber_id) ?? 0)) {
      lastSentAt.set(s.subscriber_id, t);
    }
  }

  let emails = 0;
  for (const sub of subs) {
    // Plafond : déjà servi dans la période en cours ? on saute.
    const last = lastSentAt.get(sub.id);
    if (last && Date.now() - last < periodMs) continue;

    // Deals de son aéroport, pas déjà reçus, les moins chers d'abord.
    const theirs = recent
      .filter(
        (d) =>
          matches(sub, originIata(d.origin)) &&
          !alreadySent.has(`${d.id}|${sub.id}`)
      )
      .sort((a, b) => a.price - b.price)
      .slice(0, maxDeals);
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

  const label = hotOnly ? "premium quotidien" : "garantie hebdo";
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
