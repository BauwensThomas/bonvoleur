import { NextResponse } from "next/server";
import { getAll, getById, remove } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { accountDeletedEmail } from "@/lib/email-templates";
import { deleteStripeCustomer } from "@/lib/stripe";
import { deleteAuthUserByEmail } from "@/lib/supabase/admin";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("subscribers");
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(rows);
}

export async function DELETE(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  // Supprime d'abord le client Stripe (annule ses abonnements -> plus de débit),
  // puis la ligne en base. On ne bloque pas la suppression si Stripe échoue.
  const sub = await getById("subscribers", id);
  if (sub?.stripe_customer_id) {
    try {
      await deleteStripeCustomer(sub.stripe_customer_id);
    } catch (err) {
      console.error("[admin subscribers] suppression Stripe échouée:", err);
    }
  }
  // Erasure complète : on supprime aussi le compte d'authentification (auth.users).
  if (sub?.email) {
    try {
      await deleteAuthUserByEmail(sub.email);
    } catch (err) {
      console.error("[admin subscribers] suppression compte auth échouée:", err);
    }
    try {
      await sendEmail(accountDeletedEmail(sub.email));
    } catch (err) {
      console.error("[admin subscribers] email confirmation échoué:", err);
    }
  }

  const ok = await remove("subscribers", id);
  return NextResponse.json({ ok });
}
