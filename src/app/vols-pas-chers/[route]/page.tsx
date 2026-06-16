import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAll } from "@/lib/db";
import { site } from "@/lib/site";
import {
  getSeoRoute,
  sameOrigin,
  sameDestination,
  type SeoRoute,
} from "@/lib/seo-routes";
import type { Deal } from "@/lib/types";

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

async function routeDeals(r: SeoRoute): Promise<Deal[]> {
  try {
    const all = await getAll("deals");
    return all
      .filter(
        (d) =>
          d.is_hot !== false &&
          d.origin.toUpperCase().includes(`(${r.originIata})`) &&
          d.destination.toUpperCase().includes(`(${r.destIata})`)
      )
      .sort((a, b) => a.price - b.price)
      .slice(0, 6);
  } catch {
    return [];
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
      a: `Les meilleurs prix partent vite, souvent en quelques heures pour les erreurs de prix. Le plus simple est de s'inscrire gratuitement pour être prévenu dès qu'un bon plan tombe sur cette route.`,
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

  const deals = await routeDeals(r);
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
      <main className="mx-auto max-w-7xl px-4 py-12">
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
        <p className="mt-3 max-w-3xl text-lg text-slate-600">
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

        {/* Derniers bons plans pour la route */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold">
            Derniers bons plans {r.originCity} - {r.destCity}
          </h2>
          {deals.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
              Aucun bon plan en ligne sur cette route pour l&apos;instant.
              Inscris-toi pour être prévenu dès qu&apos;il y en a un.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {d.origin} vers {d.destination}
                  </p>
                  <p className="mt-2">
                    <span className="text-sm text-slate-500">
                      aux alentours de{" "}
                    </span>
                    <span className="text-2xl font-bold text-brand">
                      {d.price}€
                    </span>
                    <span className="ml-1 text-sm text-slate-500">
                      aller-retour
                    </span>
                  </p>
                  {d.dates && (
                    <p className="mt-2 text-sm text-slate-600">
                      Dates : {d.dates}
                    </p>
                  )}
                  <a
                    href={d.booking_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-4 block rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Voir l&apos;offre
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="mt-10 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
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
