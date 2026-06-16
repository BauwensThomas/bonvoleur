import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignupForm from "@/components/SignupForm";
import DealCard from "@/components/DealCard";
import Partners from "@/components/Partners";
import HeroCinematic from "@/components/HeroCinematic";
import { site } from "@/lib/site";
import { getHomepageDeals } from "@/lib/homepage";

// Rendu dynamique : l'accueil relit les deals à chaque visite (compteur à jour).
export const dynamic = "force-dynamic";

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
    title: "Alertes dès qu'un deal tombe",
    text: "Tu reçois l'info à temps pour réserver avant que ça disparaisse.",
  },
];

export default async function Home() {
  // Uniquement de vrais deals des semaines passées (aucun exemple fictif).
  const { weekCount, pastDeals } = await getHomepageDeals();

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
                Les meilleurs vols pas chers,{" "}
                <span className="text-brand">droit dans ta boîte mail.</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                {site.promise} On surveille les prix depuis la Belgique et la
                France, on déniche les promos et les erreurs de prix, et on te
                prévient.
              </p>
              <ul className="mt-6 space-y-2">
                {features.map((f) => (
                  <li key={f.title} className="flex gap-2 text-slate-700">
                    <span className="text-brand font-bold">•</span>
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
                Choisis tes aéroports de départ et reçois les bons plans qui te
                concernent, dès qu&apos;ils tombent.
              </p>
              <div className="mt-4">
                <SignupForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── Deals ── */}
        <section id="deals" className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                Nos bons plans de la semaine dernière
              </h2>
              <p className="mt-1 text-slate-600">
                Voilà ce que nos abonnés ont reçu. Les deals de cette semaine
                sont réservés aux inscrits.
              </p>
            </div>
            {weekCount > 0 && (
              <a
                href="#inscription"
                className="rounded-full bg-accent/15 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-accent/25"
              >
                {weekCount} bon{weekCount > 1 ? "s" : ""} plan
                {weekCount > 1 ? "s" : ""} cette semaine, inscris-toi pour les
                recevoir
              </a>
            )}
          </div>
          {pastDeals ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastDeals.map((d, i) => (
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
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Les premiers bons plans arrivent très bientôt. Inscris-toi pour
              être prévenu dès qu&apos;ils tombent.
            </p>
          )}
        </section>

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