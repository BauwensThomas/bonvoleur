import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DestinationsExplorer from "@/components/DestinationsExplorer";
import { site } from "@/lib/site";
import { getDestinations } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vols pas chers depuis la Belgique et la France",
  description:
    "Toutes nos destinations : vols pas chers depuis Bruxelles, Charleroi, Paris et Lyon. Choisis ta destination, on te prévient par email.",
  alternates: { canonical: `${site.canonicalBase}/vols-pas-chers` },
};

export default async function VolsPasChersIndex() {
  const destinations = (await getDestinations()).map((d) => ({
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
            <DestinationsExplorer destinations={destinations} />
          </div>
        ) : (
          <p className="mt-10 text-slate-500">
            Nos destinations arrivent très bientôt.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
