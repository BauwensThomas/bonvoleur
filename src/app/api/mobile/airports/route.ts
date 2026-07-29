import { NextResponse } from "next/server";
import { getActiveAirports } from "@/lib/airports";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Aéroports de départ actifs (app mobile, filtre "Départ" de l'écran des
// deals) - mêmes données déjà publiques (comptées dans /api/mobile/stats,
// listées dans le sélecteur d'inscription du site). Pas d'auth nécessaire.
export async function GET() {
  const airports = await getActiveAirports();
  return withCors(NextResponse.json({ airports }));
}
