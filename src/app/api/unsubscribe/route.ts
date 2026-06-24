import { NextResponse } from "next/server";
import { findOne, remove } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { unsubscribeEmail } from "@/lib/email-templates";
import { deleteStripeCustomer } from "@/lib/stripe";
import { deleteAuthUserByEmail } from "@/lib/supabase/admin";

// Suppression DÉFINITIVE du compte (via confirmation POST, jamais sur un GET :
// les scanners d'emails préchargent les liens). Vérifie le jeton, puis efface
// TOUT : abonnement Stripe (client supprimé), compte d'authentification, et la
// ligne en base.
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

  // 1) Stripe : supprime le client -> annule ses abonnements (plus de débit).
  if (sub.stripe_customer_id) {
    try {
      await deleteStripeCustomer(sub.stripe_customer_id);
    } catch (err) {
      console.error("[unsubscribe] suppression Stripe échouée:", err);
    }
  }
  // 2) Authentification : supprime le compte auth.users.
  try {
    await deleteAuthUserByEmail(sub.email);
  } catch (err) {
    console.error("[unsubscribe] suppression compte auth échouée:", err);
  }
  // 3) Email de confirmation, puis suppression de la ligne en base.
  try {
    await sendEmail(unsubscribeEmail(email));
  } catch (err) {
    console.error("[unsubscribe] envoi email échoué:", err);
  }
  await remove("subscribers", sub.id);

  return NextResponse.redirect(`${origin}/desinscription?done=1`, {
    status: 303,
  });
}
