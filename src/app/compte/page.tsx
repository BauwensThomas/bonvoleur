import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site, airports, discountPct, scanTimes } from "@/lib/site";
import { getMemberDeals, FREE_DELAY_HOURS } from "@/lib/member-deals";
import RefreshCountdown from "@/components/RefreshCountdown";
import type { Tier } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

// Espace membre : dashboard des bons plans en direct.
// Auth reelle (Supabase Auth) prevue en Phase 1. En local, on simule le tier
// via ?tier= pour tester le gating gratuit/premium.
export const dynamic = "force-dynamic";

export default async function Compte({
  searchParams,
}: {
  searchParams: Promise<{
    tier?: string;
    origin?: string;
    destination?: string;
    maxPrice?: string;
    view?: string;
  }>;
}) {
  const sp = await searchParams;
  const tier: Tier = sp.tier === "premium" ? "premium" : "free";
  const origin = sp.origin ?? "";
  const destination = sp.destination ?? "";
  const maxPriceNum = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";

  const { deals, liveLockedForFree } = await getMemberDeals(tier, {
    origin: origin || undefined,
    destination: destination || undefined,
    maxPrice: maxPriceNum,
  });

  // Construit une URL en conservant les filtres et le tier, en changeant la vue.
  const viewUrl = (v: "grid" | "list") => {
    const p = new URLSearchParams();
    if (tier === "premium") p.set("tier", "premium");
    if (origin) p.set("origin", origin);
    if (destination) p.set("destination", destination);
    if (sp.maxPrice) p.set("maxPrice", sp.maxPrice);
    p.set("view", v);
    return `/compte?${p.toString()}`;
  };

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
                ? "Acces en direct a tous les bons plans, des qu'ils sont denichees."
                : `En gratuit, tu vois les bons plans avec ${FREE_DELAY_HOURS}h de retard.`}
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

        {/* Compte a rebours premium : prochaine actualisation du scanner */}
        {tier === "premium" && (
          <div className="mt-5">
            <RefreshCountdown times={scanTimes} />
          </div>
        )}

        {/* Incitation premium pour les gratuits */}
        {tier === "free" && liveLockedForFree > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-5 py-4">
            <p className="text-sm text-slate-700">
              <strong>{liveLockedForFree}</strong> bon
              {liveLockedForFree > 1 ? "s" : ""} plan
              {liveLockedForFree > 1 ? "s" : ""} {liveLockedForFree > 1 ? "sont" : "est"}{" "}
              deja disponible{liveLockedForFree > 1 ? "s" : ""} en direct pour les
              premium. Les bons prix partent vite.
            </p>
            <Link
              href="/#inscription"
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Passer premium
            </Link>
          </div>
        )}

        {/* Filtres */}
        <form
          method="get"
          className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4"
        >
          <input type="hidden" name="tier" value={tier} />
          <input type="hidden" name="view" value={view} />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Depart</span>
            <select
              name="origin"
              defaultValue={origin}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Tous</option>
              {airports.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.city} ({a.iata})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Destination</span>
            <input
              type="text"
              name="destination"
              defaultValue={destination}
              placeholder="Ville ou code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Prix max (EUR)</span>
            <input
              type="number"
              name="maxPrice"
              min="0"
              defaultValue={sp.maxPrice ?? ""}
              placeholder="ex. 100"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
            >
              Filtrer
            </button>
            <Link
              href={`/compte?tier=${tier}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:border-slate-400"
            >
              Reinitialiser
            </Link>
          </div>
        </form>

        {/* Barre : nombre de deals + bascule Cartes / Liste */}
        {deals.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {deals.length} bon{deals.length > 1 ? "s" : ""} plan
              {deals.length > 1 ? "s" : ""}
            </p>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
              <Link
                href={viewUrl("grid")}
                className={
                  view === "grid"
                    ? "bg-brand px-3 py-1.5 font-medium text-white"
                    : "px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                }
              >
                Cartes
              </Link>
              <Link
                href={viewUrl("list")}
                className={
                  view === "list"
                    ? "bg-brand px-3 py-1.5 font-medium text-white"
                    : "px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                }
              >
                Liste
              </Link>
            </div>
          </div>
        )}

        {deals.length === 0 ? (
          <p className="mt-10 text-center text-slate-500">
            Aucun bon plan ne correspond pour le moment. Reviens bientot ou ajuste
            les filtres.
          </p>
        ) : view === "list" ? (
          <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {deals.map((d) => {
              const pct =
                d.normal_price && d.normal_price > 0
                  ? discountPct(d.price, d.normal_price)
                  : null;
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
                >
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold text-slate-900">
                      {d.origin} vers {d.destination}
                    </p>
                    <p className="text-sm text-slate-500">
                      {d.dates}
                      {d.airline ? ` · ${d.airline}` : ""}
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
                  <span className="text-xl font-bold text-brand">
                    {d.price}€
                    {pct && (
                      <span className="ml-2 text-sm font-normal text-slate-400 line-through">
                        {d.normal_price}€
                      </span>
                    )}
                  </span>
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
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
                    <span className="text-2xl font-bold text-brand">
                      {d.price}€
                    </span>
                    {pct && (
                      <span className="ml-2 text-sm text-slate-400 line-through">
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
                  <a
                    href={d.booking_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-4 block rounded-lg bg-brand px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Voir l&apos;offre
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
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
