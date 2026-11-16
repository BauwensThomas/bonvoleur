import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runContentPublisher } from "@/lib/content";

// Genere tout de suite l'article d'une idee (sans attendre le passage de
// l'agent). Generation longue : budget max.
export const maxDuration = 300;

export async function POST(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const run = await runContentPublisher("manuel", { ideaId: String(b.id) });
  return NextResponse.json(run, { status: run.status === "success" ? 201 : 500 });
}
