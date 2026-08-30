import { NextResponse } from "next/server";
import { getPublicPartners } from "@/lib/partners-cache";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { trackMobileRequest } from "@/lib/request-track";
import { rateLimit } from "@/lib/rate-limit";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const dynamic = "force-dynamic";
export const revalidate = 60;

// Partenaires actifs (app mobile) - equivalent de la section "Nos partenaires
// voyage" de la homepage (src/components/Partners.tsx). Public, pas d'auth.
export async function GET(req: Request) {
  const limited = rateLimit(req, "/api/mobile/partners");
  if (limited) return withCors(limited);
  trackMobileRequest("/api/mobile/partners");
  const partners = (await getPublicPartners())
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
