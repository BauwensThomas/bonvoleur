import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
import { seoRoutes } from "@/lib/seo-routes";

export const metadata: Metadata = {
  title: "Vols pas chers depuis la Belgique et la France",
  description:
    "Toutes nos routes surveillées : vols pas chers depuis Bruxelles, Charleroi, Paris et Lyon. On t'alerte dès qu'un bon plan tombe.",
  alternates: { canonical: `${site.url}/vols-pas-chers` },
};

export default function VolsPasChersIndex() {
  // Groupe les routes par ville de départ.
  const byOrigin = new Map<string, typeof seoRoutes>();
  for (const r of seoRoutes) {
    const list = byOrigin.get(r.originCity) ?? [];
    list.push(r);
    byOrigin.set(r.originCity, list);
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Vols pas chers depuis la Belgique et la France
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-600">
          On surveille les prix sur ces routes et on t&apos;alerte dès
          qu&apos;un bon plan tombe. Choisis ta route, ou inscris-toi pour
          recevoir les alertes par email.
        </p>
        <div className="mt-6">
          <Link
            href="/#inscription"
            className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent-dark"
          >
            S&apos;inscrire gratuitement
          </Link>
        </div>

        <div className="mt-10 space-y-8">
          {[...byOrigin.entries()].map(([city, routes]) => (
            <section key={city}>
              <h2 className="text-xl font-bold">Depuis {city}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {routes.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/vols-pas-chers/${r.slug}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-brand hover:text-brand"
                  >
                    {r.originCity} - {r.destCity}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
