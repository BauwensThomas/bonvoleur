import { NextResponse } from "next/server";
import { z } from "zod";
import { authUserExists } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/request";
import { allow } from "@/lib/rate-limit";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

const schema = z.object({ email: z.string().email() });

// Verifie si un email a deja un compte, AVANT l'etape mot de passe du
// formulaire d'inscription - evite de faire choisir un mot de passe pour
// rien a quelqu'un deja inscrit. Limite de debit : cette route revele une
// information (existence d'un compte), meme si elle finit de toute facon par
// etre revelee plus tard via signUp() - juste plus tot.
// Appelee en same-origin par le site (SignupForm.tsx) ET cross-origin par
// l'app mobile (LoginScreen.tsx) - CORS necessaire pour l'apercu web Expo.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await allow("check-email", ip, { windowMs: 60 * 1000, max: 20 }))) {
    return withCors(NextResponse.json({ error: "Trop de requêtes." }, { status: 429 }));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: "Requête invalide." }, { status: 400 }));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Email invalide." }, { status: 400 }));
  }

  const exists = await authUserExists(parsed.data.email.trim().toLowerCase());
  return withCors(NextResponse.json({ exists }));
}
