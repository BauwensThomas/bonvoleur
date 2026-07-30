import { NextResponse } from "next/server";
import { getAll, insert, update, remove, findOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rehostImage } from "@/lib/rehost";

// rehostImage fait un fetch + sharp + upload Supabase -> peut dépasser 10s
export const maxDuration = 60;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("posts");
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.title) {
    return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  }
  let slug = b.slug ? slugify(b.slug) : slugify(b.title);
  const clash = await findOne("posts", (p) => p.slug === slug);
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  // Ré-héberge l'image sur Supabase si c'est une URL externe (Unsplash, etc.)
  // - même garde-fou qu'en PUT, mais ici DÈS LA CRÉATION : un post créé déjà
  // "published" (ex. par l'agent content-publisher) ne passe jamais par PUT,
  // donc sans ça son image reste un lien Unsplash brut indéfiniment.
  let coverImage = b.cover_image ?? null;
  if (coverImage && !String(coverImage).includes("/storage/v1/object/public/photos/")) {
    try {
      coverImage = (await rehostImage(coverImage, "articles", slug)) ?? coverImage;
    } catch (e) {
      console.error("[admin/posts] rehostImage échoué, URL conservée :", e);
    }
  }

  const now = new Date().toISOString();
  const status = b.status === "published" ? "published" : "draft";
  const row = await insert("posts", {
    slug,
    title: b.title,
    excerpt: b.excerpt ?? "",
    content: b.content ?? "",
    faq: Array.isArray(b.faq) ? b.faq : [],
    cover_image: coverImage,
    cover_image_credit: b.cover_image_credit ?? null,
    meta_title: b.meta_title ?? null,
    meta_description: b.meta_description ?? null,
    status,
    author: b.author ?? "BonVoleur",
    published_at: status === "published" ? now : null,
    updated_at: now,
  });
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: Request) {
  try {
    const unauth = await requireAdmin(req);
    if (unauth) return unauth;
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
    const { id, ...patch } = b;
    patch.updated_at = new Date().toISOString();
    if (patch.slug) patch.slug = slugify(patch.slug);
    if (patch.status === "published" && !patch.published_at) {
      patch.published_at = new Date().toISOString();
    }
    // Ré-héberge l'image sur Supabase si c'est une URL externe (Unsplash, etc.)
    if (patch.cover_image && !String(patch.cover_image).includes("/storage/v1/object/public/photos/")) {
      try {
        const existing = await findOne("posts", (p) => p.id === id);
        const name = patch.slug ?? existing?.slug ?? id;
        patch.cover_image = (await rehostImage(patch.cover_image, "articles", name)) ?? patch.cover_image;
      } catch (e) {
        console.error("[admin/posts] rehostImage échoué, URL conservée :", e);
      }
    }
    const row = await update("posts", id, patch);
    if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/posts PUT] Erreur non gérée :", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const ok = await remove("posts", id);
  return NextResponse.json({ ok });
}
