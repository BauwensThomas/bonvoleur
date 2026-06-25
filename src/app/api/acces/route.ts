import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/request";
import { getBlock, registerFailure, clear } from "@/lib/rate-limit";

// 10 tentatives échouées en 15 min => blocage de l'IP 15 min (anti brute-force).
const LIMIT = { windowMs: 15 * 60 * 1000, max: 10, blockMs: 15 * 60 * 1000 };

// Verifie le mot de passe d'acces pre-lancement et pose le cookie bv_gate.
export async function POST(req: Request) {
  const expected = process.env.SITE_GATE_PASSWORD ?? "";
  const origin = new URL(req.url).origin;
  const ip = getClientIp(req);

  if (getBlock("gate", ip) !== null) {
    return NextResponse.redirect(`${origin}/acces?error=rate`, { status: 303 });
  }

  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  if (!expected || password !== expected) {
    registerFailure("gate", ip, LIMIT);
    return NextResponse.redirect(`${origin}/acces?error=1`, { status: 303 });
  }

  clear("gate", ip);
  const res = NextResponse.redirect(origin + "/", { status: 303 });
  res.cookies.set("bv_gate", expected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  return res;
}
