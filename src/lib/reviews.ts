// Avis clients : notation par étoiles envoyée dans les emails (premium +
// freemium), soumission via /avis (nom obligatoire + commentaire optionnel),
// validation manuelle par l'admin avant affichage public.
import { site } from "./site";
import { getAll } from "./db";
import type { Review } from "./types";

// Lien de notation en 1 clic depuis l'email, sécurisé par le jeton de
// l'abonné (même jeton que désinscription/tracking d'ouverture).
export function reviewUrl(token: string, rating: number): string {
  const t = encodeURIComponent(token);
  return `${site.url}/avis?token=${t}&note=${rating}`;
}

// Format FR : entier si rond (5 -> "5"), sinon 1 décimale avec virgule (4.5 -> "4,5").
export function formatRating(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(".", ",");
}

export interface ReviewStats {
  average: number; // 0 si aucun avis approuvé
  total: number; // avis approuvés uniquement
  latest: Review[]; // 4 derniers avis approuvés, plus récents d'abord
}

// Stats publiques (homepage) : uniquement les avis approuvés par l'admin.
export async function getReviewStats(): Promise<ReviewStats> {
  const all = await getAll("reviews");
  const approved = all
    .filter((r) => r.status === "approved")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const average =
    approved.length > 0
      ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length
      : 0;
  return { average, total: approved.length, latest: approved.slice(0, 4) };
}
