import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncDealsFromRemote } from "@/lib/deal-sync";

// Declenche le "pull" des deals depuis la source distante (DEALS_SOURCE_URL).
// Utilisable depuis l'admin. Le scanner tourne ailleurs et publie le JSON ;
// cette route va le chercher et l'integre dans la base locale.
export async function POST() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  try {
    const result = await syncDealsFromRemote();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Echec de la synchro." },
      { status: 500 },
    );
  }
}
