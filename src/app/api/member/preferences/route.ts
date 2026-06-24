import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberState } from "@/lib/member-auth";
import { update } from "@/lib/db";

const schema = z.object({
  home_airports: z.array(z.string().max(8)).max(30),
  email_frequency: z.enum(["daily", "weekly", "none"]),
  newsletter: z.boolean(),
});

// Met à jour les préférences de l'abonné connecté (aéroport(s) + fréquence).
// IMPORTANT : on N'ENVOIE AUCUN email ici et on ne touche pas à la table
// `sends`. Le changement s'applique donc au PROCHAIN envoi programmé : si la
// personne a déjà reçu son email du jour, elle n'en reçoit pas un second.
export async function POST(req: Request) {
  const state = await getMemberState();
  if (state.status !== "member") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  let airports = parsed.data.home_airports.map((a) => a.toUpperCase());
  let frequency = parsed.data.email_frequency;

  // Gating par tier : le gratuit est limité à 1 aéroport et pas de quotidien.
  if (state.tier !== "premium") {
    airports = airports.slice(0, 1);
    if (frequency === "daily") frequency = "weekly";
  }

  if (airports.length === 0) {
    return NextResponse.json(
      { error: "Choisis au moins un aéroport de départ." },
      { status: 400 }
    );
  }

  await update("subscribers", state.subscriber.id, {
    home_airports: airports,
    email_frequency: frequency,
    newsletter: parsed.data.newsletter,
  });

  return NextResponse.json({ ok: true });
}
