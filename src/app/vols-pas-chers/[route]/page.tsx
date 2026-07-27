import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SummerPromoPopup from "@/components/SummerPromoPopup";
import AirportDeals, { type AirportProof } from "@/components/AirportDeals";
import GalleryLightbox from "@/components/GalleryLightbox";
import { getAll } from "@/lib/db";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { DEFAULT_DEST_IMAGE } from "@/lib/destinations";
import { formatArticleDate } from "@/lib/dates";
import { site } from "@/lib/site";
import { getMemberState } from "@/lib/member-auth";
import {
  getDestination,
  getDestinations,
  getRoute,
  destinationSlug,
} from "@/lib/routes";
import { getActiveAirportCodes } from "@/lib/airports";


function parseMd(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function parseTip(tip: string): React.ReactNode {
  const parts = tip.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      return (
        <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer"
          className="font-medium text-brand underline underline-offset-2 hover:text-brand-dark">
          {m[1]}
        </a>
      );
    }
    return part;
  });
}

export const dynamic = "force-dynamic";

// Le segment [route] gère désormais les fiches DESTINATION (slug = ville d'arrivée,
// ex "lisbonne"). Les anciennes URLs origine-destination ("bruxelles-lisbonne")
// redirigent vers la fiche destination.
type Params = { route: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { route } = await params;
  const d = await getDestination(route);
  const city = d?.destCity ?? (await getRoute(route))?.destCity;
  if (!city) return { title: "Destination introuvable" };
  const title = `Vols pas chers vers ${city}`;
  const description = `Les meilleurs bons plans de vols vers ${city}. Choisis ton aéroport de départ, on surveille les prix et on te prévient par email.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${site.canonicalBase}/vols-pas-chers/${d?.slug ?? destinationSlug(city)}`,
    },
    openGraph: {
      type: "website",
      title: `${title} - ${site.name}`,
      description,
    },
  };
}

// Preuve sociale par aéroport. Non-membres : deals > 5 jours. Membres : tous.
async function proofFor(
  originIata: string,
  destIata: string
): Promise<{ weekCount: number }> {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const all = (await getAll("deals")).filter((d) => {
      if (d.is_hot === false) return false;
      if (!d.origin.toUpperCase().includes(`(${originIata})`)) return false;
      if (!d.destination.toUpperCase().includes(`(${destIata})`)) return false;
      const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (dep && dep < todayStr) return false;
      return true;
    });
    const now = Date.now();
    const seenAt = (d: (typeof all)[number]) => d.published_at ?? d.created_at;
    const weekCount = all.some(
      (d) => now - new Date(seenAt(d)).getTime() <= FRESH_MAX_MS
    )
      ? 1
      : 0;
    return { weekCount };
  } catch {
    return { weekCount: 0 };
  }
}

function faqFor(city: string, originCities: string[]) {
  const depuis =
    originCities.length > 0
      ? originCities.join(", ")
      : "nos aéroports surveillés";
  return [
    {
      q: `Quel est le prix d'un vol vers ${city} ?`,
      a: `Les prix varient selon la saison, l'aéroport de départ et la compagnie. On repère les tarifs anormalement bas vers ${city} et on te prévient par email. Les prix affichés sont indicatifs : le tarif exact se confirme au moment de réserver.`,
    },
    {
      q: `Depuis quels aéroports peut-on rejoindre ${city} ?`,
      a: `On surveille les départs depuis ${depuis}. Inscris-toi gratuitement pour recevoir une alerte dès qu'on repère un bon plan vers ${city}.`,
    },
    {
      q: `Quand réserver un vol vers ${city} pas cher ?`,
      a: `Les meilleurs prix partent vite. Le plus simple est de s'inscrire gratuitement pour recevoir nos bons plans vers ${city} par email.`,
    },
    {
      q: `BonVoleur vend-il les billets ?`,
      a: `Non. ${site.name} déniche les bons plans et te renvoie vers le site de la compagnie ou d'un partenaire pour réserver. Tu réserves toujours en direct.`,
    },
  ];
}

function DestPartners({ dest }: { dest: { destCity: string; destIata: string; region: string } }) {
  const isEurope = dest.region === "Europe";
  // Booking, GetYourGuide, Airalo et AirHelp sont dans le texte — pas de doublon ici.
  const partners = [
    {
      name: "DiscoverCars",
      url: `https://www.discovercars.com/fr?iata=${dest.destIata}`,
      desc: `Location de voiture à ${dest.destCity}, comparateur sans frais cachés`,
    },
    {
      name: "Hostelworld",
      url: "https://www.hostelworld.com/fr",
      desc: `Auberges et hébergements budget à ${dest.destCity}`,
    },
    {
      name: "Viator",
      url: "https://www.viator.com/fr-FR/",
      desc: `Visites, excursions et expériences à ${dest.destCity} avec avis vérifiés`,
    },
    {
      name: "Wise",
      url: "https://wise.com/fr/",
      desc: "Carte de voyage sans frais de change, économise sur chaque paiement à l'étranger",
    },
    {
      name: "Omio",
      url: "https://www.omio.fr/",
      desc: "Trains et bus en Europe, compare et réserve en un clic",
      europeOnly: true,
    },
    {
      name: "iVisa",
      url: "https://www.ivisa.com/fr/",
      desc: `Visa et autorisation de voyage pour ${dest.destCity} en ligne`,
      europeOnly: false,
    },
    {
      name: "SafetyWing",
      url: "https://safetywing.com/",
      desc: "Assurance voyage médicale dès 1,5 $/jour, pour voyager l'esprit tranquille",
    },
  ].filter((p) =>
    p.europeOnly === undefined ? true : isEurope ? p.europeOnly === true : p.europeOnly === false
  );
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">Préparer ton séjour à {dest.destCity}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {partners.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md"
          >
            <p className="font-semibold text-slate-800">{p.name}</p>
            <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { route } = await params;

  // Ancienne URL origine-destination -> redirige vers la fiche destination.
  const dest = await getDestination(route);
  if (!dest) {
    // Rapide (sans DB) : retire un prefixe d'aeroport de depart connu.
    for (const o of ["bruxelles", "charleroi", "paris", "lyon"]) {
      if (route.startsWith(`${o}-`)) {
        redirect(`/vols-pas-chers/${route.slice(o.length + 1)}`);
      }
    }
    const r = await getRoute(route);
    if (r) redirect(`/vols-pas-chers/${destinationSlug(r.destCity)}`);
    notFound();
  }

  const content = dest.content;
  const image = dest.image ?? DEFAULT_DEST_IMAGE;
  const onSite = await getActiveAirportCodes();
  const siteRoutes = dest.routes.filter((r) => onSite.has(r.originIata));

  // Bouton CTA : si connecté → espace membre filtré sur cette destination.
  const member = await getMemberState();
  const ctaHref = member.status !== "anonymous"
    ? `/compte?destination=${encodeURIComponent(dest.destCity)}`
    : "/#inscription";

  // Preuve par aéroport de départ (dédoublonnage par originIata).
  const uniqueRoutes = siteRoutes.filter(
    (r, i, arr) => arr.findIndex((x) => x.originIata === r.originIata) === i
  );
  const originCities = uniqueRoutes.map((r) => r.originCity);
  const faq = faqFor(dest.destCity, originCities);
  const isMember = member.status === "member";
  const airports: AirportProof[] = await Promise.all(
    uniqueRoutes.map(async (r) => {
      const { weekCount } = await proofFor(r.originIata, dest.destIata);
      return { originCity: r.originCity, originIata: r.originIata, weekCount };
    })
  );

  // Maillage interne : toutes les autres destinations.
  const others = (await getDestinations()).filter((x) => x.slug !== dest.slug);

  const allPosts = (await getAll("posts"))
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));
  const cityLower = dest.destCity.toLowerCase();
  const cityPosts = allPosts.filter((p) => p.title?.toLowerCase().includes(cityLower));
  const cityPostSlugs = new Set(cityPosts.map((p) => p.slug));
  const relatedPosts = [
    ...cityPosts,
    ...allPosts.filter((p) => !cityPostSlugs.has(p.slug)),
  ].slice(0, 3);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: site.canonicalBase },
      { "@type": "ListItem", position: 2, name: "Vols pas chers", item: `${site.canonicalBase}/vols-pas-chers` },
      { "@type": "ListItem", position: 3, name: dest.destCity, item: `${site.canonicalBase}/vols-pas-chers/${dest.slug}` },
    ],
  };

  return (
    <>
      <Header />
      <SummerPromoPopup />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />

        <nav className="text-sm text-slate-500">
          <Link href="/vols-pas-chers" className="hover:text-slate-900">
            Vols pas chers
          </Link>{" "}
          / {dest.destCity}
        </nav>

        {/* Bannière : photo de la destination (dégradé de secours si absente) */}
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-linear-to-br from-brand-dark to-brand">
          {image && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${image})` }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/45 to-black/25" />
          <div className="relative px-6 py-12 sm:px-10 sm:py-16">
            <h1 className="text-3xl font-bold text-white drop-shadow sm:text-4xl">
              Vols pas chers vers {dest.destCity}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-white/90 drop-shadow">
              On surveille les prix vers {dest.destCity} et on te prévient par
              email. Choisis ton aéroport de départ et inscris-toi pour ne plus
              rater un bon plan.
            </p>
            <div className="mt-6">
              <Link
                href={ctaHref}
                className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-dark shadow-lg ring-1 ring-black/5 transition hover:bg-slate-100"
              >
                {member.status !== "anonymous" ? `Voir mes bons plans ${dest.destCity}` : `Recevoir les bons plans ${dest.destCity}`}
              </Link>
            </div>
          </div>
        </div>

        {/* Sélecteur d'aéroport + preuve sociale / teaser */}
        <AirportDeals
          airports={airports}
          destCity={dest.destCity}
          destImage={image}
          isMember={isMember}
          ctaHref={ctaHref}
        />

        {/* Infos pratiques sur la destination (si disponibles) */}
        {content && (
          <section className="mt-12">
            <p className="leading-relaxed text-slate-700">{content.intro}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.airlines.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Compagnies
                  </p>
                  <p className="mt-1 text-slate-700">
                    {content.airlines.join(", ")}
                  </p>
                </div>
              )}
              {content.duration && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Durée de vol
                  </p>
                  <p className="mt-1 text-slate-700" dangerouslySetInnerHTML={{ __html: parseMd(content.duration) }} />
                </div>
              )}
            </div>

            {content.bestPeriod && (
              <p className="mt-4 text-slate-700">
                <strong>Meilleure période :</strong>{" "}
                <span dangerouslySetInnerHTML={{ __html: parseMd(content.bestPeriod) }} />
              </p>
            )}

            {content.tips.length > 0 && (
              <>
                <h2 className="mt-8 text-2xl font-bold">
                  Conseils pour {dest.destCity}
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                  {content.tips.map((t, i) => (
                    <li key={i}>{parseTip(t)}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* Partenaires thématiques destination */}
        <DestPartners dest={dest} />

        {/* Galerie photos destination : banniere + galerie reunies */}
        {(dest.image || (dest.photos && dest.photos.length > 0)) && (() => {
          const allPhotos = [
            ...(dest.image ? [{ url: dest.image, credit: dest.imageCredit ?? "" }] : []),
            ...(dest.photos ?? []),
          ];
          return allPhotos.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-xl font-bold">{dest.destCity} en photos</h2>
              <GalleryLightbox photos={allPhotos} city={dest.destCity} />
            </section>
          ) : null;
        })()}

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {faq.map((f, i) => (
              <details key={i} className="group p-4">
                <summary className="cursor-pointer font-semibold text-slate-800 marker:content-['']">
                  {f.q}
                </summary>
                <p className="mt-2 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage interne : articles de blog pertinents */}
        {relatedPosts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold">À lire aussi</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  {p.cover_image && (
                    <div
                      className="h-36 bg-cover bg-center"
                      style={{ backgroundImage: `url(${p.cover_image})` }}
                    />
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-semibold text-slate-800 leading-snug line-clamp-2">{p.title}</p>
                    {p.meta_description && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.meta_description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-sm font-medium text-brand">Lire l&apos;article</span>
                      <span className="text-xs text-slate-900">
                        {formatArticleDate(p.published_at ?? p.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Maillage interne : autres destinations */}
        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold">Autres destinations</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/vols-pas-chers/${o.slug}`}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand hover:text-brand"
                >
                  {o.destCity}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
