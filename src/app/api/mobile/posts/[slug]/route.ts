import { NextResponse } from "next/server";
import { getAllPostsCached, findPostCached } from "@/lib/posts-cache";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";
import { mobileImageUrl } from "@/lib/mobile-image";

export const OPTIONS = corsPreflight;

// PAS de dynamic="force-static" ici : cette route lit params.slug (segment
// dynamique par requete) - force-static sans generateStaticParams fait
// planter la route en production ("Dynamic server usage"), meme bug trouve
// et corrige le 2026-08-15 sur destinations/[slug]/route.ts, casse ici
// depuis l'ajout initial de ce cache (b50e5de) sans jamais avoir ete
// remarque avant (regression jamais testee de bout en bout cote app).

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
  trackMobileRequest("/api/mobile/posts/[slug]");
  const { slug } = await params;
  const post = await findPostCached((p) => p.slug === slug);
  if (!post || post.status !== "published") {
    return withCors(NextResponse.json({ error: "Article introuvable" }, { status: 404 }));
  }

  const allPosts = (await getAllPostsCached())
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
      cover_image: mobileImageUrl(p.cover_image, 384),
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
      cover_image: mobileImageUrl(post.cover_image, 1080),
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
