import { NextResponse } from "next/server";
import { findOne, update, remove } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { unsubscribeEmail } from "@/lib/email-templates";
import { deleteStripeCustomer } from "@/lib/stripe";
import { deleteAuthUserByEmail } from "@/lib/supabase/admin";

// Deux actions, toujours par POST (jamais sur GET : les scanners d'emails
// préchargent les liens) et avec jeton vérifié :
//  - mode "soft"   : arrête les emails (unsubscribed_at), GARDE le compte et le
//    premium. C'est le cas par défaut quand on clique « se désinscrire ».
//  - mode "delete" : suppression DÉFINITIVE (Stripe + auth + base).
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("token") ?? "");
  const mode = form.get("mode") === "delete" ? "delete" : "soft";

  const sub = await findOne("subscribers", (s) => s.email === email);
  if (!sub || !sub.unsubscribe_token || sub.unsubscribe_token !== token) {
    return NextResponse.redirect(`${origin}/desinscription?invalid=1`, {
      status: 303,
    });
  }

  if (mode === "soft") {
    // Arrêt des emails uniquement. Compte et premium conservés.
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
    return NextResponse.redirect(`${origin}/desinscription?done=soft`, {
      status: 303,
    });
  }

  // mode "delete" : suppression complète.
  if (sub.stripe_customer_id) {
    try {
      await deleteStripeCustomer(sub.stripe_customer_id);
    } catch (err) {
      console.error("[unsubscribe] suppression Stripe échouée:", err);
    }
  }
  try {
    await deleteAuthUserByEmail(sub.email);
  } catch (err) {
    console.error("[unsubscribe] suppression compte auth échouée:", err);
  }
  try {
    await sendEmail(unsubscribeEmail(email));
  } catch (err) {
    console.error("[unsubscribe] envoi email échoué:", err);
  }
  await remove("subscribers", sub.id);

  return NextResponse.redirect(`${origin}/desinscription?done=delete`, {
    status: 303,
  });
}
