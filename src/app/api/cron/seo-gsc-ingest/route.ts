import { NextResponse } from "next/server";
import { ingestGscDaily } from "@/lib/seo-gsc-ingest";

// Ingestion quotidienne des données Search Console. Planifiée dans
// vercel.json. Protégée par CRON_SECRET. Voir SEO-AUTOMATION.md.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const result = await ingestGscDaily();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
