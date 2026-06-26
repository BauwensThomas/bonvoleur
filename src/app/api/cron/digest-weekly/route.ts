import { NextResponse } from "next/server";
import { sendScheduledDigest } from "@/lib/deal-send";

// Envoi de masse (batch) -> budget max Hobby.
export const maxDuration = 300;

// Digest GRATUIT : 1 email/semaine, deals des 7 derniers jours.
// Déclenché par le scanner APRÈS chaque scan, tous les jours, avec ?slot=K&scans=N.
// On n'envoie qu'aux gratuits de CE créneau ET dont c'est le JOUR D'INSCRIPTION
// -> étalé sur 7 jours x N scans (21 créneaux), chaque gratuit reçu 1×/semaine.
// Sans ?slot (appel manuel) : tous les gratuits, sans filtre de jour.
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
    frequency: "weekly",
    sinceDays: 7,
    periodDays: 7,
    hotOnly: true,
    slot,
    scansPerDay,
    byInscriptionWeekday: true,
  });
  return NextResponse.json({ ok: true, frequency: "weekly", slot, ...result });
}
