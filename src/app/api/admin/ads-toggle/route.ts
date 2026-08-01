import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";

export async function POST(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { enabled } = (await req.json()) as { enabled: boolean };
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled requis." }, { status: 400 });
  }

  await setSetting("ads_enabled", String(enabled));
  return NextResponse.json({ ok: true });
}
