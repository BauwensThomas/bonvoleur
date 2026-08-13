import { NextResponse } from "next/server";
import { getAll, update } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { destinationSlug } from "@/lib/routes";
import { revalidateDestinations } from "@/lib/revalidate-destinations";

// Met à jour la photo d'une destination : applique image_url à toutes les
// routes (origine-destination) de cette ville.
export async function PUT(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const destIata = String(body.destination_iata ?? "").toUpperCase();
  const imageUrl = body.image_url ? String(body.image_url) : null;
  const imageCredit = body.image_credit ? String(body.image_credit) : null;
  if (!destIata) {
    return NextResponse.json(
      { error: "destination_iata requis." },
      { status: 400 }
    );
  }

  const rows = (await getAll("routes")).filter(
    (r) => r.destination_iata === destIata
  );
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Aucune route en base pour cette destination." },
      { status: 404 }
    );
  }
  const now = new Date().toISOString();
  for (const r of rows) {
    await update("routes", r.id, { image_url: imageUrl, image_credit: imageCredit, updated_at: now });
  }
  revalidateDestinations(destinationSlug(rows[0].destination_city));
  return NextResponse.json({ ok: true, updated: rows.length });
}
