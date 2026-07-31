// Avis clients : notation par étoiles envoyée dans les emails (premium +
// freemium), soumission via /avis (nom obligatoire + commentaire optionnel),
// validation manuelle par l'admin avant affichage public.
import { site } from "./site";
import { getAll } from "./db";
import type { Review } from "./types";

// Lien vers la page de notation, note pré-sélectionnée. Identifie l'abonné
// via sa session (connexion requise sur /avis), pas via un jeton dans l'URL -
// un simple clic depuis l'email amène à se connecter si besoin.
export function reviewUrl(rating: number): string {
  return `${site.url}/avis?note=${rating}`;
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
