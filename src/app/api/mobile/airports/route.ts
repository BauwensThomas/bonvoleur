import { NextResponse } from "next/server";
import { getActiveAirports } from "@/lib/airports";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";
import { rateLimit } from "@/lib/rate-limit";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const dynamic = "force-dynamic";
export const revalidate = 60;

// Aéroports de départ actifs (app mobile, filtre "Départ" de l'écran des
// deals) - mêmes données déjà publiques (comptées dans /api/mobile/stats,
// listées dans le sélecteur d'inscription du site). Pas d'auth nécessaire.
export async function GET(req: Request) {
  const limited = rateLimit(req, "/api/mobile/airports");
  if (limited) return withCors(limited);
  trackMobileRequest("/api/mobile/airports");
  const airports = await getActiveAirports();
  return withCors(NextResponse.json({ airports }));
}
