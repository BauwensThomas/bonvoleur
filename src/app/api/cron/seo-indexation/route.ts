import { NextResponse } from "next/server";
import { checkAllPagesIndexation } from "@/lib/seo-indexation";

// Vérifie le statut d'indexation Google de chaque page réelle du site
// (~145 pages, API URL Inspection, 1 appel par page avec une petite pause -
// prend une à deux minutes). Planifié dans vercel.json. Protégée par
// CRON_SECRET. Voir SEO-AUTOMATION.md.
export const maxDuration = 180;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  try {
    const result = await checkAllPagesIndexation();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
