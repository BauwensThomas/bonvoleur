import { NextResponse } from "next/server";
import { findOne, update } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { unsubscribeEmail } from "@/lib/email-templates";

// Désinscription EMAIL (soft), depuis le lien présent dans les emails.
// Toujours par POST (les scanners d'emails préchargent les liens) + jeton vérifié.
// Arrête les emails (unsubscribed_at) et GARDE le compte + le premium.
// La suppression TOTALE du compte est une action séparée et délibérée, faite en
// étant connecté (/compte -> préférences -> Supprimer mon compte).
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("token") ?? "");

  const sub = await findOne("subscribers", (s) => s.email === email);
  if (!sub || !sub.unsubscribe_token || sub.unsubscribe_token !== token) {
    return NextResponse.redirect(`${origin}/desinscription?invalid=1`, {
      status: 303,
    });
  }

  if (!sub.unsubscribed_at) {
    await update("subscribers", sub.id, {
      unsubscribed_at: new Date().toISOString(),
    });
  }
  try {
    await sendEmail(unsubscribeEmail(email));
  } catch (err) {
    console.error("[unsubscribe] envoi email échoué:", err);
  }

  return NextResponse.redirect(`${origin}/desinscription?done=1`, {
    status: 303,
  });
}
