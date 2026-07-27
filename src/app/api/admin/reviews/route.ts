import { NextResponse } from "next/server";
import { getAll, update, remove } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("reviews");
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  if (b.status && !["pending", "approved", "rejected"].includes(b.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const { id, ...patch } = b;
  const row = await update("reviews", id, patch);
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const ok = await remove("reviews", id);
  return NextResponse.json({ ok });
}
