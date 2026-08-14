import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { findOne, insert } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

const schema = z.object({
  home_airport: z.string().min(3).max(8),
  consent: z.boolean(),
});

// Equivalent bearer-token de /api/member/finalize (web, cookie) : finalise
// l'inscription d'un utilisateur AUTHENTIFIE (Google, l'app n'a pas de flux
// mot de passe sans passer par LoginScreen qui gere deja ce cas) mais pas
// encore abonne - demande aeroport + consentement, cree l'abonne. Email deja
// verifie par le fournisseur -> pas de double opt-in, consent_at date direct.
export async function POST(req: Request) {
  const state = await getMobileMemberState(req);

  if (state.status !== "no-account") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: "Requête invalide." }, { status: 400 }));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data.consent) {
    return withCors(
      NextResponse.json({ error: "Choisis un aéroport et accepte les conditions." }, { status: 400 })
    );
  }

  const airport = parsed.data.home_airport.toUpperCase();
  const email = state.email;

  // Garde-fou : si une ligne existe déjà pour cet email (course), on ne duplique pas.
  const existing = await findOne("subscribers", (s) => s.email.toLowerCase() === email);
  if (!existing) {
    await insert("subscribers", {
      email,
      tier: "free",
      home_airports: [airport],
      unsubscribe_token: randomUUID(),
      consent_at: new Date().toISOString(),
      unsubscribed_at: null,
      referrer_id: null,
    });
    try {
      const sub = await findOne("subscribers", (s) => s.email.toLowerCase() === email);
      if (sub) {
        await sendEmail(welcomeEmail(email, unsubscribeUrl(email, sub.unsubscribe_token)));
      }
    } catch (err) {
      console.error("[mobile finalize] envoi bienvenue échoué:", err);
    }
  }

  return withCors(NextResponse.json({ ok: true }));
}
