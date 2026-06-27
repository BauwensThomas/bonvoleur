import { NextResponse } from "next/server";
import { runSocialClipper } from "@/lib/social";

// Rejoue l'envoi du webhook Make pour le dernier article publié (test / relance).
// Protégé par CRON_SECRET. La publication d'un nouvel article le déclenche déjà
// automatiquement (voir runContentPublisher).
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  // ?slug=... pour (re)poster un article précis (backfill), sinon le dernier.
  const slug = new URL(req.url).searchParams.get("slug") ?? undefined;
  const result = await runSocialClipper(slug);
  return NextResponse.json(result);
}
