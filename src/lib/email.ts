// Couche d'envoi d'email agnostique.
// Le provider est choisi selon les variables d'environnement et le tier :
//   - tier "free"    -> Resend en priorité (RESEND_API_KEY)
//   - tier "premium" -> Brevo en priorité (BREVO_API_KEY)
//   - transactionnel (sans tier) -> Resend puis Brevo
//   - repli sur l'autre provider si la clé préférée manque, sinon Local (logs).
//
// Router par tier sépare les réputations d'envoi : les gratuits (moins engagés)
// n'impactent pas la délivrabilité des premium qui paient, et on additionne les
// quotas gratuits des deux fournisseurs. Pour changer de routage : ce seul fichier.

import { site } from "./site";

export type ProviderTier = "free" | "premium";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // URL de désinscription : ajoutée en header List-Unsubscribe (one-click),
  // exigé par Gmail/Outlook pour les envois en nombre et bon pour la réputation.
  listUnsubscribe?: string;
}

export interface EmailResult {
  id: string | null;
  provider: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<EmailResult>;
}

function fromAddress(): string {
  // Ex : "BonVoleur <contact@bonvoleur.com>"
  return process.env.EMAIL_FROM ?? `${site.name} <${site.email}>`;
}

function toArray(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

// Headers communs (List-Unsubscribe one-click) selon le message.
function buildHeaders(msg: EmailMessage): Record<string, string> | undefined {
  if (!msg.listUnsubscribe) return undefined;
  return {
    "List-Unsubscribe": `<${msg.listUnsubscribe}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

// --- Provider local (aucune clé) : ne fait qu'écrire dans la console ---
class LocalEmailProvider implements EmailProvider {
  readonly name = "local";
  async send(msg: EmailMessage): Promise<EmailResult> {
    console.info(
      `[email:local] (aucun envoi réel) à=${toArray(msg.to).join(", ")} | objet="${msg.subject}"`
    );
    return { id: null, provider: this.name };
  }
}

// --- Resend (https://resend.com/docs/api-reference/emails/send-email) ---
class ResendProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private apiKey: string) {}

  async send(msg: EmailMessage): Promise<EmailResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: toArray(msg.to),
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
        headers: buildHeaders(msg),
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id ?? null, provider: this.name };
  }
}

// --- Brevo (https://developers.brevo.com - POST /v3/smtp/email) ---
class BrevoProvider implements EmailProvider {
  readonly name = "brevo";
  constructor(private apiKey: string) {}

  async send(msg: EmailMessage): Promise<EmailResult> {
    const from = fromAddress();
    // Sépare "Nom <email>" en {name, email} attendu par Brevo.
    const match = from.match(/^(.*)<(.+)>$/);
    const sender = match
      ? { name: match[1].trim(), email: match[2].trim() }
      : { email: from };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: toArray(msg.to).map((email) => ({ email })),
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
        replyTo: msg.replyTo ? { email: msg.replyTo } : undefined,
        headers: buildHeaders(msg),
      }),
    });
    if (!res.ok) {
      throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { messageId?: string };
    return { id: data.messageId ?? null, provider: this.name };
  }
}

const cache: { resend?: EmailProvider; brevo?: EmailProvider; local?: EmailProvider } = {};

function resendProvider(): EmailProvider | null {
  if (!process.env.RESEND_API_KEY) return null;
  return (cache.resend ??= new ResendProvider(process.env.RESEND_API_KEY));
}

function brevoProvider(): EmailProvider | null {
  if (!process.env.BREVO_API_KEY) return null;
  return (cache.brevo ??= new BrevoProvider(process.env.BREVO_API_KEY));
}

function localProvider(): EmailProvider {
  return (cache.local ??= new LocalEmailProvider());
}

// Routage par tier : free -> Resend, premium -> Brevo, avec repli sur l'autre
// provider puis sur le local. Sans tier (emails transactionnels) : Resend puis Brevo.
export function getEmailProvider(tier?: ProviderTier): EmailProvider {
  if (tier === "premium") return brevoProvider() ?? resendProvider() ?? localProvider();
  if (tier === "free") return resendProvider() ?? brevoProvider() ?? localProvider();
  return resendProvider() ?? brevoProvider() ?? localProvider();
}

export function sendEmail(msg: EmailMessage, tier?: ProviderTier): Promise<EmailResult> {
  return getEmailProvider(tier).send(msg);
}
