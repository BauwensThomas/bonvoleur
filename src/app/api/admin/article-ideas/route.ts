import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAll, insert, update } from "@/lib/db";
import { rehostImage } from "@/lib/rehost";
import type { ArticleIdeaStatus } from "@/lib/types";

const STATUSES: ArticleIdeaStatus[] = ["pending", "processing", "done", "skipped", "error"];

function cleanUrl(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;
  const rows = await getAll("article_ideas");
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;
  const b = await req.json().catch(() => null);
  const instructions = String(b?.instructions ?? "").trim();
  if (instructions.length < 10) {
    return NextResponse.json({ error: "La consigne est trop courte." }, { status: 400 });
  }
  const rawSources: string[] = Array.isArray(b?.source_urls)
    ? b.source_urls.map(String)
    : String(b?.source_urls ?? "").split(/\s+/);
  const sources = rawSources.map(cleanUrl).filter((u): u is string => Boolean(u));

  // La photo est telechargee et hebergee tout de suite (meme espace que les
  // autres photos du site) : l'article ne depend jamais du site d'origine.
  let photoUrl = cleanUrl(b?.photo_url);
  if (photoUrl) {
    const hosted = await rehostImage(photoUrl, "articles", `idee-${Date.now().toString(36)}`);
    if (!hosted || !hosted.includes("/storage/v1/object/public/photos/")) {
      return NextResponse.json(
        { error: "La photo n'a pas pu être téléchargée et hébergée. Vérifie le lien." },
        { status: 400 }
      );
    }
    photoUrl = hosted;
  }

  const row = await insert("article_ideas", {
    instructions,
    source_urls: sources,
    link_url: cleanUrl(b?.link_url),
    link_label: String(b?.link_label ?? "").trim() || null,
    photo_url: photoUrl,
    photo_credit: String(b?.photo_credit ?? "").trim() || null,
    review_first: b?.review_first !== false,
    status: "pending",
    post_id: null,
    post_slug: null,
    note: null,
  });
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;
  const b = await req.json().catch(() => null);
  const status = b?.status as ArticleIdeaStatus;
  if (!b?.id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "id et status valides requis." }, { status: 400 });
  }
  const row = await update("article_ideas", String(b.id), { status, note: null });
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(row);
}
