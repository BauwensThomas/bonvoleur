import { NextResponse } from "next/server";
import { getAll } from "@/lib/db";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const dynamic = "force-static";
export const revalidate = 60;

// Partenaires actifs (app mobile) - equivalent de la section "Nos partenaires
// voyage" de la homepage (src/components/Partners.tsx). Public, pas d'auth.
export async function GET() {
  const partners = (await getAll("partners"))
    .filter((p) => p.is_active)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      name: p.name,
      logo: p.logo,
      url: p.affiliate_url || p.url,
      category: p.category,
      description: p.description,
    }));

  return withCors(NextResponse.json({ partners }));
}
