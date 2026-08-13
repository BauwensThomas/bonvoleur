import { NextResponse } from "next/server";
import { findOne, getAll } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const dynamic = "force-static";
export const revalidate = 60;

// Temps de lecture estime (~200 mots/minute) - meme regle que
// src/app/blog/[slug]/page.tsx.
function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Article par slug (app mobile) - equivalent de /blog/[slug]. Public, pas
// d'auth. 404 si absent OU pas publie (jamais fuiter un brouillon par son
// slug), meme regle que le site. related : meme algorithme naif de
// correspondance par mots du titre (>4 lettres) que la page web - precalcule
// ici car le mobile n'a pas la liste complete des articles sous la main.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await findOne("posts", (p) => p.slug === slug);
  if (!post || post.status !== "published") {
    return withCors(NextResponse.json({ error: "Article introuvable" }, { status: 404 }));
  }

  const allPosts = (await getAll("posts"))
    .filter((p) => p.status === "published" && p.slug !== slug)
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));
  const titleWords = (post.title ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const related = allPosts
    .map((p) => ({
      post: p,
      score: titleWords.filter((w) => p.title?.toLowerCase().includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ post: p }) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      cover_image: p.cover_image,
      published_at: p.published_at,
      created_at: p.created_at,
    }));

  return withCors(
    NextResponse.json({
      slug: post.slug,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      author: post.author,
      cover_image: post.cover_image,
      cover_image_credit: post.cover_image_credit,
      published_at: post.published_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
      faq: post.faq,
      reading_minutes: readingMinutes(post.content),
      related,
    })
  );
}
