// Invalidation ciblée du cache des articles de blog - à appeler depuis
// CHAQUE endroit qui écrit dans `posts` (création, édition, publication),
// même principe que revalidate-destinations.ts. Voir mémoire
// project_conventions_techniques (2026-08-15, suite egress Supabase).
import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

// `slug` optionnel : si connu (un seul article touché), on cible sa page
// précisément en plus du listing - sinon (rare) on revalide tout le
// sous-arbre `/blog/*` d'un coup.
export function revalidatePosts(slug?: string): void {
  // Invalide le cache DONNÉE (getAllPostsCached(), voir posts-cache.ts) -
  // couvre tous les appelants (pages ET routes API mobile) d'un seul coup.
  // Le 2e argument (profil) est requis par la signature de cette version de
  // Next.js - "max" n'affecte pas l'invalidation elle-même, qui reste immédiate.
  revalidateTag("posts", "max");
  revalidatePath("/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  } else {
    revalidatePath("/blog/[slug]", "page");
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/api/mobile/posts");
  if (slug) revalidatePath(`/api/mobile/posts/${slug}`);
}
