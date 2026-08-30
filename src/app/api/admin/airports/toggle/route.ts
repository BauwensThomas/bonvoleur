import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { notifyAirportDeactivated } from "@/lib/airport-deactivation";
import { revalidateTag } from "next/cache";

// Envoi email+push à tous les abonnés de l'aéroport désactivé peut prendre
// plus que le délai par défaut d'une route Next.js si l'aéroport est populaire.
export const maxDuration = 60;

export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const { iata, active } = await req.json() as { iata: string; active: boolean };
  if (!iata || typeof active !== "boolean") {
    return NextResponse.json({ error: "iata et active requis." }, { status: 400 });
  }

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await sb.from("airports").update({ active }).eq("iata", iata);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("airports-public", "max");

  // Désactivation : alerte immédiate (email + push) aux abonnés concernés.
  // Ne fait jamais échouer le toggle lui-même si l'envoi échoue.
  if (!active) {
    try {
      await notifyAirportDeactivated(iata);
    } catch (e) {
      console.error("[admin/airports/toggle] notification désactivation échouée:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
