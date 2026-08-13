import { NextResponse } from "next/server";
import { getDestination } from "@/lib/routes";
import { getActiveAirportCodes } from "@/lib/airports";
import { getAll } from "@/lib/db";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { site } from "@/lib/site";
import { withCors, corsPreflight } from "@/lib/mobile-cors";

export const OPTIONS = corsPreflight;

// Cache 60s (egress Supabase, voir memoire project_conventions_techniques).
export const revalidate = 60;

// Preuve sociale par aeroport (deal frais cette semaine) - meme regle que
// proofFor() dans src/app/vols-pas-chers/[route]/page.tsx.
// Matche par VILLE de destination (pas par code IATA) : une ville comme Rome
// est desservie par plusieurs aeroports (FCO, CIA) et le scanner peut meme
// utiliser un code generique ("ROM") selon le scrape - matcher par IATA
// laissait passer a cote de vrais deals recents (bug reel trouve le
// 2026-07-30 sur Rome, cf. project_blog_image_rehost.md / memoire mobile).
async function weekCountFor(originIata: string, destCity: string): Promise<0 | 1> {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const cityLower = destCity.toLowerCase();
    const all = (await getAll("deals")).filter((d) => {
      if (d.is_hot === false) return false;
      if (!d.origin.toUpperCase().includes(`(${originIata})`)) return false;
      if (!d.destination.toLowerCase().startsWith(cityLower)) return false;
      const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (dep && dep < todayStr) return false;
      return true;
    });
    const now = Date.now();
    const seenAt = (d: (typeof all)[number]) => d.published_at ?? d.created_at;
    return all.some((d) => now - new Date(seenAt(d)).getTime() <= FRESH_MAX_MS) ? 1 : 0;
  } catch {
    return 0;
  }
}

// Memes 4 questions que faqFor() cote site web (contenu genere, pas stocke).
function faqFor(city: string, originCities: string[]) {
  const depuis = originCities.length > 0 ? originCities.join(", ") : "nos aéroports surveillés";
  return [
    {
      question: `Quel est le prix d'un vol vers ${city} ?`,
      answer: `Les prix varient selon la saison, l'aéroport de départ et la compagnie. On repère les tarifs anormalement bas vers ${city} et on te prévient par email. Les prix affichés sont indicatifs : le tarif exact se confirme au moment de réserver.`,
    },
    {
      question: `Depuis quels aéroports peut-on rejoindre ${city} ?`,
      answer: `On surveille les départs depuis ${depuis}. Inscris-toi gratuitement pour recevoir une alerte dès qu'on repère un bon plan vers ${city}.`,
    },
    {
      question: `Quand réserver un vol vers ${city} pas cher ?`,
      answer: `Les meilleurs prix partent vite. Le plus simple est de s'inscrire gratuitement pour recevoir nos bons plans vers ${city} par email.`,
    },
    {
      question: `BonVoleur vend-il les billets ?`,
      answer: `Non. ${site.name} déniche les bons plans et te renvoie vers le site de la compagnie ou d'un partenaire pour réserver. Tu réserves toujours en direct.`,
    },
  ];
}

// Fiche destination par slug (app mobile) - equivalent de
// /vols-pas-chers/[route]. Public, pas d'auth. Une seule ville dessert
// plusieurs aeroports de depart (origins), pas une route par couple.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dest = await getDestination(slug);
  if (!dest) {
    return withCors(NextResponse.json({ error: "Destination introuvable" }, { status: 404 }));
  }

  const onSite = await getActiveAirportCodes();
  const activeRoutes = dest.routes.filter((r) => onSite.has(r.originIata));
  const seenOrigins = new Set<string>();
  const uniqueRoutes = activeRoutes.filter((r) => {
    if (seenOrigins.has(r.originIata)) return false;
    seenOrigins.add(r.originIata);
    return true;
  });
  const origins = await Promise.all(
    uniqueRoutes.map(async (r) => ({
      originIata: r.originIata,
      originCity: r.originCity,
      weekCount: await weekCountFor(r.originIata, dest.destCity),
    }))
  );

  return withCors(
    NextResponse.json({
      slug: dest.slug,
      destIata: dest.destIata,
      destCity: dest.destCity,
      region: dest.region,
      image: dest.image,
      imageCredit: dest.imageCredit,
      photos: dest.photos,
      content: dest.content,
      origins,
      faq: faqFor(dest.destCity, origins.map((o) => o.originCity)),
    })
  );
}
