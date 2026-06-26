import { NextResponse } from "next/server";
import { runDealsAlert } from "@/lib/deals-alert";

// Alerte stock quotidienne (vers contact@bonvoleur.com) si trop peu de bons
// plans visibles. Planifiée dans vercel.json. Protégée par CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const result = await runDealsAlert();
  return NextResponse.json({ ok: true, ...result });
}
