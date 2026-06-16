import { NextResponse } from "next/server";

// Verifie le mot de passe d'acces pre-lancement et pose le cookie bv_gate.
export async function POST(req: Request) {
  const expected = process.env.SITE_GATE_PASSWORD ?? "";
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const origin = new URL(req.url).origin;

  if (!expected || password !== expected) {
    return NextResponse.redirect(`${origin}/acces?error=1`, { status: 303 });
  }

  const res = NextResponse.redirect(origin + "/", { status: 303 });
  res.cookies.set("bv_gate", expected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  return res;
}
