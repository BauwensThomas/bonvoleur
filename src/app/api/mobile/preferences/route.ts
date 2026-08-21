import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { update } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";

export const OPTIONS = corsPreflight;

// Préférences de l'abonné connecté (app mobile) - équivalent bearer-token de
// /api/member/preferences (web, cookie). Même règles de gating par tier.
export async function GET(req: Request) {
  trackMobileRequest("/api/mobile/preferences");
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }
  const sub = state.subscriber;
  return withCors(
    NextResponse.json({
      home_airports: sub.home_airports,
      email_frequency: sub.email_frequency ?? (state.tier === "premium" ? "daily" : "weekly"),
      newsletter: sub.newsletter ?? true,
      push_enabled: sub.push_enabled ?? true,
    })
  );
}

const schema = z.object({
  home_airports: z.array(z.string().max(8)).max(30),
  email_frequency: z.enum(["daily", "weekly", "none"]),
  newsletter: z.boolean(),
  push_enabled: z.boolean().optional(),
});

// IMPORTANT : comme la version web, on N'ENVOIE AUCUN email/push ici et on ne
// touche pas à la table `sends`. Le changement s'applique au PROCHAIN envoi
// programmé.
export async function PATCH(req: Request) {
  trackMobileRequest("/api/mobile/preferences");
  const state = await getMobileMemberState(req);
  if (state.status !== "member") {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: "Requête invalide." }, { status: 400 }));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Données invalides." }, { status: 400 }));
  }

  let airports = parsed.data.home_airports.map((a) => a.toUpperCase());
  let frequency = parsed.data.email_frequency;

  // Gating par tier : le gratuit est limité à 1 aéroport et pas de quotidien.
  if (state.tier !== "premium") {
    airports = airports.slice(0, 1);
    if (frequency === "daily") frequency = "weekly";
  }

  if (airports.length === 0) {
    return withCors(
      NextResponse.json({ error: "Choisis au moins un aéroport de départ." }, { status: 400 })
    );
  }

  await update("subscribers", state.subscriber.id, {
    home_airports: airports,
    email_frequency: frequency,
    newsletter: parsed.data.newsletter,
    ...(parsed.data.push_enabled !== undefined ? { push_enabled: parsed.data.push_enabled } : {}),
    unsubscribed_at: null,
  });

  return withCors(NextResponse.json({ ok: true }));
}
