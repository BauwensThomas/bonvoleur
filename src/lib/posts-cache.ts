// Cache egress Supabase (voir mémoire project_conventions_techniques,
// 2026-08-15) : getAll("posts") est appelé à ~15 endroits (fiches
// destination, homepage, /blog, sitemap, routes mobile...) sans AUCUN cache -
// les articles changent au mieux tous les 3 jours (cron content-publisher).
// Même principe que getRoutes()/getAllDealsPublic() (2026-08-13).
import "server-only";

import { unstable_cache } from "next/cache";
import { getAll } from "./db";
import type { Tables } from "./types";

// Long filet de sécurité (1h) : le vrai rafraîchissement vient de
// revalidatePosts() (revalidate-posts.ts) appelé à chaque écriture réelle
// dans `posts` (création, édition, publication).
const getCachedPosts = unstable_cache(() => getAll("posts"), ["posts-all"], {
  tags: ["posts"],
  revalidate: 3600,
});

export async function getAllPostsCached(): Promise<Tables["posts"][]> {
  return getCachedPosts();
}

export async function findPostCached(
  predicate: (p: Tables["posts"]) => boolean
): Promise<Tables["posts"] | null> {
  const rows = await getAllPostsCached();
  return rows.find(predicate) ?? null;
}
