import { NextResponse } from "next/server";
import { runContentPublisher } from "@/lib/content";

// Génération d'article = plusieurs appels IA (jusqu'à ~16k tokens + boucle
// anti-doublon + image) -> long. On donne le budget max du plan Hobby (300 s).
export const maxDuration = 300;

// Endpoint cron : génère et publie un article de blog.
// Planifié tous les 3 jours à 19h (voir vercel.json).
// Protégé par CRON_SECRET : Vercel Cron envoie l'en-tête Authorization.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const run = await runContentPublisher("cron");
  return NextResponse.json({ ok: run.status !== "error", run });
}
