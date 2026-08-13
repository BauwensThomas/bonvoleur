// Invalidation ciblée du cache des pages/routes destinations - à appeler
// depuis CHAQUE endroit qui écrit dans `routes` (image, photos, intro...),
// pour que le cache long (revalidate) ne rafraîchisse que quand quelque
// chose a réellement changé, pas sur un minuteur fixe qui régénère pour
// rien si aucune destination n'a bougé. Voir memoire
// project_conventions_techniques (2026-08-13, egress Supabase).
import "server-only";

import { revalidatePath } from "next/cache";

// `slug` optionnel : si connu (une seule destination touchée), on cible sa
// fiche précisément en plus du listing - sinon (ex. génération en masse) on
// revalide tout le sous-arbre `/vols-pas-chers/*` d'un coup.
export function revalidateDestinations(slug?: string): void {
  revalidatePath("/vols-pas-chers");
  if (slug) {
    revalidatePath(`/vols-pas-chers/${slug}`);
  } else {
    revalidatePath("/vols-pas-chers/[route]", "page");
  }
  revalidatePath("/api/mobile/destinations");
  revalidatePath("/api/mobile/destinations/popular");
  revalidatePath("/api/mobile/stats");
  if (slug) revalidatePath(`/api/mobile/destinations/${slug}`);
}
