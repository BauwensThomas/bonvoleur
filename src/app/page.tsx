import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignupForm from "@/components/SignupForm";
import DealCard from "@/components/DealCard";
import Partners from "@/components/Partners";
import HeroCinematic from "@/components/HeroCinematic";
import DestinationsGrid from "@/components/DestinationsGrid";
import { site } from "@/lib/site";
import { getHomepageDeals } from "@/lib/homepage";
import { getDestinations } from "@/lib/routes";
import { getAll } from "@/lib/db";

// Rendu dynamique : l'accueil relit les deals à chaque visite (compteur à jour).
export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Inscris-toi gratuitement",
    text: "Choisis tes aéroports de départ (Bruxelles, Charleroi, Paris, Lyon). Trente secondes, sans carte bancaire.",
  },
  {
    title: "On surveille les prix",
    text: "Notre scanner compare les tarifs plusieurs fois par jour et repère les vraies baisses et les erreurs de prix.",
  },
  {
    title: "Tu reçois les bons plans",
    text: "Les meilleures offres arrivent par email, avec les dates et le lien pour réserver. Tu n'as plus qu'à partir.",
  },
];

const features = [
  {
    title: "Des bons plans vérifiés",
    text: "On ne garde que les vrais prix bas, avec le lien encore valide. Pas de bruit, que du bon.",
  },
  {
    title: "Aéroports belges et français",
    text: "Bruxelles, Charleroi, Paris et Lyon. On part de chez toi.",
  },
  {
    title: "Des alertes au bon moment",
    text: "Tu reçois l'info à temps pour réserver avant que ça disparaisse.",
  },
];

export default async function Home() {
  // Vitrine "teaser" : route + prix uniquement (aucune info actionnable).
  const { teaserDeals } = await getHomepageDeals();

  // Destinations populaires : par ville, avec ses aéroports de départ.
  const destGroups = await getDestinations();
  // Met en avant un nombre limité (scalable) : destinations avec des deals
  // d'abord, puis les autres. Le reste est sur le hub /vols-pas-chers.
  const FEATURED = 8;
  const dealDestIatas = new Set(
    (await getAll("deals"))
      .filter((d) => d.is_hot !== false)
      .map((d) => d.destination.match(/\(([A-Z]{3})\)/)?.[1] ?? "")
  );
  const totalDest = destGroups.length;
  const destinations = [...destGroups]
    // "Populaires" = desservies depuis le plus d'aéroports (pertinent pour le
    // plus de visiteurs). Départage : un deal en cours, puis ordre alphabétique.
    .sort(
      (a, b) =>
        b.routes.length - a.routes.length ||
        Number(dealDestIatas.has(b.destIata)) -
          Number(dealDestIatas.has(a.destIata)) ||
        a.destCity.localeCompare(b.destCity)
    )
    .slice(0, FEATURED)
    .map((d) => ({
      city: d.destCity,
      slug: d.slug,
      image: d.image,
      origins: d.routes.map((r) => ({
        city: r.originCity,
        iata: r.originIata,
        routeSlug: r.slug,
      })),
    }));
  // Photo de chaque destination (par code IATA) pour les cartes deals.
  const imgByDestIata = new Map(destGroups.map((d) => [d.destIata, d.image]));
  const dealImage = (label: string) => {
    const m = label.match(/\(([A-Z]{3})\)/);
    return (m && imgByDestIata.get(m[1])) || null;
  };

  // 3 derniers articles de blog publiés (+ total pour le bouton « voir tous »).
  const publishedPosts = (await getAll("posts"))
    .filter((p) => p.status === "published")
    .sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(
        a.published_at ?? a.created_at
      )
    );
  const totalArticles = publishedPosts.length;
  const articles = publishedPosts.slice(0, 3);

  return (
    <>
      <Header />

      <main>
        {/* ── Hero cinématique 3D ── */}
        <HeroCinematic />

        {/* ── Inscription ── */}
        <section
          id="inscription"
          className="mx-auto max-w-7xl px-4 py-20 scroll-mt-20"
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight">
                Les meilleurs vols pas chers,
                <br />
                <span className="text-brand">droit dans ta boîte mail.</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                {site.promise} On surveille les prix depuis la Belgique et la
                France, on déniche les promos et les erreurs de prix, et on te
                prévient.
              </p>
              <ul className="mt-6 space-y-3">
                {features.map((f) => (
                  <li key={f.title} className="flex gap-3 text-slate-700">
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-5 w-5 shrink-0 text-brand"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>
                      <strong>{f.title}.</strong> {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="text-xl font-bold">Inscris-toi gratuitement</h3>
              <p className="mt-1 text-sm text-slate-600">
                Choisis tes aéroports de départ et reçois par email les bons
                plans qui te concernent.
              </p>
              <div className="mt-4">
                <SignupForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── Comment ça marche (preuve honnête du fonctionnement) ── */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Comment ça marche
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Trois étapes, et les bons plans viennent à toi.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-lg font-bold text-brand-dark tabular-nums">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Deals ── */}
        <section id="deals" className="mx-auto max-w-7xl px-4 py-20">
          <div>
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Un aperçu de nos bons plans
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Inscris-toi gratuitement et reçois nos meilleurs bons plans par
              email, avec tous les détails pour réserver.
            </p>
          </div>
          {teaserDeals ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teaserDeals.map((d, i) => (
                <DealCard
                  key={`${d.origin}-${d.destination}-${i}`}
                  origin={d.origin}
                  destination={d.destination}
                  price={d.price}
                  image={dealImage(d.destination)}
                  teaser
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Les premiers bons plans arrivent très bientôt. Inscris-toi pour
              les recevoir par email.
            </p>
          )}
        </section>

        {/* ── Destinations populaires (clic -> menu des aéroports de départ) ── */}
        {destinations.length > 0 && (
          <section className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-20">
              <h2 className="text-center text-3xl font-bold tracking-tight">
                Destinations populaires
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
                Clique sur une ville et choisis ton aéroport de départ.
              </p>
              <div className="mt-8">
                <DestinationsGrid destinations={destinations} />
              </div>
              {totalDest > destinations.length && (
                <div className="mt-8 text-center">
                  <a
                    href="/vols-pas-chers"
                    className="inline-block rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
                  >
                    Voir toutes les destinations ({totalDest})
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Derniers articles du blog ── */}
        {articles.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Le blog
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Nos derniers conseils pour voyager moins cher.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((p) => (
                <a
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  {p.cover_image && (
                    <div
                      className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${p.cover_image})` }}
                    />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>
                    <span className="mt-auto pt-3 text-sm font-medium text-brand">
                      Lire l&apos;article
                    </span>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-8 text-center">
              <a
                href="/blog"
                className="inline-block rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
              >
                Voir tous les articles ({totalArticles})
              </a>
            </div>
          </section>
        )}

        <Partners />

        {/* ── CTA final ── */}
        <section className="bg-brand">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center text-white">
            <h2 className="text-3xl font-bold">Prêt à voyager moins cher ?</h2>
            <p className="mt-2 text-white/90">
              Rejoins les voyageurs malins qui ne ratent plus aucun bon plan.
            </p>
            <a
              href="#inscription"
              className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-dark hover:bg-slate-100 transition"
            >
              Je m&apos;inscris gratuitement
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}