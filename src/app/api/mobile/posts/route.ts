import { NextResponse } from "next/server";
import { getAllPostsCached } from "@/lib/posts-cache";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";
import { mobileImageUrl } from "@/lib/mobile-image";
import { rateLimit } from "@/lib/rate-limit";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const dynamic = "force-dynamic";
export const revalidate = 60;

// Liste des articles publies (app mobile) - equivalent de /blog sur le site
// web. Public : contenu deja indexable, pas d'auth necessaire.
export async function GET(req: Request) {
  const limited = rateLimit(req, "/api/mobile/posts");
  if (limited) return withCors(limited);
  trackMobileRequest("/api/mobile/posts");
  const posts = (await getAllPostsCached())
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at))
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      cover_image: mobileImageUrl(p.cover_image, 640),
      published_at: p.published_at,
      created_at: p.created_at,
    }));

  return withCors(NextResponse.json({ posts }));
}
