import { NextResponse } from "next/server";
import { runContentPublisher } from "@/lib/content";

// Endpoint cron : génère un article de blog en brouillon.
// Planifié toutes les 2 jours à 19h (voir vercel.json).
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
