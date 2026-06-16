import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { findOne, insert } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { allow } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const schema = z.object({
  email: z.string().email("Email invalide"),
  home_airports: z.array(z.string().max(8)).optional().default([]),
  consent: z.boolean(),
  website: z.string().optional().default(""), // honeypot
});

export async function POST(req: Request) {
  // Limite : 10 inscriptions par minute et par IP (anti-abus).
  const ip = getClientIp(req);
  if (!allow("subscribe", ip, { windowMs: 60 * 1000, max: 10 })) {
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
  const existing = await findOne(
    "subscribers",
    (s) => s.email === normalized
  );
  if (existing) {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  const token = randomUUID();
  await insert("subscribers", {
    email: normalized,
    tier: "free",
    home_airports: home_airports.map((a) => a.toUpperCase()),
    email_frequency: "weekly",
    unsubscribe_token: token,
    consent_at: new Date().toISOString(),
    unsubscribed_at: null,
    referrer_id: null,
  });

  // Email de bienvenue via la couche agnostique (no-op en local sans clé).
  // Phase 1 : passer en double opt-in (email de confirmation avant activation).
  try {
    await sendEmail(welcomeEmail(normalized, unsubscribeUrl(normalized, token)));
  } catch (err) {
    // Ne bloque pas l'inscription si l'envoi échoue.
    console.error("[subscribe] envoi email échoué:", err);
  }

  return NextResponse.json({ ok: true });
}
