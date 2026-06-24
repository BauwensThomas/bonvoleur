import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";
import { site, airports, discountPct } from "@/lib/site";
import { getMemberDeals, FREE_DELAY_HOURS } from "@/lib/member-deals";
import { getMemberState } from "@/lib/member-auth";
import { destinationSlug } from "@/lib/routes";
import CompteControls from "@/components/CompteControls";

// "Lisbonne (LIS)" -> "lisbonne" (slug de la fiche destination).
function destSlugOf(label: string): string {
  return destinationSlug(label.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim());
}

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

// Espace membre : dashboard des bons plans en direct.
// Auth REELLE (Supabase Auth) : la session est validee cote serveur et le tier
// (gratuit/premium) vient de la base. Aucun moyen de forcer le premium via l'URL.
export const dynamic = "force-dynamic";

// Date + heure de détection du deal (suivi de fraîcheur).
function detectedAt(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Compte({
  searchParams,
}: {
  searchParams: Promise<{
    origin?: string;
    destination?: string;
    maxPrice?: string;
    view?: string;
    sort?: string;
    from?: string;
    to?: string;
    auth_error?: string;
    resend?: string;
  }>;
}) {
  const sp = await searchParams;

  // Sécurité : on exige une vraie session. Sinon -> formulaire de connexion,
  // aucune donnée de deal n'est exposée.
  const member = await getMemberState();
  if (member.status === "anonymous") {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-12">
          {sp.auth_error && (
            <p className="mx-auto max-w-md rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              La connexion a échoué ou le lien a expiré. Réessaie.
            </p>
          )}
          <LoginForm />
        </main>
        <Footer />
      </>
    );
  }
  // Connecté mais pas (encore) abonné : on ne crée pas de compte à la volée,
  // on renvoie vers l'inscription (avec son aéroport, consentement, etc.).
  if (member.status === "no-account") {
    redirect("/?besoin_inscription=1#inscription");
  }
  // Inscrit mais inscription non confirmée (double opt-in) : pas d'accès tant
  // que le lien de confirmation n'a pas été cliqué.
  if (member.status === "unconfirmed") {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Confirme ton inscription</h1>
            <p className="mt-3 text-slate-600">
              Ton inscription n&apos;est pas encore confirmée. Ouvre l&apos;email
              de confirmation qu&apos;on t&apos;a envoyé à{" "}
              <strong>{member.email}</strong> et clique sur le lien. (Pense à
              vérifier les spams.)
            </p>
            {sp.resend === "ok" && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Email de confirmation renvoyé. Vérifie ta boîte mail.
              </p>
            )}
            {sp.resend === "rate" && (
              <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Patiente quelques minutes avant de renvoyer un nouvel email.
              </p>
            )}
            <form
              action="/api/auth/resend-confirmation"
              method="post"
              className="mt-6"
            >
              <button
                type="submit"
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Renvoyer l&apos;email de confirmation
              </button>
            </form>
            <form action="/auth/logout" method="post" className="mt-3">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand hover:text-brand"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const tier = member.tier;
  const origin = sp.origin ?? "";
  const destination = sp.destination ?? "";
  const maxPriceNum = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const sort = sp.sort ?? "recent";
  // Période de voyage : réservée au premium.
  const from = tier === "premium" ? sp.from ?? "" : "";
  const to = tier === "premium" ? sp.to ?? "" : "";

  const { deals, total, liveLockedForFree, lastRefresh } = await getMemberDeals(tier, {
    origin: origin || undefined,
    destination: destination || undefined,
    maxPrice: maxPriceNum,
    dateFrom: from || undefined,
    dateTo: to || undefined,
  });

  // Tri demande (le defaut "recent" est deja applique par getMemberDeals).
  if (sort === "price-asc") deals.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") deals.sort((a, b) => b.price - a.price);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Compte connecté : email + déconnexion */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Connecté en tant que <strong>{member.email}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/compte/preferences"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand hover:text-brand"
            >
              Mes préférences
            </Link>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-brand hover:text-brand"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Mes bons plans</h1>
            <p className="mt-1 text-slate-600">
              {tier === "premium"
                ? "Accès en direct à tous les bons plans, dès qu'ils sont dénichés."
                : `En gratuit, tu vois jusqu'à 6 bons plans avec ${Math.round(FREE_DELAY_HOURS / 24)} jours de retard.`}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tier === "premium"
                ? "bg-brand/10 text-brand-dark"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Compte {tier === "premium" ? "premium" : "gratuit"}
          </span>
        </div>

        {/* Premium : info reelle de derniere actualisation (les heures de scan
            ne sont pas garanties a la minute, on n'affiche donc pas de promesse). */}
        {tier === "premium" && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-slate-700">
            <span>Bons plans actualisés plusieurs fois par jour.</span>
            {lastRefresh && (
              <span className="font-medium text-brand-dark">
                Dernière actualisation : {detectedAt(lastRefresh)}
              </span>
            )}
          </div>
        )}

        {/* Incitation premium pour les gratuits */}
        {tier === "free" && liveLockedForFree > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-5 py-4">
            <p className="text-sm text-slate-700">
              <strong>{total}</strong> bon{total > 1 ? "s" : ""} plan
              {total > 1 ? "s" : ""} actuellement disponible
              {total > 1 ? "s" : ""} en premium.
            </p>
            <Link
              href="/#inscription"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Passer premium
            </Link>
          </div>
        )}

        {/* Filtres + tri + vue (auto, sans bouton ; vue memorisee) */}
        <CompteControls airports={airports} />

        {deals.length > 0 && (
          <p className="mt-6 text-sm text-slate-500">
            {deals.length} bon{deals.length > 1 ? "s" : ""} plan
            {deals.length > 1 ? "s" : ""}
          </p>
        )}

        {deals.length === 0 ? (
          <p className="mt-10 text-center text-slate-500">
            Aucun bon plan ne correspond pour le moment. Reviens bientôt ou ajuste
            les filtres.
          </p>
        ) : view === "list" ? (
          <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {deals.map((d) => {
              const pct =
                d.normal_price && d.normal_price > 0
                  ? discountPct(d.price, d.normal_price)
                  : null;
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold text-slate-900">
                      {d.origin} vers {d.destination}
                    </p>
                    <p className="text-sm text-slate-500">
                      {d.dates}
                      {d.airline ? ` · ${d.airline}` : ""}
                    </p>
                    <p className="text-xs font-medium text-accent-dark">
                      Déniché le{" "}
                      {detectedAt(
                        tier === "premium"
                          ? d.published_at ?? d.created_at
                          : d.created_at,
                      )}
                    </p>
                  </div>
                  {pct ? (
                    <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-dark">
                      -{pct}%
                    </span>
                  ) : d.is_error_fare ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Erreur de prix
                    </span>
                  ) : null}
                  <span className="text-sm text-slate-500">aux alentours de</span>
                  <span className="text-xl font-bold text-brand tabular-nums">
                    {d.price}€
                    {pct && (
                      <span className="ml-2 text-sm font-normal text-slate-700 line-through">
                        {d.normal_price}€
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/vols-pas-chers/${destSlugOf(d.destination)}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
                  >
                    Infos
                  </Link>
                  <a
                    href={d.booking_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Voir l&apos;offre
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => {
              const pct =
                d.normal_price && d.normal_price > 0
                  ? discountPct(d.price, d.normal_price)
                  : null;
              return (
                <div
                  key={d.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    {pct ? (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-dark">
                        -{pct}%
                      </span>
                    ) : d.is_error_fare ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Erreur de prix
                      </span>
                    ) : (
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-dark">
                        Bon plan
                      </span>
                    )}
                    {d.airline && (
                      <span className="text-xs text-slate-500">{d.airline}</span>
                    )}
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">
                    {d.origin} vers {d.destination}
                  </p>
                  <p className="mt-2">
                    <span className="text-sm text-slate-500">
                      aux alentours de{" "}
                    </span>
                    <span className="text-2xl font-bold text-brand tabular-nums">
                      {d.price}€
                    </span>
                    {pct && (
                      <span className="ml-2 text-sm text-slate-700 line-through">
                        {d.normal_price}€
                      </span>
                    )}
                    <span className="ml-1 text-sm text-slate-500">
                      aller-retour
                    </span>
                  </p>
                  {d.dates && (
                    <p className="mt-2 text-sm text-slate-600">Dates : {d.dates}</p>
                  )}
                  <p className="mt-1 text-xs font-medium text-accent-dark">
                    Déniché le{" "}
                    {detectedAt(
                      tier === "premium"
                        ? d.published_at ?? d.created_at
                        : d.created_at,
                    )}
                  </p>
                  <a
                    href={d.booking_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-4 block rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Voir l&apos;offre
                  </a>
                  <Link
                    href={`/vols-pas-chers/${destSlugOf(d.destination)}`}
                    className="mt-2 block rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
                  >
                    Infos sur la destination
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-700">
          {site.name}{" "}ne vend pas de billets : la reservation se fait sur le site
          de la compagnie ou d&apos;un partenaire.
        </p>
      </main>
      <Footer />
    </>
  );
}
