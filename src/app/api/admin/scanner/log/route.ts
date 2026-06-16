import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRunLog } from "@/lib/github-actions";

// Renvoie le log complet d'un run du scanner. ?runId=<id>
export async function GET(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const runId = new URL(req.url).searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ ok: false, error: "runId requis" }, { status: 400 });
  }
  const result = await getRunLog(runId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
