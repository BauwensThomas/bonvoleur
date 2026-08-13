import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidateDestinations } from "@/lib/revalidate-destinations";

// Point d'entrée HTTP pour les scripts externes (ex. scripts/generate-routes.mjs,
// qui tourne hors du process Next.js et ne peut donc pas appeler
// revalidatePath() directement) - déclenche la même invalidation ciblée que
// les routes admin qui écrivent en interne. `slug` optionnel : une seule
// destination touchée -> ciblée en plus du listing ; absent -> tout le
// sous-arbre /vols-pas-chers/* (génération en masse).
export async function POST(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const b = await req.json().catch(() => ({}));
  const slug = b.slug ? String(b.slug) : undefined;
  revalidateDestinations(slug);
  return NextResponse.json({ ok: true, slug: slug ?? "all" });
}
