import { NextResponse } from "next/server";
import { getMemberState } from "@/lib/member-auth";
import { remove } from "@/lib/db";
import { deleteStripeCustomer } from "@/lib/stripe";
import { deleteAuthUserByEmail } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

// Suppression DÉFINITIVE de SON PROPRE compte (action délibérée, connecté).
// Efface : abonnement Stripe (client supprimé -> plus de débit), ligne en base,
// et compte d'authentification. Puis déconnexion.
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const state = await getMemberState();
  if (state.status !== "member") {
    return NextResponse.redirect(`${origin}/compte`, { status: 303 });
  }

  if (state.subscriber.stripe_customer_id) {
    try {
      await deleteStripeCustomer(state.subscriber.stripe_customer_id);
    } catch (err) {
      console.error("[member delete] Stripe échoué:", err);
    }
  }
  await remove("subscribers", state.subscriber.id);
  // Déconnexion (efface les cookies) puis suppression du compte auth.
  try {
    const sb = await createSupabaseServer();
    await sb.auth.signOut();
  } catch {
    /* session déjà invalide */
  }
  try {
    await deleteAuthUserByEmail(state.email);
  } catch (err) {
    console.error("[member delete] auth échoué:", err);
  }

  return NextResponse.redirect(`${origin}/?compte_supprime=1`, { status: 303 });
}
