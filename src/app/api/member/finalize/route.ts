import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getMemberState } from "@/lib/member-auth";
import { findOne, insert } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";

// Finalise l'inscription d'un utilisateur AUTHENTIFIÉ (Google ou magic link) qui
// n'est pas encore abonné : on demande son aéroport + consentement, puis on crée
// l'abonné. L'email étant déjà vérifié par le fournisseur, pas de double opt-in
// (consent_at daté immédiatement).
export async function POST(req: Request) {
  const state = await getMemberState();
  const origin = new URL(req.url).origin;

  // Déjà membre -> rien à faire. Pas connecté -> retour à /compte (connexion).
  if (state.status === "member") {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }
  if (state.status !== "no-account") {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }

  const form = await req.formData();
  const airport = String(form.get("home_airport") ?? "").toUpperCase();
  const consent = form.get("consent") === "on";

  if (!consent || !airport) {
    return NextResponse.redirect(`${origin}/compte/finaliser?error=1`, {
      status: 303,
    });
  }

  // Garde-fou : si une ligne existe déjà pour cet email (course), on ne duplique pas.
  const existing = await findOne(
    "subscribers",
    (s) => s.email.toLowerCase() === state.email
  );
  if (!existing) {
    await insert("subscribers", {
      email: state.email,
      tier: "free",
      home_airports: [airport],
      unsubscribe_token: randomUUID(),
      consent_at: new Date().toISOString(), // email déjà vérifié -> actif direct
      unsubscribed_at: null,
      referrer_id: null,
    });
    try {
      const sub = await findOne(
        "subscribers",
        (s) => s.email.toLowerCase() === state.email
      );
      if (sub) {
        await sendEmail(
          welcomeEmail(state.email, unsubscribeUrl(state.email, sub.unsubscribe_token))
        );
      }
    } catch (err) {
      console.error("[finalize] envoi bienvenue échoué:", err);
    }
  }

  return NextResponse.redirect(`${origin}/compte`, { status: 303 });
}
