import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runDealWriter } from "@/lib/deal-writer";
import { getById } from "@/lib/db";

// Génération/regénération manuelle de l'email d'un deal (bouton dans Deals).
export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const { dealId } = await req.json();
  if (!dealId) {
    return NextResponse.json({ error: "dealId requis." }, { status: 400 });
  }

  const run = await runDealWriter(dealId, "manuel");
  if (run.status === "error") {
    return NextResponse.json(
      { error: run.error ?? "Échec de la génération." },
      { status: 500 }
    );
  }
  const deal = await getById("deals", dealId);
  return NextResponse.json({ ok: true, email: deal?.email ?? null });
}
