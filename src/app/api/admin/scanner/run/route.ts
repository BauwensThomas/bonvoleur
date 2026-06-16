import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { triggerScannerRun } from "@/lib/github-actions";

// Déclenche manuellement le scanner sur GitHub Actions (workflow_dispatch).
export async function POST() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const result = await triggerScannerRun();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
