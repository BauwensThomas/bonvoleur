import { NextResponse } from "next/server";
import { findOne, insert } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { newReviewAlertEmail } from "@/lib/email-templates";
import { getMemberState } from "@/lib/member-auth";

// Soumission d'un avis (formulaire /avis) - authentifié par session (cookie),
// comme le reste de l'espace membre. Un seul avis par abonné, jamais
// remplaçable depuis ce formulaire (contrairement à l'ancien comportement par
// jeton email) - une fois posté, il faut contacter le support pour modifier.
export async function POST(req: Request) {
  const state = await getMemberState();
  if (state.status !== "member") {
    return NextResponse.json({ error: "Connecte-toi pour laisser un avis." }, { status: 401 });
  }

  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const rating = Number(b.rating);
  // Seul le prénom est affiché publiquement : si quelqu'un tape "Julie Dupont"
  // malgré le placeholder, on ne garde que le premier mot.
  const name = typeof b.name === "string" ? b.name.trim().split(/\s+/)[0]?.slice(0, 40) ?? "" : "";
  const comment =
    typeof b.comment === "string" && b.comment.trim()
      ? b.comment.trim().slice(0, 150)
      : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Note invalide." }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });

  const existing = await findOne("reviews", (r) => r.subscriber_id === state.subscriber.id);
  if (existing) {
    return NextResponse.json({ error: "Tu as déjà laissé un avis." }, { status: 409 });
  }

  await insert("reviews", {
    subscriber_id: state.subscriber.id,
    rating,
    name,
    comment,
    status: "pending",
  });

  // Notifie l'admin par email - ne doit jamais faire échouer la soumission.
  try {
    await sendEmail(newReviewAlertEmail(rating, name, comment));
  } catch (e) {
    console.error("[reviews] notification admin échouée:", e);
  }

  return NextResponse.json({ ok: true });
}
