import type { MetadataRoute } from "next";
import { getAll } from "@/lib/db";
import { site } from "@/lib/site";
import { seoRoutes } from "@/lib/seo-routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/mentions-legales`, priority: 0.2 },
    { url: `${base}/confidentialite`, priority: 0.2 },
    { url: `${base}/conditions-generales`, priority: 0.2 },
    { url: `${base}/vols-pas-chers`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Pages SEO par route (vols pas chers {origine}-{destination}).
  const routePages: MetadataRoute.Sitemap = seoRoutes.map((r) => ({
    url: `${base}/vols-pas-chers/${r.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  let postPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAll("posts");
    postPages = posts
      .filter((p) => p.status === "published")
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
