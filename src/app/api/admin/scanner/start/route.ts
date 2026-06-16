import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { start } from "@/lib/scanner-process";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const body = await req.json().catch(() => ({}));
  const result = start(String(body.source ?? "rss"));
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
