import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { findOne } from "@/lib/db";
import { makePreviewToken } from "@/lib/preview-token";
import { site } from "@/lib/site";

// Génère un lien d'aperçu privé (valable 7 jours) pour un article, à partager
// avec quelqu'un qui n'a pas accès à l'admin.
export async function GET(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const post = slug ? await findOne("posts", (p) => p.slug === slug) : null;
  if (!post) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  const url = `${site.canonicalBase}/apercu/${post.slug}?t=${makePreviewToken(post.slug)}`;
  return NextResponse.json({ url, days: 7 });
}
