import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { findOne, insert, update } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { allow } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { confirmEmail } from "@/lib/email-templates";
import { confirmUrl } from "@/lib/unsubscribe";

const schema = z.object({
  email: z.string().email("Email invalide"),
  home_airports: z.array(z.string().max(8)).optional().default([]),
  consent: z.boolean(),
  website: z.string().optional().default(""), // honeypot
});

export async function POST(req: Request) {
  // Limite : 10 inscriptions par minute et par IP (anti-abus).
  const ip = getClientIp(req);
  if (!await allow("subscribe", ip, { windowMs: 60 * 1000, max: 10 })) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessaie dans une minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const { email, home_airports, consent, website } = parsed.data;

  // Honeypot : un bot remplit ce champ caché. On fait semblant d'accepter.
  if (website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (!consent) {
    return NextResponse.json(
      { error: "Le consentement est requis." },
      { status: 400 }
    );
  }

  const normalized = email.trim().toLowerCase();
  const airports = home_airports.map((a) => a.toUpperCase());
  const existing = await findOne(
    "subscribers",
    (s) => s.email === normalized
  );

  if (existing) {
    // Déjà inscrit, confirmé et actif -> rien à faire.
    if (existing.consent_at && !existing.unsubscribed_at) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    // Désinscrit OU inscription jamais confirmée -> on relance le double opt-in
    // (réactivation propre, re-confirmation requise pour le RGPD).
    const reToken = existing.unsubscribe_token || randomUUID();
    await update("subscribers", existing.id, {
      home_airports: airports,
      unsubscribed_at: null,
      consent_at: null,
      unsubscribe_token: reToken,
    });
    try {
      await sendEmail(confirmEmail(normalized, confirmUrl(normalized, reToken)));
    } catch (err) {
      console.error("[subscribe] envoi confirmation (réinscription) échoué:", err);
    }
    return NextResponse.json({ ok: true, pendingConfirmation: true });
  }

  const token = randomUUID();
  await insert("subscribers", {
    email: normalized,
    tier: "free",
    home_airports: airports,
    // Pas de fréquence figée : la cadence suit le tier (gratuit -> hebdo,
    // premium -> quotidien) tant que l'abonné ne choisit pas lui-même.
    email_frequency: undefined,
    unsubscribe_token: token,
    consent_at: null, // double opt-in : confirmé seulement après clic sur le lien
    unsubscribed_at: null,
    referrer_id: null,
  });

  // Double opt-in : on envoie un email de CONFIRMATION. L'abonné n'est actif
  // (consent_at daté) qu'après avoir cliqué le lien. Anti-spam + RGPD.
  try {
    await sendEmail(confirmEmail(normalized, confirmUrl(normalized, token)));
  } catch (err) {
    // Ne bloque pas l'inscription si l'envoi échoue.
    console.error("[subscribe] envoi email échoué:", err);
  }

  return NextResponse.json({ ok: true, pendingConfirmation: true });
}
