// Templates d'email (HTML + texte). Regles : pas de tiret long, pas d'emoji.
// Design inspire de Surfshark : logo minimal en header, hero colore, CTA dark pill,
// footer 2 tiers (gris marque + legal/desabonnement).

import { site } from "./site";
import type { EmailMessage } from "./email";
import type { Post } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ICON_BASE =
  "https://hdzzfhjnjcblcejcpnkw.supabase.co/storage/v1/object/public/photos/brand";
export const IG_LOGO = `<img src="${ICON_BASE}/instagram.png" width="16" height="16" alt="" style="vertical-align:middle;margin-right:5px;" />`;
export const FB_LOGO = `<img src="${ICON_BASE}/facebook.png" width="16" height="16" alt="" style="vertical-align:middle;margin-right:5px;" />`;

const LOGO_URL =
  "https://hdzzfhjnjcblcejcpnkw.supabase.co/storage/v1/object/public/photos/brand/logo.png";
const HERO_URL =
  "https://hdzzfhjnjcblcejcpnkw.supabase.co/storage/v1/object/public/photos/brand/hero-email.png";

const LINK = "color:#0369a1;text-decoration:none;";
const WIDTH = 680;

// Gabarit commun. Plus de "subtitle" : le header est minimal (logo seul).
export function emailLayout(
  inner: string,
  unsubscribeUrl?: string,
  trackingToken?: string,
): string {
  const pixel = trackingToken
    ? `<img src="${site.url}/api/track/open?t=${encodeURIComponent(trackingToken)}" width="1" height="1" style="border:0;display:block;height:1px;width:1px;max-height:1px;overflow:hidden;" alt="" />`
    : "";

  const footerUnsub = unsubscribeUrl
    ? `<p style="margin:8px 0 0;"><a href="${unsubscribeUrl}" style="color:#94a3b8;font-size:12px;text-decoration:underline;">Se désinscrire</a></p>`
    : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>BonVoleur</title>
<style>.bv-stars a{text-decoration:none;color:#e2e8f0;background:transparent;font-size:30px;line-height:1;padding:0 4px;}.bv-stars a:hover,.bv-stars a:hover ~ a{color:#f59e0b;}</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" style="max-width:${WIDTH}px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- HEADER : logo minimal, fond blanc -->
        <tr><td style="padding:20px 32px;border-bottom:1px solid #f1f5f9;">
          <img src="${LOGO_URL}" width="32" height="32" alt="" style="vertical-align:middle;border-radius:8px;margin-right:8px;" />
          <span style="font-size:16px;font-weight:800;color:#0f172a;vertical-align:middle;">BonVoleur<span style="color:#0ea5e9;">.com</span></span>
        </td></tr>

        <!-- HERO IMAGE -->
        <tr><td style="padding:0;">
          <img src="${HERO_URL}" width="${WIDTH}" alt="Vole plus loin, paye moins." style="display:block;width:100%;max-width:${WIDTH}px;" />
        </td></tr>

        <!-- CONTENU -->
        ${inner}

        <!-- FOOTER 1 : gris, marque + reseaux -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:28px 32px;text-align:center;">
          <p style="margin:0 0 4px;">
            <img src="${LOGO_URL}" width="28" height="28" alt="" style="vertical-align:middle;border-radius:6px;margin-right:6px;" />
            <span style="font-size:15px;font-weight:800;color:#0f172a;vertical-align:middle;">BonVoleur<span style="color:#0ea5e9;">.com</span></span>
          </p>
          <p style="margin:6px 0 16px;font-size:13px;color:#64748b;">Les meilleurs bons plans de vols, directement dans ta boîte mail.</p>
          <p style="margin:0;">
            <a href="${site.social.instagram}" style="${LINK}margin-right:20px;">${IG_LOGO}Instagram</a>
            <a href="${site.social.facebook}" style="${LINK}">${FB_LOGO}Facebook</a>
          </p>
        </td></tr>

        <!-- FOOTER 2 : legal + desabonnement -->
        <tr><td style="background:#f1f5f9;padding:14px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          <p style="margin:0;">${site.name} - <a href="mailto:${site.email}" style="color:#94a3b8;text-decoration:none;">${site.email}</a></p>
          ${footerUnsub}
        </td></tr>

      </table>
      ${pixel}
    </td></tr>
  </table>
</body></html>`;
}

// Bloc de contenu standard (padding intérieur).
export function emailContent(html: string): string {
  return `<tr><td style="padding:32px 32px 24px;font-size:15px;line-height:1.7;color:#0f172a;">${html}</td></tr>`;
}

// Bloc hero coloré (comme la zone image Surfshark).
export function emailHero(bgColor: string, html: string): string {
  return `<tr><td style="padding:24px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bgColor};border-radius:12px;overflow:hidden;">
      <tr><td style="padding:36px 28px;text-align:center;">${html}</td></tr>
    </table>
  </td></tr>`;
}

// CTA bouton pill.
function ctaButton(text: string, href: string, bg = "#0ea5e9"): string {
  return `<p style="margin:24px 0 0;text-align:center;">
    <a href="${href}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:999px;font-weight:700;font-size:15px;">${text}</a>
  </p>`;
}

// ---- EMAILS TRANSACTIONNELS ----

export function welcomeEmail(to: string, unsubscribeUrl: string): EmailMessage {
  const hero = emailHero(
    "#e0f2fe",
    `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:.06em;">Bienvenue</p>
     <p style="margin:0;font-size:24px;font-weight:800;color:#0c4a6e;line-height:1.2;">Tu es dans le bon vol.</p>`,
  );

  const body = emailContent(
    `<h1 style="margin:0 0 14px;font-size:22px;font-weight:800;">Les bons plans arrivent bientôt.</h1>
     <p style="margin:0 0 12px;color:#475569;">${site.promise}</p>
     <p style="margin:0 0 24px;color:#475569;">Tu recevras par email nos meilleures alertes de vols pas chers depuis la Belgique et la France. En attendant, explore nos destinations.</p>
     ${ctaButton("Explorer les destinations", `${site.url}/vols-pas-chers`, "#0ea5e9")}`,
  );

  const text = `Bienvenue chez ${site.name}.
${site.promise}
Tu recevras nos meilleures alertes de vols pas chers depuis la Belgique et la France.

Explorer les destinations : ${site.url}/vols-pas-chers

Se désinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Bienvenue chez ${site.name} - Les bons plans arrivent`,
    html: emailLayout(hero + body, unsubscribeUrl),
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}

export function confirmEmail(to: string, confirmUrl: string): EmailMessage {
  const hero = emailHero(
    "#f0fdf4",
    `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.06em;">Presque fini</p>
     <p style="margin:0;font-size:24px;font-weight:800;color:#14532d;line-height:1.2;">Confirme ton inscription.</p>`,
  );

  const body = emailContent(
    `<p style="margin:0 0 8px;color:#475569;">Encore une étape : clique sur le bouton ci-dessous pour confirmer ton inscription à ${site.name} et commencer à recevoir les bons plans de vols.</p>
     ${ctaButton("Confirmer mon inscription", confirmUrl, "#16a34a")}
     <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;text-align:center;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>`,
  );

  const text = `Confirme ton inscription à ${site.name}.
Clique sur ce lien pour confirmer : ${confirmUrl}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ton inscription à ${site.name}`,
    html: emailLayout(hero + body),
    text,
    replyTo: site.email,
  };
}

export function unsubscribeLinkEmail(
  to: string,
  unsubscribeUrl: string,
): EmailMessage {
  const body = emailContent(
    `<h1 style="margin:0 0 14px;font-size:22px;font-weight:800;">Tu veux te désinscrire ?</h1>
     <p style="margin:0 0 4px;color:#475569;">Tu as demandé à ne plus recevoir nos emails. Clique sur le bouton ci-dessous pour confirmer.</p>
     ${ctaButton("Confirmer la désinscription", unsubscribeUrl)}
     <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;text-align:center;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>`,
  );

  const text = `Tu as demandé à te désinscrire de ${site.name}.
Confirme en ouvrant ce lien : ${unsubscribeUrl}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ta désinscription - ${site.name}`,
    html: emailLayout(body),
    text,
    replyTo: site.email,
  };
}

export function unsubscribeEmail(to: string): EmailMessage {
  const body = emailContent(
    `<h1 style="margin:0 0 14px;font-size:22px;font-weight:800;">C'est noté.</h1>
     <p style="margin:0 0 12px;color:#475569;">Tu ne recevras plus nos alertes ni notre newsletter. On espère te revoir un jour.</p>
     <p style="margin:0;color:#475569;">Tu changes d'avis ? Tu peux te réinscrire à tout moment sur <a href="${site.url}" style="${LINK}">${site.domain}</a>.</p>`,
  );

  const text = `Tu ne recevras plus nos emails.
Tu changes d'avis ? Réinscris-toi sur ${site.url}.`;

  return {
    to,
    subject: `Désinscription confirmée - ${site.name}`,
    html: emailLayout(body),
    text,
    replyTo: site.email,
  };
}

export function accountDeletedEmail(to: string): EmailMessage {
  const body = emailContent(
    `<h1 style="margin:0 0 14px;font-size:22px;font-weight:800;">Ton compte a été supprimé.</h1>
     <p style="margin:0 0 12px;color:#475569;">Comme demandé, ton compte ${site.name} a été supprimé : toutes tes données ont été effacées et ton abonnement premium éventuel a été résilié. Tu ne seras plus débité.</p>
     <p style="margin:0;color:#475569;">Tu peux te réinscrire à tout moment sur <a href="${site.url}" style="${LINK}">${site.domain}</a>.</p>`,
  );

  const text = `Ton compte ${site.name} a été supprimé : données effacées et abonnement résilié.
Tu peux te réinscrire sur ${site.url}.`;

  return {
    to,
    subject: `Ton compte ${site.name} a été supprimé`,
    html: emailLayout(body),
    text,
    replyTo: site.email,
  };
}

// Email ADMIN interne : stock de bons plans trop bas.
export function dealsAlertEmail(
  count: number,
  level: "urgence" | "attention",
): EmailMessage {
  const urgence = level === "urgence";
  const color = urgence ? "#dc2626" : "#d97706";
  const bg = urgence ? "#fef2f2" : "#fffbeb";
  const title = urgence
    ? "URGENCE : moins de 50 bons plans aujourd'hui"
    : "ATTENTION : moins de 100 bons plans aujourd'hui";

  const hero = emailHero(
    bg,
    `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.06em;">${level.toUpperCase()}</p>
     <p style="margin:0;font-size:22px;font-weight:800;color:${color};line-height:1.2;">${count} bons plans restants</p>`,
  );

  const body = emailContent(
    `<p style="margin:0 0 12px;color:#475569;">${title}</p>
     <p style="margin:0;color:#475569;">Vérifie le scanner (GitHub Actions) ou relance-le pour réalimenter le stock.</p>
     ${ctaButton("Voir GitHub Actions", `https://github.com/BauwensThomas/bonvoleur/actions`, color)}`,
  );

  return {
    to: site.email,
    subject: urgence
      ? `URGENCE : moins de 50 bons plans (${count})`
      : `ATTENTION : moins de 100 bons plans (${count})`,
    html: emailLayout(hero + body),
    text: `${title}\nIl reste ${count} bon(s) plan(s) visible(s) sur ${site.name}. Vérifie le scanner.`,
    replyTo: site.email,
  };
}

// Email ADMIN interne : nouvel avis client en attente de validation.
export function newReviewAlertEmail(
  rating: number,
  name: string,
  comment: string | null,
): EmailMessage {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const hero = emailHero(
    "#fffbeb",
    `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.06em;">Nouvel avis</p>
     <p style="margin:0;font-size:22px;font-weight:800;color:#78350f;line-height:1.2;">${stars}</p>`,
  );

  const body = emailContent(
    `<p style="margin:0 0 4px;color:#475569;"><strong>${escapeHtml(name)}</strong> vient de laisser un avis en attente de validation.</p>
     ${comment ? `<p style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-radius:8px;color:#334155;font-style:italic;">"${escapeHtml(comment)}"</p>` : ""}
     ${ctaButton("Valider l'avis", `${site.url}/admin/reviews`, "#d97706")}`,
  );

  return {
    to: site.email,
    subject: `Nouvel avis (${rating}/5) de ${name} - en attente de validation`,
    html: emailLayout(hero + body),
    text: `Nouvel avis de ${name} (${rating}/5) en attente de validation.${comment ? `\n"${comment}"` : ""}\n\nValider : ${site.url}/admin/reviews`,
    replyTo: site.email,
  };
}

// Alerte immédiate (pas le digest habituel) envoyée à un abonné dont
// l'aéroport suivi vient d'être désactivé par l'admin - en plus du bandeau
// jaune déjà présent dans le prochain digest (rappel passif), celle-ci
// prévient tout de suite plutôt que d'attendre le prochain envoi programmé.
export function airportDeactivatedEmail(
  to: string,
  city: string,
  remainingCities: string[],
  unsubscribeUrl: string,
): EmailMessage {
  const hero = emailHero(
    "#fef9c3",
    `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:.06em;">Aéroport désactivé</p>
     <p style="margin:0;font-size:22px;font-weight:800;color:#713f12;line-height:1.2;">${escapeHtml(city)} temporairement indisponible</p>`,
  );

  const remainingLine = remainingCities.length > 0
    ? `<p style="margin:12px 0 0;color:#475569;">Tu continues de recevoir des bons plans pour <strong>${remainingCities.map(escapeHtml).join(", ")}</strong>. Tu peux aussi ajouter un aéroport supplémentaire.</p>`
    : "";

  const body = emailContent(
    `<p style="margin:0;color:#334155;">Pas assez de bons plans disponibles au départ de <strong>${escapeHtml(city)}</strong> en ce moment - on a désactivé cet aéroport temporairement.</p>
     ${remainingLine}
     <p style="margin:12px 0 0;color:#334155;">Choisis un autre aéroport pour continuer à recevoir des bons plans.</p>
     ${ctaButton("Mettre à jour mes préférences", `${site.url}/compte/preferences`, "#d97706")}`,
  );

  return {
    to,
    subject: `Ton aéroport ${city} a été désactivé temporairement`,
    html: emailLayout(hero + body, unsubscribeUrl),
    text: `${city} a été désactivé temporairement (pas assez de bons plans disponibles).${remainingCities.length ? ` Tu continues de recevoir des bons plans pour ${remainingCities.join(", ")}.` : ""} Choisis un autre aéroport : ${site.url}/compte/preferences`,
    replyTo: site.email,
  };
}

// Newsletter blog hebdomadaire.
type NewsletterPost = Pick<Post, "slug" | "title" | "excerpt" | "cover_image">;

export function blogNewsletterEmail(
  to: string,
  posts: NewsletterPost[],
  unsubscribeUrl: string,
  trackingToken?: string,
): EmailMessage {
  const cards = posts
    .map((p) => {
      const url = `${site.url}/blog/${p.slug}`;
      const cover = p.cover_image
        ? `<a href="${url}"><img src="${p.cover_image}" alt="" width="100%" style="display:block;border-radius:10px 10px 0 0;max-height:220px;object-fit:cover;" /></a>`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr><td>${cover}</td></tr>
        <tr><td style="padding:16px 18px;">
          <a href="${url}" style="font-size:17px;font-weight:700;color:#0f172a;text-decoration:none;line-height:1.3;">${escapeHtml(p.title)}</a>
          <p style="margin:8px 0 12px;font-size:14px;color:#475569;line-height:1.5;">${escapeHtml(p.excerpt)}</p>
          <a href="${url}" style="font-size:14px;font-weight:700;${LINK}">Lire l'article &rarr;</a>
        </td></tr>
      </table>`;
    })
    .join("");

  const intro = `<tr><td style="padding:32px 32px 20px;">
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;">Le blog de la semaine</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;">Nos derniers conseils pour voyager moins cher.</p>
    ${cards}
    <p style="margin:0;text-align:center;">${ctaButton("Voir tous les articles", `${site.url}/blog`)}</p>
  </td></tr>`;

  const text = `Le blog ${site.name} de la semaine

${posts.map((p) => `${p.title}\n${site.url}/blog/${p.slug}`).join("\n\n")}

Se désinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Le blog ${site.name} : nos derniers articles`,
    html: emailLayout(intro, unsubscribeUrl, trackingToken),
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}
