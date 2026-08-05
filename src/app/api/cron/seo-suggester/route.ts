import { NextResponse } from "next/server";
import { runSeoSuggester } from "@/lib/seo-suggest";

// Génération hebdomadaire de propositions SEO (titre/meta/liens/contenu) à
// partir des opportunités détectées. Ne publie/applique jamais rien - dépose
// en `pending` dans seo_suggestions, pour validation humaine (à venir :
// /admin/seo-suggestions). Planifié dans vercel.json. Protégé par CRON_SECRET.
export const maxDuration = 120;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const run = await runSeoSuggester("cron");
  return NextResponse.json({ ok: run.status !== "error", run });
}
