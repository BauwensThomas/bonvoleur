import { NextResponse } from "next/server";
import { sendScheduledDigest } from "@/lib/deal-send";

// Envoi de masse (batch) -> budget max Hobby.
export const maxDuration = 300;

// Digest PREMIUM : 1 email/jour max, deals des dernières 24h.
// Déclenché par le scanner APRÈS chaque scan avec ?slot=K&scans=N : on n'envoie
// qu'au 1/N des premium de ce créneau -> charge étalée sur la journée, chaque
// premium reçu UNE fois/jour (à son scan). Sans ?slot (appel manuel) : tous.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(req.url);
  const slot = url.searchParams.has("slot")
    ? Number(url.searchParams.get("slot"))
    : undefined;
  const scansPerDay = Number(url.searchParams.get("scans") ?? "3");
  const result = await sendScheduledDigest({
    tier: null,
    frequency: "daily",
    sinceDays: 1,
    periodDays: 1,
    hotOnly: true,
    slot,
    scansPerDay,
  });
  return NextResponse.json({ ok: true, frequency: "daily", slot, ...result });
}
