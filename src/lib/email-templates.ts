// Templates d'email (HTML + texte). Règles : pas de tiret long, pas d'émoji.

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

// Petits logos (SVG inline) pour les liens reseaux. Partages avec les emails
// deals (deal-send.ts). Le libelle texte reste a cote comme repli si le client
// mail ne rend pas le SVG.
export const IG_LOGO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0369a1" style="vertical-align:middle;margin-right:5px;"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.21 15.6 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zm0 2.25a4.15 4.15 0 1 1 0 8.3 4.15 4.15 0 0 1 0-8.3zm6.6-3.7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`;
export const FB_LOGO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#0369a1" style="vertical-align:middle;margin-right:5px;"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>`;

// Ligne de liens reseaux (icone cliquable + libelle).
function socialLine(): string {
  return `<p style="margin: 16px 0 12px; font-size: 14px;">
        <a href="${site.social.instagram}" style="color: #0369a1; text-decoration: none; margin-right: 16px;">${IG_LOGO}Instagram</a>
        <a href="${site.social.facebook}" style="color: #0369a1; text-decoration: none;">${FB_LOGO}Facebook</a>
      </p>`;
}

export function welcomeEmail(to: string, unsubscribeUrl: string): EmailMessage {
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Bienvenue chez ${site.name}</h1>
      <p style="margin: 0 0 12px;">${site.promise}</p>
      <p style="margin: 0 0 12px;">Tu recevras par email nos meilleures alertes de vols pas chers depuis la Belgique et la France.</p>
      <p style="margin: 0 0 12px;">En attendant, garde un œil sur ta boîte mail. Les premiers deals arrivent bientôt.</p>
      <p style="margin: 16px 0 6px; font-size: 14px;">Rejoins-nous aussi sur les réseaux :</p>
      ${socialLine()}
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">Tu peux te <a href="${unsubscribeUrl}" style="color: #64748b;">désinscrire</a> à tout moment.</p>
    </div>
  </body>
</html>`;

  const text = `Bienvenue chez ${site.name}.
${site.promise}
Tu recevras par email nos meilleures alertes de vols pas chers depuis la Belgique et la France.

Rejoins-nous sur les réseaux :
Instagram : ${site.social.instagram}
Facebook : ${site.social.facebook}

Te désinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Bienvenue chez ${site.name}`,
    html,
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}

// Double opt-in : email de confirmation envoyé juste après l'inscription.
// L'abonné n'est actif qu'après avoir cliqué le bouton de confirmation.
export function confirmEmail(to: string, confirmUrl: string): EmailMessage {
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Confirme ton inscription</h1>
      <p style="margin: 0 0 12px;">Encore une étape : clique sur le bouton ci-dessous pour confirmer ton inscription à ${site.name} et commencer à recevoir les bons plans de vols.</p>
      <p style="margin: 20px 0;">
        <a href="${confirmUrl}" style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Confirmer mon inscription</a>
      </p>
      <p style="margin: 16px 0 6px; font-size: 14px;">Retrouve-nous sur les réseaux :</p>
      ${socialLine()}
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>
    </div>
  </body>
</html>`;

  const text = `Confirme ton inscription à ${site.name}.
Clique sur ce lien pour confirmer et commencer à recevoir les bons plans :
${confirmUrl}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ton inscription à ${site.name}`,
    html,
    text,
    replyTo: site.email,
  };
}

// Email envoyé depuis la page publique de désinscription : on n'agit pas sur
// simple saisie d'email, on envoie le lien sécurisé au propriétaire de la boîte.
export function unsubscribeLinkEmail(to: string, unsubscribeUrl: string): EmailMessage {
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Confirme ta désinscription</h1>
      <p style="margin: 0 0 12px;">Tu as demandé à te désinscrire de ${site.name}. Clique sur le bouton ci-dessous pour confirmer.</p>
      <p style="margin: 20px 0;">
        <a href="${unsubscribeUrl}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Me désinscrire</a>
      </p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">Si tu n'es pas à l'origine de cette demande, ignore cet email : rien ne sera modifié.</p>
    </div>
  </body>
</html>`;

  const text = `Tu as demandé à te désinscrire de ${site.name}.
Confirme en ouvrant ce lien : ${unsubscribeUrl}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ta désinscription - ${site.name}`,
    html,
    text,
    replyTo: site.email,
  };
}

export function unsubscribeEmail(to: string): EmailMessage {
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Tu es bien désinscrit</h1>
      <p style="margin: 0 0 12px;">Tu ne recevras plus nos alertes de vols. Aucune action de ta part n'est nécessaire.</p>
      <p style="margin: 0 0 12px;">Tu changes d'avis ? Tu peux te réinscrire à tout moment sur <a href="${site.url}" style="color: #0369a1; text-decoration: none;">${site.domain}</a>.</p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">À bientôt peut-être.</p>
    </div>
  </body>
</html>`;

  const text = `Tu es bien désinscrit de ${site.name}.
Tu ne recevras plus nos alertes de vols.
Tu changes d'avis ? Réinscris-toi sur ${site.url}.`;

  return {
    to,
    subject: `Désinscription confirmée - ${site.name}`,
    html,
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
        ? `<a href="${url}"><img src="${p.cover_image}" alt="" width="100%" style="display:block;border-radius:10px 10px 0 0;max-height:180px;object-fit:cover;"/></a>`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr><td>${cover}</td></tr>
        <tr><td style="padding:14px 16px;">
          <a href="${url}" style="font-size:17px;font-weight:700;color:#0f172a;text-decoration:none;">${escapeHtml(p.title)}</a>
          <p style="margin:6px 0 10px;font-size:14px;color:#475569;">${escapeHtml(p.excerpt)}</p>
          <a href="${url}" style="font-size:14px;font-weight:600;color:#0369a1;text-decoration:none;">Lire l'article</a>
        </td></tr>
      </table>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f1f5f9; margin: 0; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 24px;">
      <h1 style="font-size: 20px; margin: 0 0 4px;">Le blog ${site.name} de la semaine</h1>
      <p style="margin: 0 0 18px; font-size: 14px; color: #475569;">Nos derniers conseils pour voyager moins cher.</p>
      ${cards}
      <p style="margin: 18px 0 6px; font-size: 14px;">Retrouve-nous sur les réseaux :</p>
      ${socialLine()}
      <p style="margin: 14px 0 0; font-size: 12px; color: #94a3b8;">Tu reçois la newsletter du vendredi. Tu peux la désactiver dans tes préférences, ou te <a href="${unsubscribeUrl}" style="color: #64748b;">désinscrire</a>.</p>
    </div>
  </body>
</html>`;

  const text = `Le blog ${site.name} de la semaine

${posts.map((p) => `${p.title}\n${site.url}/blog/${p.slug}`).join("\n\n")}

Te désinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Le blog ${site.name} : nos derniers articles`,
    html,
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}
