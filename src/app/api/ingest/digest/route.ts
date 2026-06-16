import { NextResponse } from "next/server";
import { sendDigest } from "@/lib/deal-send";

// Envoie un digest : un seul email par abonné regroupant les deals (parmi
// dealIds) qui correspondent à ses aéroports. Appelé par le scanner après
// avoir poussé un lot de deals (autosend=false). Protégé par INGEST_SECRET.
export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "INGEST_SECRET absent." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { dealIds } = await req.json().catch(() => ({ dealIds: [] }));
  if (!Array.isArray(dealIds) || dealIds.length === 0) {
    return NextResponse.json({ ok: true, emails: 0 });
  }

  const result = await sendDigest(dealIds);
  return NextResponse.json({ ok: true, ...result });
}
