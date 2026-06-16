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
      <p style="margin: 0 0 12px;">Tu recevras nos meilleures alertes de vols pas chers depuis la Belgique et la France, dès qu'un bon plan tombe.</p>
      <p style="margin: 0 0 12px;">En attendant, garde un oeil sur ta boite mail. Les premiers deals arrivent bientot.</p>
      <p style="margin: 16px 0 6px; font-size: 14px;">Rejoins-nous aussi sur les reseaux :</p>
      <p style="margin: 0 0 12px;">
        <a href="${site.social.instagram}" style="color: #0369a1; text-decoration: none; margin-right: 12px;">Instagram</a>
        <a href="${site.social.facebook}" style="color: #0369a1; text-decoration: none;">Facebook</a>
      </p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">Tu peux te <a href="${unsubscribeUrl}" style="color: #64748b;">desinscrire</a> a tout moment.</p>
    </div>
  </body>
</html>`;

  const text = `Bienvenue chez ${site.name}.
${site.promise}
Tu recevras nos meilleures alertes de vols pas chers depuis la Belgique et la France, des qu'un bon plan tombe.

Rejoins-nous sur les reseaux :
Instagram : ${site.social.instagram}
Facebook : ${site.social.facebook}

Te desinscrire : ${unsubscribeUrl}`;

  return {
    to,
    subject: `Bienvenue chez ${site.name}`,
    html,
    text,
    replyTo: site.email,
    listUnsubscribe: unsubscribeUrl,
  };
}

// Double opt-in : email de confirmation envoye juste apres l'inscription.
// L'abonne n'est actif qu'apres avoir clique le bouton de confirmation.
export function confirmEmail(to: string, confirmUrl: string): EmailMessage {
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Confirme ton inscription</h1>
      <p style="margin: 0 0 12px;">Encore une etape : clique sur le bouton ci-dessous pour confirmer ton inscription a ${site.name} et commencer a recevoir les bons plans de vols.</p>
      <p style="margin: 20px 0;">
        <a href="${confirmUrl}" style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Confirmer mon inscription</a>
      </p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">Si tu n'es pas a l'origine de cette demande, ignore simplement cet email.</p>
    </div>
  </body>
</html>`;

  const text = `Confirme ton inscription a ${site.name}.
Clique sur ce lien pour confirmer et commencer a recevoir les bons plans :
${confirmUrl}

Si tu n'es pas a l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ton inscription a ${site.name}`,
    html,
    text,
    replyTo: site.email,
  };
}

// Email envoye depuis la page publique de desinscription : on n'agit pas sur
// simple saisie d'email, on envoie le lien securise au proprietaire de la boite.
export function unsubscribeLinkEmail(to: string, unsubscribeUrl: string): EmailMessage {
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Confirme ta desinscription</h1>
      <p style="margin: 0 0 12px;">Tu as demande a te desinscrire de ${site.name}. Clique sur le bouton ci-dessous pour confirmer.</p>
      <p style="margin: 20px 0;">
        <a href="${unsubscribeUrl}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Me desinscrire</a>
      </p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">Si tu n'es pas a l'origine de cette demande, ignore cet email : rien ne sera modifie.</p>
    </div>
  </body>
</html>`;

  const text = `Tu as demande a te desinscrire de ${site.name}.
Confirme en ouvrant ce lien : ${unsubscribeUrl}

Si tu n'es pas a l'origine de cette demande, ignore cet email.`;

  return {
    to,
    subject: `Confirme ta desinscription - ${site.name}`,
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
      <h1 style="font-size: 20px; margin: 0 0 8px;">Tu es bien desinscrit</h1>
      <p style="margin: 0 0 12px;">Tu ne recevras plus nos alertes de vols. Aucune action de ta part n'est necessaire.</p>
      <p style="margin: 0 0 12px;">Tu changes d'avis ? Tu peux te reinscrire a tout moment sur <a href="${site.url}" style="color: #0369a1; text-decoration: none;">${site.domain}</a>.</p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">A bientot peut-etre.</p>
    </div>
  </body>
</html>`;

  const text = `Tu es bien desinscrit de ${site.name}.
Tu ne recevras plus nos alertes de vols.
Tu changes d'avis ? Reinscris-toi sur ${site.url}.`;

  return {
    to,
    subject: `Desinscription confirmee - ${site.name}`,
    html,
    text,
    replyTo: site.email,
  };
}
