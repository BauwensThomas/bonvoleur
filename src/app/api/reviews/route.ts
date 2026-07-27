import { NextResponse } from "next/server";
import { findOne, insert, update } from "@/lib/db";

// Soumission publique d'un avis (formulaire /avis, après clic sur une étoile
// dans l'email). Jeton = unsubscribe_token de l'abonné : identifie qui note
// sans authentification. Un avis par abonné (upsert si déjà noté).
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const token = typeof b.token === "string" ? b.token : "";
  const rating = Number(b.rating);
  // Seul le prénom est affiché publiquement : si quelqu'un tape "Julie Dupont"
  // malgré le placeholder, on ne garde que le premier mot.
  const name = typeof b.name === "string" ? b.name.trim().split(/\s+/)[0]?.slice(0, 40) ?? "" : "";
  const comment =
    typeof b.comment === "string" && b.comment.trim()
      ? b.comment.trim().slice(0, 150)
      : null;

  if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Note invalide." }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });

  const sub = await findOne("subscribers", (s) => s.unsubscribe_token === token);
  if (!sub) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });

  const existing = await findOne("reviews", (r) => r.subscriber_id === sub.id);
  if (existing) {
    await update("reviews", existing.id, {
      rating,
      name,
      comment,
      status: "pending",
    });
  } else {
    await insert("reviews", {
      subscriber_id: sub.id,
      rating,
      name,
      comment,
      status: "pending",
    });
  }

  return NextResponse.json({ ok: true });
}
