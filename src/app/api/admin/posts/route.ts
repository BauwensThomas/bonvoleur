import { NextResponse } from "next/server";
import { getAll, insert, update, remove, findOne } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.title) {
    return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  }
  let slug = b.slug ? slugify(b.slug) : slugify(b.title);
  const clash = await findOne("posts", (p) => p.slug === slug);
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const now = new Date().toISOString();
  const status = b.status === "published" ? "published" : "draft";
  const row = await insert("posts", {
    slug,
    title: b.title,
    excerpt: b.excerpt ?? "",
    content: b.content ?? "",
    faq: Array.isArray(b.faq) ? b.faq : [],
    cover_image: b.cover_image ?? null,
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
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const { id, ...patch } = b;
  patch.updated_at = new Date().toISOString();
  if (patch.slug) patch.slug = slugify(patch.slug);
  if (patch.status === "published" && !patch.published_at) {
    patch.published_at = new Date().toISOString();
  }
  const row = await update("posts", id, patch);
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(row);
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
