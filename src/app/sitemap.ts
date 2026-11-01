import type { MetadataRoute } from "next";
import { getAll } from "@/lib/db";
import { getAllPostsCached } from "@/lib/posts-cache";
import { site } from "@/lib/site";
import { MERGED_BLOG_SLUGS } from "@/lib/blog-redirects";
import { getDestinations, destinationSlug } from "@/lib/routes";

// Filet de securite : sans delai, le sitemap pre-rendu restait fige et omettait
// des articles publies (8 manquants constates le 2026-10-31).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.canonicalBase;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/mentions-legales`, priority: 0.2 },
    { url: `${base}/confidentialite`, priority: 0.2 },
    { url: `${base}/conditions-generales`, priority: 0.2 },
    { url: `${base}/vols-pas-chers`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Pages SEO par destination (vols pas chers vers {ville}).
  let routePages: MetadataRoute.Sitemap = [];
  try {
    const dests = await getDestinations();
    const allRoutes = await getAll("routes");
    const destUpdatedAt: Record<string, string> = {};
    for (const r of allRoutes) {
      const slug = destinationSlug(r.destination_city ?? "");
      const upd = r.updated_at ?? r.created_at;
      if (upd && (!destUpdatedAt[slug] || upd > destUpdatedAt[slug])) {
        destUpdatedAt[slug] = upd;
      }
    }
    routePages = dests.map((d) => ({
      url: `${base}/vols-pas-chers/${d.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
      lastModified: destUpdatedAt[d.slug],
    }));
  } catch {
    // DB indispo : on garde au moins les pages statiques.
  }

  let postPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAllPostsCached();
    postPages = posts
      .filter((p) => p.status === "published" && !MERGED_BLOG_SLUGS.includes(p.slug))
      .map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updated_at,
        changeFrequency: "monthly",
        priority: 0.6,
      }));
  } catch {
    // DB pas joignable au build : on publie au moins les pages statiques.
  }

  return [...staticPages, ...routePages, ...postPages];
}
