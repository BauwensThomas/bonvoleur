import { NextResponse } from "next/server";
import { runContentPublisher } from "@/lib/content";
import { countAgentRuns } from "@/lib/db";
import { dueBlogSlot } from "@/lib/blog-schedule";

// Génération d'article = plusieurs appels IA (jusqu'à ~16k tokens + boucle
// anti-doublon + image) -> long. On donne le budget max (300 s).
export const maxDuration = 300;

// Endpoint cron : génère et publie un article de blog.
// Planning (heure de Bruxelles) : lundi, mercredi, vendredi 18h ; dimanche 8h30.
// Vercel tourne en UTC : le cron est lancé toutes les 30 min autour de ces
// heures (vercel.json) et c'est CE code qui décide si un créneau est dû et pas
// déjà traité (un article réussi par créneau, 2 essais en erreur au maximum).
// Protégé par CRON_SECRET : Vercel Cron envoie l'en-tête Authorization.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const slot = dueBlogSlot();
  if (!slot) return NextResponse.json({ ok: true, skipped: "hors créneau" });

  const since = slot.toISOString();
  if ((await countAgentRuns("content-publisher", { status: "success", since })) > 0) {
    return NextResponse.json({ ok: true, skipped: "article déjà généré pour ce créneau" });
  }
  if ((await countAgentRuns("content-publisher", { status: "error", since })) >= 2) {
    return NextResponse.json({ ok: false, skipped: "2 échecs sur ce créneau, plus d'essai automatique" });
  }

  const run = await runContentPublisher("cron");
  return NextResponse.json({ ok: run.status !== "error", run });
}
