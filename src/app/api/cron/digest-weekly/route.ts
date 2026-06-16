import { NextResponse } from "next/server";
import { sendScheduledDigest } from "@/lib/deal-send";

// Digest GRATUIT : une fois par semaine, les deals des 7 derniers jours.
// Planifié dans vercel.json. Protégé par CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  // 1 vrai bon plan par semaine pour les abonnés dont la fréquence est "weekly"
  // (gratuits par défaut, plus les premium qui ont choisi l'hebdo).
  const result = await sendScheduledDigest({
    tier: null,
    frequency: "weekly",
    sinceDays: 7,
    periodDays: 7,
    hotOnly: true,
  });
  return NextResponse.json({ ok: true, frequency: "weekly", ...result });
}
