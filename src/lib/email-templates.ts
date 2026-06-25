// Templates d'email (HTML + texte). Règles : pas de tiret long, pas d'émoji.
// Tous les emails partagent le MÊME gabarit (emailLayout) : bannière bleue
// "BonVoleur.com" en haut, pied avec réseaux + bouton "se désinscrire".

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

// Petits logos (SVG inline) pour les liens reseaux. Partages avec deal-send.
export const IG_LOGO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0369a1" style="vertical-align:middle;margin-right:5px;"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.21 15.6 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zm0 2.25a4.15 4.15 0 1 1 0 8.3 4.15 4.15 0 0 1 0-8.3zm6.6-3.7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`;
export const FB_LOGO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0369a1" style="vertical-align:middle;margin-right:5px;"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>`;

const LINK = "color:#0369a1;text-decoration:none;";

// Logo hébergé dans Supabase Storage (URL toujours joignable depuis un email,
// même si le site n'est pas encore déployé).
const LOGO_URL =
  "https://hdzzfhjnjcblcejcpnkw.supabase.co/storage/v1/object/public/photos/brand/logo.png";

// Gabarit commun à TOUS les emails : bannière + contenu + pied (réseaux +
// désinscription si unsubscribeUrl fourni). Largeur 640px.
export function emailLayout(
  subtitle: string,
  inner: string,
  unsubscribeUrl?: string
): string {
  const footerUnsub = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="display:inline-block;border:1px solid #cbd5e1;border-radius:8px;padding:7px 14px;font-size:12px;color:#64748b;text-decoration:none;">Se désinscrire</a>`
    : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0ea5e9;padding:14px 28px;">
          <img src="${LOGO_URL}" width="40" height="40" alt="" style="vertical-align:middle;background:#ffffff;border-radius:50%;margin-right:10px;" />
          <span style="font-size:18px;font-weight:800;color:#ffffff;vertical-align:middle;">BonVoleur<span style="color:#bae6fd;">.com</span></span>
          <span style="float:right;color:#e0f2fe;font-size:13px;line-height:40px;">${subtitle}</span>
        </td></tr>
        ${inner}
        <tr><td align="center" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;text-align:center;">
          <p style="margin:0 0 6px;font-size:14px;"><a href="${site.url}" style="${LINK}font-weight:bold;">${site.domain}</a></p>
          <p style="margin:0 0 12px;font-size:14px;">
            <a href="${site.social.instagram}" style="${LINK}margin-right:16px;">${IG_LOGO}Instagram</a>
            <a href="${site.social.facebook}" style="${LINK}">${FB_LOGO}Facebook</a>
          </p>
          ${footerUnsub}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Rangée de contenu standard (à passer comme `inner`).
export function emailContent(html: string): string {
  return `<tr><td style="padding:24px 28px;font-size:15px;line-height:1.6;color:#0f172a;">${html}</td></tr>`;
}

export function welcomeEmail(to: string, unsubscribeUrl: string): EmailMessage {
  const inner = emailContent(
    `<h1 style="margin:0 0 12px;font-size:22px;">Bienvenue chez ${site.name}</h1>
     <p style="margin:0 0 12px;">${site.promise}</p>
     <p style="margin:0 0 12px;">Tu recevras par email nos meilleures alertes de vols pas chers depuis la Belgique et la France.</p>
     <p style="margin:0;">En attendant, garde un œil sur ta boîte mail. Les premiers deals arrivent bientôt.</p>`
  );

  const text = `Bienvenue chez ${site.name}.
${site.promise}
Tu recevras par email nos meilleures alertes de vols pas chers depuis la Belgique et la France.

Te desinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Bienvenue chez ${site.name}`,
    html: emailLayout("Bienvenue", inner, unsubscribeUrl),
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}

// Double opt-in : confirmation envoyée juste après l'inscription.
export function confirmEmail(to: string, confirmUrl: string): EmailMessage {
  const inner = emailContent(
    `<h1 style="margin:0 0 12px;font-size:22px;">Confirme ton inscription</h1>
     <p style="margin:0 0 12px;">Encore une étape : clique sur le bouton ci-dessous pour confirmer ton inscription à ${site.name} et commencer à recevoir les bons plans de vols.</p>
     <p style="margin:20px 0;"><a href="${confirmUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:bold;">Confirmer mon inscription</a></p>
     <p style="margin:0;font-size:13px;color:#64748b;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>`
  );

  const text = `Confirme ton inscription à ${site.name}.
Clique sur ce lien pour confirmer : ${confirmUrl}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ton inscription à ${site.name}`,
    html: emailLayout("Inscription", inner),
    text,
    replyTo: site.email,
  };
}

// Email envoyé depuis la page publique de désinscription (lien sécurisé).
export function unsubscribeLinkEmail(
  to: string,
  unsubscribeUrl: string
): EmailMessage {
  const inner = emailContent(
    `<h1 style="margin:0 0 12px;font-size:22px;">Confirme ta désinscription</h1>
     <p style="margin:0 0 12px;">Tu as demandé à ne plus recevoir nos emails. Clique sur le bouton ci-dessous pour confirmer.</p>
     <p style="margin:20px 0;"><a href="${unsubscribeUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:bold;">Confirmer</a></p>
     <p style="margin:0;font-size:13px;color:#64748b;">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`
  );

  const text = `Tu as demandé à te désinscrire de ${site.name}.
Confirme en ouvrant ce lien : ${unsubscribeUrl}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ta désinscription - ${site.name}`,
    html: emailLayout("Desinscription", inner),
    text,
    replyTo: site.email,
  };
}

export function unsubscribeEmail(to: string): EmailMessage {
  const inner = emailContent(
    `<h1 style="margin:0 0 12px;font-size:22px;">Tu ne recevras plus d'emails</h1>
     <p style="margin:0 0 12px;">C'est noté : on ne t'envoie plus d'alertes ni de newsletter.</p>
     <p style="margin:0;">Tu changes d'avis ? Tu peux te réinscrire à tout moment sur <a href="${site.url}" style="${LINK}">${site.domain}</a>.</p>`
  );

  const text = `Tu ne recevras plus nos emails.
Tu changes d'avis ? Réinscris-toi sur ${site.url}.`;

  return {
    to,
    subject: `Désinscription confirmée - ${site.name}`,
    html: emailLayout("Desinscription", inner),
    text,
    replyTo: site.email,
  };
}

// Confirmation de SUPPRESSION DÉFINITIVE du compte (données + abonnement effacés).
export function accountDeletedEmail(to: string): EmailMessage {
  const inner = emailContent(
    `<h1 style="margin:0 0 12px;font-size:22px;">Ton compte a été supprimé</h1>
     <p style="margin:0 0 12px;">Comme demandé, ton compte ${site.name} a été supprimé : toutes tes données ont été effacées et ton abonnement premium éventuel a été résilié. Tu ne seras plus débité.</p>
     <p style="margin:0;">Tu peux te réinscrire à tout moment sur <a href="${site.url}" style="${LINK}">${site.domain}</a>.</p>`
  );

  const text = `Ton compte ${site.name} a été supprimé : données effacées et abonnement résilié.
Tu peux te réinscrire sur ${site.url}.`;

  return {
    to,
    subject: `Ton compte ${site.name} a été supprimé`,
    html: emailLayout("Compte supprimé", inner),
    text,
    replyTo: site.email,
  };
}

// Newsletter blog hebdomadaire (vendredi) : les 3 derniers articles publiés.
type NewsletterPost = Pick<Post, "slug" | "title" | "excerpt" | "cover_image">;

export function blogNewsletterEmail(
  to: string,
  posts: NewsletterPost[],
  unsubscribeUrl: string
): EmailMessage {
  const cards = posts
    .map((p) => {
      const url = `${site.url}/blog/${p.slug}`;
      const cover = p.cover_image
        ? `<a href="${url}"><img src="${p.cover_image}" alt="" width="100%" style="display:block;border-radius:10px 10px 0 0;max-height:200px;object-fit:cover;"/></a>`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr><td>${cover}</td></tr>
        <tr><td style="padding:14px 16px;">
          <a href="${url}" style="font-size:17px;font-weight:700;color:#0f172a;text-decoration:none;">${escapeHtml(p.title)}</a>
          <p style="margin:6px 0 10px;font-size:14px;color:#475569;">${escapeHtml(p.excerpt)}</p>
          <a href="${url}" style="font-size:14px;font-weight:600;${LINK}">Lire l'article</a>
        </td></tr>
      </table>`;
    })
    .join("");

  const inner = emailContent(
    `<h1 style="margin:0 0 4px;font-size:22px;">Le blog de la semaine</h1>
     <p style="margin:0 0 18px;font-size:14px;color:#475569;">Nos derniers conseils pour voyager moins cher.</p>
     ${cards}`
  );

  const text = `Le blog ${site.name} de la semaine

${posts.map((p) => `${p.title}\n${site.url}/blog/${p.slug}`).join("\n\n")}

Te desinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Le blog ${site.name} : nos derniers articles`,
    html: emailLayout("Newsletter", inner, unsubscribeUrl),
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}
