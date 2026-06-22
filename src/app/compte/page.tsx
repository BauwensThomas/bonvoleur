import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site, airports, discountPct } from "@/lib/site";
import { getMemberDeals, FREE_DELAY_HOURS } from "@/lib/member-deals";
import { destinationSlug } from "@/lib/routes";
import CompteControls from "@/components/CompteControls";
import type { Tier } from "@/lib/types";

// "Lisbonne (LIS)" -> "lisbonne" (slug de la fiche destination).
function destSlugOf(label: string): string {
  return destinationSlug(label.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim());
}

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

// Espace membre : dashboard des bons plans en direct.
// Auth reelle (Supabase Auth) prevue en Phase 1. En local, on simule le tier
// via ?tier= pour tester le gating gratuit/premium.
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
    tier?: string;
    origin?: string;
    destination?: string;
    maxPrice?: string;
    view?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const tier: Tier = sp.tier === "premium" ? "premium" : "free";
  const origin = sp.origin ?? "";
  const destination = sp.destination ?? "";
  const maxPriceNum = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const sort = sp.sort ?? "recent";

  const { deals, total, liveLockedForFree, lastRefresh } = await getMemberDeals(tier, {
    origin: origin || undefined,
    destination: destination || undefined,
    maxPrice: maxPriceNum,
  });

  // Tri demande (le defaut "recent" est deja applique par getMemberDeals).
  if (sort === "price-asc") deals.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") deals.sort((a, b) => b.price - a.price);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Bandeau dev : auth simulee */}
        <div className="mb-6 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-900">
          Mode demo : la connexion reelle (Supabase Auth) arrive en Phase 1. Ici
          on simule le tier pour tester l&apos;affichage.
          <span className="ml-2">
            <TierLink current={tier} value="free" />
            {" / "}
            <TierLink current={tier} value="premium" />
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Mes bons plans</h1>
            <p className="mt-1 text-slate-600">
              {tier === "premium"
                ? "Accès en direct à tous les bons plans, dès qu'ils sont dénichés."
                : `En gratuit, tu vois quelques bons plans avec ${FREE_DELAY_HOURS}h de retard.`}
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

function TierLink({ current, value }: { current: Tier; value: Tier }) {
  const active = current === value;
  return (
    <Link
      href={`/compte?tier=${value}`}
      className={`underline ${active ? "font-bold" : ""}`}
    >
      {value}
    </Link>
  );
}
