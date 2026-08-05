import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DestinationsExplorer from "@/components/DestinationsExplorer";
import { site } from "@/lib/site";
import { getDestinations } from "@/lib/routes";
import { getAdsEnabled, getSeoOverride } from "@/lib/settings";
import { SEO_PAGE_DEFAULTS } from "@/lib/seo-page-defaults";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = await Promise.all([
    getSeoOverride("/vols-pas-chers", "title"),
    getSeoOverride("/vols-pas-chers", "meta_description"),
  ]);
  return {
    title: title || SEO_PAGE_DEFAULTS["/vols-pas-chers"].title,
    description: description || SEO_PAGE_DEFAULTS["/vols-pas-chers"].description,
    alternates: { canonical: `${site.canonicalBase}/vols-pas-chers` },
  };
}

export default async function VolsPasChersIndex() {
  const [destinationsRaw, adsEnabled] = await Promise.all([
    getDestinations(),
    getAdsEnabled(),
  ]);
  const destinations = destinationsRaw.map((d) => ({
    city: d.destCity,
    slug: d.slug,
    image: d.image,
    region: d.region,
    origins: d.routes.map((r) => ({
      city: r.originCity,
      iata: r.originIata,
      routeSlug: r.slug,
    })),
  }));

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Vols pas chers depuis la Belgique et la France
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Toutes nos destinations surveillées. Choisis une ville, puis ton
          aéroport de départ. On te prévient par email dès qu&apos;un bon plan
          tombe.
        </p>
        <div className="mt-6">
          <Link
            href="/#inscription"
            className="inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            S&apos;inscrire gratuitement
          </Link>
        </div>

        {destinations.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Toutes nos destinations
            </h2>
            <DestinationsExplorer destinations={destinations} adsEnabled={adsEnabled} />
          </div>
        ) : (
          <p className="mt-10 text-slate-500">
            Nos destinations arrivent très bientôt.
          </p>
        )}

        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Comment trouver un vol pas cher depuis la Belgique ou la France ?
          </h2>
          <p className="mt-4 text-slate-600">
            BonVoleur surveille en continu les prix depuis nos aéroports en
            Belgique et en France. Dès qu&apos;un tarif
            chute sous les prix habituels, on t&apos;envoie une alerte par
            email avec tous les détails pour réserver.
          </p>
          <h2 className="mt-10 text-2xl font-bold text-slate-900">
            Pourquoi s&apos;inscrire à nos alertes vols ?
          </h2>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc list-inside">
            <li>Les meilleures promos disparaissent en quelques heures.</li>
            <li>
              On vérifie chaque deal avant de l&apos;envoyer : pas de faux
              prix, pas de spam.
            </li>
            <li>Inscription gratuite, désinscription en un clic.</li>
          </ul>
          <div className="mt-6">
            <Link
              href="/#inscription"
              className="inline-block rounded-lg border border-brand px-5 py-2.5 font-semibold text-brand hover:bg-brand hover:text-white transition"
            >
              Recevoir les alertes gratuitement
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
