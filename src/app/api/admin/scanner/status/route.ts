import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getStatus } from "@/lib/scanner-process";

export const runtime = "nodejs";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  return NextResponse.json(getStatus());
}
