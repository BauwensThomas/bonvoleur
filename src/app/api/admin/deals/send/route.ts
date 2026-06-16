import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendDealToSubscribers } from "@/lib/deal-send";

// Envoi manuel d'un deal aux abonnés ciblés (bouton dans Deals).
export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const { dealId } = await req.json();
  if (!dealId) {
    return NextResponse.json({ error: "dealId requis." }, { status: 400 });
  }

  try {
    const result = await sendDealToSubscribers(dealId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Échec de l'envoi." },
      { status: 400 }
    );
  }
}
