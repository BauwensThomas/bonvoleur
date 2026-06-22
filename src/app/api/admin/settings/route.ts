import { NextResponse } from "next/server";
import { setSetting } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";

// Enregistre un réglage du site (ex. image de secours par défaut).
export async function PUT(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const key = String(body.key ?? "");
  const value = String(body.value ?? "");
  const allowed = ["default_dest_image"];
  if (!allowed.includes(key)) {
    return NextResponse.json({ error: "Réglage inconnu." }, { status: 400 });
  }
  try {
    await setSetting(key, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
