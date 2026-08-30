import { NextResponse } from "next/server";
import { findOne, insert } from "@/lib/db";
import { getPublicReviews } from "@/lib/reviews-cache";
import { sendEmail } from "@/lib/email";
import { newReviewAlertEmail } from "@/lib/email-templates";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";
import { revalidateTag } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";

export const OPTIONS = corsPreflight;

// Avis approuves (app mobile) - equivalent mobile de "Ce qu'ils en pensent"
// sur la homepage, mais la LISTE COMPLETE (pas juste les 4 derniers comme
// getReviewStats().latest). Public, pas d'auth necessaire pour lire.
// Si l'appelant est connecte (jeton bearer), on ajoute "myReview" (son
// propre avis, quel que soit son statut) pour que l'app sache si le
// membre a deja laisse un avis et doive proposer le formulaire ou non.
export async function GET(req: Request) {
  const limited = rateLimit(req, "/api/mobile/reviews");
  if (limited) return withCors(limited);
  trackMobileRequest("/api/mobile/reviews");
  const all = await getPublicReviews();
  const approved = all
    .filter((r) => r.status === "approved")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({ id: r.id, rating: r.rating, name: r.name, comment: r.comment, created_at: r.created_at }));

  const average = approved.length > 0 ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length : 0;

  const state = await getMobileMemberState(req);
  let myReview = null;
  if (state.status === "member") {
    const mine = all.find((r) => r.subscriber_id === state.subscriber.id) ?? null;
    myReview = mine
      ? {
          id: mine.id,
          rating: mine.rating,
          name: mine.name,
          comment: mine.comment,
          status: mine.status,
          created_at: mine.created_at,
        }
      : null;
  }

  return withCors(NextResponse.json({ reviews: approved, average, total: approved.length, myReview }));
}

// Soumission d'un avis depuis l'app (membre connecte) - equivalent mobile de
// POST /api/reviews, mais authentifie par session plutot que par le jeton
// unsubscribe_token des emails. Contrairement au site (qui autorise a
// remplacer son avis existant), l'app REFUSE si un avis existe deja pour cet
// abonne (demande explicite : un seul avis par membre depuis l'app).
export async function POST(req: Request) {
  const limited = rateLimit(req, "/api/mobile/reviews:write", 20);
  if (limited) return withCors(limited);
  trackMobileRequest("/api/mobile/reviews");
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  const existing = await findOne("reviews", (r) => r.subscriber_id === state.subscriber.id);
  if (existing) {
    return withCors(NextResponse.json({ error: "Tu as déjà laissé un avis." }, { status: 409 }));
  }

  const body = await req.json().catch(() => null);
  if (!body) return withCors(NextResponse.json({ error: "Requête invalide." }, { status: 400 }));

  const rating = Number(body.rating);
  const name =
    typeof body.name === "string" ? body.name.trim().split(/\s+/)[0]?.slice(0, 40) ?? "" : "";
  const comment =
    typeof body.comment === "string" && body.comment.trim() ? body.comment.trim().slice(0, 150) : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return withCors(NextResponse.json({ error: "Note invalide." }, { status: 400 }));
  }
  if (!name) return withCors(NextResponse.json({ error: "Le nom est requis." }, { status: 400 }));

  await insert("reviews", {
    subscriber_id: state.subscriber.id,
    rating,
    name,
    comment,
    status: "pending",
  });
  revalidateTag("reviews-public", "max");

  try {
    await sendEmail(newReviewAlertEmail(rating, name, comment));
  } catch (e) {
    console.error("[mobile reviews] notification admin échouée:", e);
  }

  return withCors(NextResponse.json({ ok: true }));
}
