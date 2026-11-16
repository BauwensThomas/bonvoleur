import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPostsCached, findPostCached } from "@/lib/posts-cache";
import { site } from "@/lib/site";
import { getAdsEnabled } from "@/lib/settings";
import ArticleView from "@/components/ArticleView";

export const revalidate = 60;

type Params = { slug: string };

// Temps de lecture estimé (~200 mots/minute).
export async function generateStaticParams() {
  // Au build : si la DB n'est pas joignable (tables Supabase pas encore créées),
  // on ne génère aucune page statique plutôt que de planter le build.
  try {
    const posts = await getAllPostsCached();
    return posts
      .filter((p) => p.status === "published")
      .map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPostCached((p) => p.slug === slug);
  if (!post) return { title: "Article introuvable" };
  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt,
    alternates: { canonical: `https://www.bonvoleur.com/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt,
      locale: "fr_BE",
      siteName: site.name,
      url: `${site.canonicalBase}/blog/${slug}`,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      images: [post.cover_image || `${site.canonicalBase}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt,
      images: [post.cover_image || `${site.canonicalBase}/opengraph-image`],
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [post, adsEnabled] = await Promise.all([
    findPostCached((p) => p.slug === slug),
    getAdsEnabled(),
  ]);
  if (!post || post.status !== "published") notFound();
  return <ArticleView post={post} slug={slug} adsEnabled={adsEnabled} />;
}
