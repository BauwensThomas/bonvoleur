// Templates d'email (HTML + texte). Règles : pas de tiret long, pas d'émoji.

import { site } from "./site";
import type { EmailMessage } from "./email";

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
      <p style="margin: 0 0 12px;">
        <a href="${site.social.instagram}" style="color: #0369a1; text-decoration: none; margin-right: 12px;">Instagram</a>
        <a href="${site.social.facebook}" style="color: #0369a1; text-decoration: none;">Facebook</a>
      </p>
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
