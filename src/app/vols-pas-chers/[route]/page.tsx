import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AirportDeals, { type AirportProof } from "@/components/AirportDeals";
import { getAll } from "@/lib/db";
import { site } from "@/lib/site";
import {
  getDestination,
  getDestinations,
  getRoute,
  destinationSlug,
} from "@/lib/routes";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
      canonical: `${site.url}/vols-pas-chers/${d?.slug ?? destinationSlug(city)}`,
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
    const all = (await getAll("deals")).filter(
      (d) =>
        d.is_hot !== false &&
        d.origin.toUpperCase().includes(`(${originIata})`) &&
        d.destination.toUpperCase().includes(`(${destIata})`)
    );
    const now = Date.now();
    const past = all
      .filter((d) => now - new Date(d.created_at).getTime() >= WEEK_MS)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
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
    const weekCount = all.filter(
      (d) => now - new Date(d.created_at).getTime() < WEEK_MS
    ).length;
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
  const image = dest.image;
  const originCities = dest.routes.map((r) => r.originCity);
  const faq = faqFor(dest.destCity, originCities);

  // Preuve par aéroport de départ.
  const airports: AirportProof[] = await Promise.all(
    dest.routes.map(async (r) => {
      const { past, weekCount } = await proofFor(r.originIata, dest.destIata);
      return { originCity: r.originCity, originIata: r.originIata, past, weekCount };
    })
  );

  // Maillage interne : autres destinations.
  const others = (await getDestinations())
    .filter((x) => x.slug !== dest.slug)
    .slice(0, 12);

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
                href="/#inscription"
                className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-dark shadow-lg ring-1 ring-black/5 transition hover:bg-slate-100"
              >
                Recevoir les bons plans {dest.destCity}
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
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

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
