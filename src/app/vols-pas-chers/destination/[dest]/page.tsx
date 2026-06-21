import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
import { getDestinations, getDestination } from "@/lib/routes";

type Params = { dest: string };

export async function generateStaticParams() {
  const dests = await getDestinations();
  return dests.map((d) => ({ dest: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { dest } = await params;
  const d = await getDestination(dest);
  if (!d) return { title: "Destination introuvable" };
  return {
    title: `Vols pas chers vers ${d.destCity}`,
    description: `Vols pas chers vers ${d.destCity} : choisis ton aéroport de départ et reçois nos bons plans par email.`,
    alternates: { canonical: `${site.url}/vols-pas-chers/destination/${d.slug}` },
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { dest } = await params;
  const d = await getDestination(dest);
  if (!d) notFound();

  // Un seul aéroport de départ : on va directement à la route (pas d'onglet inutile).
  if (d.routes.length === 1) {
    redirect(`/vols-pas-chers/${d.routes[0].slug}`);
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <nav className="text-sm text-slate-500">
          <Link href="/vols-pas-chers" className="hover:text-slate-900">
            Vols pas chers
          </Link>{" "}
          / {d.destCity}
        </nav>

        {/* Bannière : photo de la destination (dégradé de secours si absente) */}
        <div className="relative mt-3 overflow-hidden rounded-2xl bg-linear-to-br from-brand-dark to-brand">
          {d.image && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${d.image})` }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/45 to-black/25" />
          <div className="relative px-6 py-12 sm:px-10 sm:py-16">
            <h1 className="text-3xl font-bold text-white drop-shadow sm:text-4xl">
              Vols pas chers vers {d.destCity}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-white/90 drop-shadow">
              Choisis ton aéroport de départ pour voir nos bons plans et infos
              sur la route.
            </p>
          </div>
        </div>

        {/* Sélecteur d'aéroport de départ (onglets) */}
        <h2 className="mt-10 text-xl font-bold">Ton aéroport de départ</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {d.routes.map((r) => (
            <Link
              key={r.slug}
              href={`/vols-pas-chers/${r.slug}`}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand hover:shadow-md"
            >
              {r.originCity} ({r.originIata}) → {d.destCity}
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/#inscription"
            className="inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
          >
            Recevoir les bons plans {d.destCity}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
