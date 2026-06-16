import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { stop } from "@/lib/scanner-process";

export const runtime = "nodejs";

export async function POST() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const result = stop();
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
