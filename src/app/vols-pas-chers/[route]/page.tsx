import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DealCard from "@/components/DealCard";
import { getAll } from "@/lib/db";
import { site } from "@/lib/site";
import {
  getSeoRoute,
  sameOrigin,
  sameDestination,
  type SeoRoute,
} from "@/lib/seo-routes";
import { ROUTE_CONTENT } from "@/lib/route-content";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

type Params = { route: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { route } = await params;
  const r = getSeoRoute(route);
  if (!r) return { title: "Route introuvable" };
  const title = `Vols pas chers ${r.originCity} - ${r.destCity}`;
  const description = `Les meilleurs bons plans de vols ${r.originCity} vers ${r.destCity} (${r.originIata} - ${r.destIata}). On surveille les prix et on t'alerte quand c'est le moment de réserver.`;
  return {
    title,
    description,
    alternates: { canonical: `${site.url}/vols-pas-chers/${r.slug}` },
    openGraph: {
      type: "website",
      title: `${title} - ${site.name}`,
      description,
      url: `${site.url}/vols-pas-chers/${r.slug}`,
    },
  };
}

interface RouteProof {
  past: {
    origin: string;
    destination: string;
    price: number;
    normal_price: number | null;
    dates: string;
    airline: string | null;
    postedAt: string;
  }[];
  weekCount: number; // deals de cette semaine (réservés aux inscrits) -> teaser
}

// On NE montre PAS les deals en cours (ils sont réservés aux inscrits).
// On montre les deals des semaines passées comme preuve sociale, et on tease
// le nombre trouvé cette semaine pour donner envie de s'inscrire.
async function routeProof(r: SeoRoute): Promise<RouteProof> {
  try {
    const all = (await getAll("deals")).filter(
      (d) =>
        d.is_hot !== false &&
        d.origin.toUpperCase().includes(`(${r.originIata})`) &&
        d.destination.toUpperCase().includes(`(${r.destIata})`)
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

function faqFor(r: SeoRoute) {
  return [
    {
      q: `Quel est le prix d'un vol ${r.originCity} - ${r.destCity} ?`,
      a: `Les prix varient selon la saison et la compagnie. On repère et on t'alerte dès qu'un tarif anormalement bas apparaît sur ${r.originCity} - ${r.destCity}. Les prix affichés sont indicatifs : le tarif exact se confirme au moment de réserver.`,
    },
    {
      q: `Quand réserver un vol ${r.originCity} - ${r.destCity} pas cher ?`,
      a: `Les meilleurs prix partent vite, souvent en quelques heures pour les erreurs de prix. Le plus simple est de s'inscrire gratuitement pour recevoir nos bons plans sur cette route par email.`,
    },
    {
      q: `BonVoleur vend-il les billets ${r.originCity} - ${r.destCity} ?`,
      a: `Non. ${site.name} déniche les bons plans et te renvoie vers le site de la compagnie ou d'un partenaire pour réserver. Tu réserves toujours en direct.`,
    },
  ];
}

export default async function RoutePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { route } = await params;
  const r = getSeoRoute(route);
  if (!r) notFound();

  const { past, weekCount } = await routeProof(r);
  const content = ROUTE_CONTENT[r.slug]; // vraies infos (compagnies, durée...), si générées
  const faq = faqFor(r);
  const others = sameOrigin(r).slice(0, 6);
  const inbound = sameDestination(r).slice(0, 4);

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
          / {r.originCity} - {r.destCity}
        </nav>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Vols pas chers {r.originCity} - {r.destCity}
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          On surveille les prix des vols {r.originCity} ({r.originIata}) vers{" "}
          {r.destCity} ({r.destIata}) et on t&apos;alerte dès qu&apos;un tarif
          anormalement bas apparaît. Inscris-toi gratuitement pour ne plus rater
          un bon plan sur cette route.
        </p>

        <div className="mt-6">
          <Link
            href="/#inscription"
            className="inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Recevoir les alertes {r.destCity}
          </Link>
        </div>

        {/* Infos pratiques RÉELLES sur la route (si générées) */}
        {content && (
          <section className="mt-10">
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
                  Conseils pour {r.originCity} - {r.destCity}
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

        {/* Teaser : deals de cette semaine, réservés aux inscrits */}
        {weekCount > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
            <p className="text-sm text-slate-700">
              <strong>{weekCount}</strong> bon{weekCount > 1 ? "s" : ""} plan
              {weekCount > 1 ? "s" : ""} {r.originCity} - {r.destCity} cette
              semaine, réservé{weekCount > 1 ? "s" : ""} aux inscrits.
            </p>
            <Link
              href="/#inscription"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Recevoir les bons plans
            </Link>
          </div>
        )}

        {/* Preuve sociale : on n'affiche cette section QUE s'il y a de vrais
            bons plans passés à montrer (sinon page propre, pas de remplissage). */}
        {past.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold">
              Ce qu&apos;on a déniché récemment {r.originCity} - {r.destCity}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Voici des bons plans que nos abonnés ont reçus. Les offres en cours
              sont réservées aux inscrits.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((d, i) => (
                <DealCard
                  key={`${d.origin}-${d.destination}-${i}`}
                  origin={d.origin}
                  destination={d.destination}
                  price={d.price}
                  normal_price={d.normal_price}
                  dates={d.dates}
                  airline={d.airline}
                  postedAt={d.postedAt}
                />
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-10">
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

        {/* Maillage interne */}
        {(others.length > 0 || inbound.length > 0) && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">Autres destinations</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/vols-pas-chers/${o.slug}`}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-brand hover:text-brand"
                >
                  {o.originCity} - {o.destCity}
                </Link>
              ))}
              {inbound.map((o) => (
                <Link
                  key={o.slug}
                  href={`/vols-pas-chers/${o.slug}`}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-brand hover:text-brand"
                >
                  {o.originCity} - {o.destCity}
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
