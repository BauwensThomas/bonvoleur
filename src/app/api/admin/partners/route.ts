import { NextResponse } from "next/server";
import { getAll, insert, update, remove } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidateTag } from "next/cache";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("partners");
  rows.sort((a, b) => a.position - b.position);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.name || !b.url) {
    return NextResponse.json(
      { error: "Nom et URL requis." },
      { status: 400 }
    );
  }
  const existing = await getAll("partners");
  const maxPos = existing.reduce((m, p) => Math.max(m, p.position), 0);
  const now = new Date().toISOString();
  const row = await insert("partners", {
    name: b.name,
    logo: b.logo ?? null,
    url: b.url,
    affiliate_url: b.affiliate_url ?? b.url,
    category: b.category ?? "Autre",
    description: b.description ?? "",
    is_active: b.is_active ?? true,
    position: typeof b.position === "number" ? b.position : maxPos + 1,
    updated_at: now,
  });
  revalidateTag("partners-public", "max");
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const { id, ...patch } = b;
  patch.updated_at = new Date().toISOString();
  const row = await update("partners", id, patch);
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  revalidateTag("partners-public", "max");
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const ok = await remove("partners", id);
  if (ok) revalidateTag("partners-public", "max");
  return NextResponse.json({ ok });
}
