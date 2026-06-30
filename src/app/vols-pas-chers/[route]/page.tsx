import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AirportDeals, { type AirportProof } from "@/components/AirportDeals";
import { getAll } from "@/lib/db";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { DEFAULT_DEST_IMAGE } from "@/lib/destinations";
import { site } from "@/lib/site";
import { getMemberState } from "@/lib/member-auth";
import {
  getDestination,
  getDestinations,
  getRoute,
  destinationSlug,
} from "@/lib/routes";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

// Preuve sociale par aéroport : deals passés (plus d'1 semaine) + nombre de la
// semaine en cours (teaser). On NE montre PAS les deals en cours (inscrits).
async function proofFor(
  originIata: string,
  destIata: string
): Promise<{ past: AirportProof["past"]; weekCount: number }> {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const all = (await getAll("deals")).filter((d) => {
      if (d.is_hot === false) return false;
      if (!d.origin.toUpperCase().includes(`(${originIata})`)) return false;
      if (!d.destination.toUpperCase().includes(`(${destIata})`)) return false;
      // Date de départ passée -> on ne montre plus le deal (archivé).
      const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (dep && dep < todayStr) return false;
      return true;
    });
    const now = Date.now();
    const seenAt = (d: (typeof all)[number]) => d.published_at ?? d.created_at;
    // Deal "en cours" = il existe un deal encore frais sur la route (ce que voit
    // le premium : un seul par route). Donc 0 ou 1, jamais plus.
    const weekCount = all.some(
      (d) => now - new Date(seenAt(d)).getTime() <= FRESH_MAX_MS
    )
      ? 1
      : 0;
    // Historique (preuve) : deals decouverts il y a plus d'une semaine,
    // Dédoublonnés par prix : même prix sur la même route = même niveau de bon
    // plan, inutile d'afficher deux cartes identiques avec des dates différentes.
    const seen = new Set<string>();
    const past = all
      .filter((d) => now - new Date(d.created_at).getTime() >= WEEK_MS)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((d) => {
        const k = `${d.price}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 6)
      .map((d) => ({
        origin: d.origin,
        destination: d.destination,
        price: d.price,
        normal_price: d.normal_price,
        dates: d.dates,
        airline: d.airline,
        postedAt: d.published_at ?? d.created_at,
      }));
    return { past, weekCount };
  } catch {
    return { past: [], weekCount: 0 };
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
      a: `On surveille les départs depuis ${depuis}. Choisis ton aéroport ci-dessus pour voir les bons plans correspondants.`,
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
  const city = encodeURIComponent(dest.destCity);
  const partners = [
    {
      name: "Booking.com",
      url: `https://www.booking.com/searchresults.fr.html?ss=${city}`,
      desc: `Hôtels et hébergements à ${dest.destCity}`,
      show: true,
    },
    {
      name: "GetYourGuide",
      url: `https://www.getyourguide.com/s/?q=${city}`,
      desc: `Activités et visites guidées à ${dest.destCity}`,
      show: true,
    },
    {
      name: "DiscoverCars",
      url: `https://www.discovercars.com/?iata=${dest.destIata}`,
      desc: `Location de voiture à ${dest.destCity} au meilleur prix`,
      show: dest.region === "Europe",
    },
    {
      name: "Airalo",
      url: "https://www.airalo.com/",
      desc: "eSIM locale, reste connecté sans frais de roaming",
      show: dest.region !== "Europe",
    },
    {
      name: "AirHelp",
      url: "https://www.airhelp.com/fr/",
      desc: "Jusqu'à 600 € si ton vol est retardé ou annulé",
      show: true,
    },
  ].filter((p) => p.show);
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">Préparer ton séjour à {dest.destCity}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  const originCities = dest.routes.map((r) => r.originCity);
  const faq = faqFor(dest.destCity, originCities);

  // Bouton CTA : si connecté → espace membre filtré sur cette destination.
  const member = await getMemberState();
  const ctaHref = member.status !== "anonymous"
    ? `/compte?destination=${encodeURIComponent(dest.destCity)}`
    : "/#inscription";

  // Preuve par aéroport de départ (dédoublonnage par originIata).
  const uniqueRoutes = dest.routes.filter(
    (r, i, arr) => arr.findIndex((x) => x.originIata === r.originIata) === i
  );
  const airports: AirportProof[] = await Promise.all(
    uniqueRoutes.map(async (r) => {
      const { past, weekCount } = await proofFor(r.originIata, dest.destIata);
      return { originCity: r.originCity, originIata: r.originIata, past, weekCount };
    })
  );

  // Maillage interne : toutes les autres destinations.
  const others = (await getDestinations()).filter((x) => x.slug !== dest.slug);

  // Articles de blog pertinents : priorité aux articles qui mentionnent la ville,
  // sinon les 2 plus récents (tous traitent de vols pas chers = toujours pertinents).
  const allPosts = (await getAll("posts"))
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));
  const cityLower = dest.destCity.toLowerCase();
  const relatedPosts = (
    allPosts.filter((p) => p.title?.toLowerCase().includes(cityLower)).length > 0
      ? allPosts.filter((p) => p.title?.toLowerCase().includes(cityLower))
      : allPosts
  ).slice(0, 2);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
                  <p className="mt-1 text-slate-700">{content.duration}</p>
                </div>
              )}
            </div>

            {content.bestPeriod && (
              <p className="mt-4 text-slate-700">
                <strong>Meilleure période :</strong> {content.bestPeriod}
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {relatedPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md"
                >
                  <p className="font-semibold text-slate-800 leading-snug">{p.title}</p>
                  {p.meta_description && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.meta_description}</p>
                  )}
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
