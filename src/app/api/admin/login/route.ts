import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, adminToken } from "@/lib/auth";
import { getClientIp } from "@/lib/request";
import { getBlock, registerFailure, clear } from "@/lib/rate-limit";

// 5 tentatives échouées en 15 min => blocage de l'IP pendant 15 min.
const LIMIT = { windowMs: 15 * 60 * 1000, max: 5, blockMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const blockedFor = await getBlock("admin-login", ip);
  if (blockedFor !== null) {
    return NextResponse.json(
      {
        error: `Trop de tentatives. Réessaie dans ${Math.ceil(
          blockedFor / 60
        )} min.`,
      },
      { status: 429, headers: { "Retry-After": String(blockedFor) } }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (body.password !== adminPassword()) {
    const blocked = await registerFailure("admin-login", ip, LIMIT);
    if (blocked !== null) {
      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessaie dans ${Math.ceil(
            blocked / 60
          )} min.`,
        },
        { status: 429, headers: { "Retry-After": String(blocked) } }
      );
    }
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 401 }
    );
  }

  // Succès : on efface l'historique d'échecs de l'IP.
  await clear("admin-login", ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
