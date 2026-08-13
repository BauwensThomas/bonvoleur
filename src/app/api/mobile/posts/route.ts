import { NextResponse } from "next/server";
import { getAll } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const revalidate = 60;

// Liste des articles publies (app mobile) - equivalent de /blog sur le site
// web. Public : contenu deja indexable, pas d'auth necessaire.
export async function GET() {
  const posts = (await getAll("posts"))
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at))
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      cover_image: p.cover_image,
      published_at: p.published_at,
      created_at: p.created_at,
    }));

  return withCors(NextResponse.json({ posts }));
}
