import { site } from "@/lib/site";

// Bandeau d'annonce de l'app mobile Android sur la homepage. Le lien Google
// Play est déterministe (package Android fixe) mais ne répondra vraiment
// qu'une fois la fiche publiée par Google - rien à changer côté code à ce
// moment-là.
export default function AppPromoSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex flex-col items-center gap-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4 text-center sm:text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt=""
              width={48}
              height={48}
              className="hidden h-12 w-12 shrink-0 sm:block"
            />
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                L&apos;app BonVoleur est disponible
              </h2>
              <p className="mt-1 max-w-xl text-slate-600">
                Reçois les bons plans en notification push, avant même
                l&apos;email. Retrouve aussi tes alertes, tes destinations
                favorites et ton abonnement, directement sur ton téléphone.
              </p>
            </div>
          </div>

          <a
            href={site.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            {/* Badge officiel Google Play (hébergé par Google, respecte leurs règles de marque). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://play.google.com/intl/fr/badges/static/images/badges/fr_badge_web_generic.png"
              alt="Disponible sur Google Play"
              width={202}
              height={60}
              className="h-15 w-auto"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
