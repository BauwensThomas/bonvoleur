import { NextResponse } from "next/server";
import { getAll, remove } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("subscribers");
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(rows);
}

export async function DELETE(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const ok = await remove("subscribers", id);
  return NextResponse.json({ ok });
}
