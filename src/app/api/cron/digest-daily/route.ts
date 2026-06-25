import { NextResponse } from "next/server";
import { sendScheduledDigest } from "@/lib/deal-send";

// Envoi séquentiel à tous les abonnés -> peut s'allonger : budget max Hobby.
export const maxDuration = 300;

// Digest PREMIUM : tous les jours, les deals des dernières 24h.
// Planifié dans vercel.json. Protégé par CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  // 1 email/jour max, uniquement de vrais bons plans, pour les abonnés
  // dont la fréquence choisie est "daily" (premium par défaut).
  const result = await sendScheduledDigest({
    tier: null,
    frequency: "daily",
    sinceDays: 1,
    periodDays: 1,
    hotOnly: true,
  });
  return NextResponse.json({ ok: true, frequency: "daily", ...result });
}
