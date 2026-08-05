import React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignupForm from "@/components/SignupForm";
import DealCard from "@/components/DealCard";
import Partners from "@/components/Partners";
import HeroCinematic from "@/components/HeroCinematic";
import SummerPromoPopup from "@/components/SummerPromoPopup";
import DestinationsGrid from "@/components/DestinationsGrid";
import NeedsSignupBanner from "@/components/NeedsSignupBanner";
import { site } from "@/lib/site";
import { getHomepageDeals } from "@/lib/homepage";
import { getActiveAirports } from "@/lib/airports";
import { getDestinations, destinationSlug } from "@/lib/routes";
import { getAll } from "@/lib/db";
import { FRESH_MAX_MS } from "@/lib/deal-freshness";
import { getReviewStats, formatRating } from "@/lib/reviews";
import { formatArticleDate } from "@/lib/dates";
import { getAdsEnabled, getSeoOverride } from "@/lib/settings";
import { SEO_PAGE_DEFAULTS } from "@/lib/seo-page-defaults";
import type { Metadata } from "next";
import { AD_SLOTS } from "@/lib/ads";
import AdSlot from "@/components/AdSlot";

// "Lisbonne (LIS)" -> "lisbonne" (slug de la fiche /vols-pas-chers).
function destSlugOf(label: string): string {
  return destinationSlug(label.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim());
}


export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = await Promise.all([
    getSeoOverride("/", "title"),
    getSeoOverride("/", "meta_description"),
  ]);
  return {
    title: title || SEO_PAGE_DEFAULTS["/"].title,
    description: description || SEO_PAGE_DEFAULTS["/"].description || undefined,
    alternates: { canonical: "https://www.bonvoleur.com" },
  };
}

// ISR : page mise en cache 60s sur le CDN Vercel → TTFB ~50ms au lieu de ~1s.
export const revalidate = 60;

const steps = [
  {
    title: "Inscris-toi gratuitement",
    text: "Choisis tes aéroports de départ depuis la Belgique et la France. Trente secondes, sans carte bancaire.",
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
    text: "Depuis la Belgique et la France. On part de chez toi.",
  },
  {
    title: "Des alertes au bon moment",
    text: "Tu reçois l'info à temps pour réserver avant que ça disparaisse.",
  },
];

export default async function Home() {
  // Vitrine "teaser" : route + prix uniquement (aucune info actionnable).
  const [{ teaserDeals, liveCount }, airports, allSubscribers, reviewStats, adsEnabled] = await Promise.all([
    getHomepageDeals(),
    getActiveAirports(),
    getAll("subscribers"),
    getReviewStats(),
    getAdsEnabled(),
  ]);
  const premiumCount = allSubscribers.filter((s) => s.tier === "premium").length;
  const subscriberTierById = new Map(allSubscribers.map((s) => [s.id, s.tier]));

  // Destinations populaires : par ville, avec ses aéroports de départ.
  const destGroups = await getDestinations();
  const FEATURED = 8;
  const activeIatas = new Set(airports.map((a) => a.iata));

  // Deals actifs = mêmes règles que "vérité premium" (getMemberDeals) : vus
  // récemment (published_at < FRESH_MAX_MS), départ pas encore passé,
  // aéroport actif, is_hot != false.
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const activeDeals = (await getAll("deals")).filter((d) => {
    if (d.is_hot === false) return false;
    const seen = d.published_at ?? d.created_at;
    if (now - new Date(seen).getTime() > FRESH_MAX_MS) return false;
    const dep = (d.dates ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (dep && dep < today) return false;
    const origIata = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    return activeIatas.has(origIata);
  });

  // Par destination IATA : ensemble des aéroports de départ avec un deal actif.
  const originsPerDest = new Map<string, Set<string>>();
  for (const d of activeDeals) {
    const destIata = d.destination.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    const origIata = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
    if (!destIata || !origIata) continue;
    if (!originsPerDest.has(destIata)) originsPerDest.set(destIata, new Set());
    originsPerDest.get(destIata)!.add(origIata);
  }

  // totalDest = destinations avec au moins un deal actif (vérité premium).
  const totalDest = destGroups.filter((d) =>
    d.routes.some((r) => originsPerDest.has(r.destIata))
  ).length;
  const allDestCount = destGroups.length;

  const destinations = [...destGroups]
    .filter((d) => d.routes.some((r) => activeIatas.has(r.originIata)))
    // Tri : plus d'aéroports de départ avec deals actifs en premier,
    // puis total aéroports actifs, puis alphabétique.
    .sort(
      (a, b) =>
        (originsPerDest.get(b.destIata)?.size ?? 0) -
          (originsPerDest.get(a.destIata)?.size ?? 0) ||
        b.routes.filter((r) => activeIatas.has(r.originIata)).length -
          a.routes.filter((r) => activeIatas.has(r.originIata)).length ||
        a.destCity.localeCompare(b.destCity)
    )
    .slice(0, FEATURED)
    .map((d) => ({
      city: d.destCity,
      slug: d.slug,
      image: d.image,
      origins: d.routes
        .filter((r) => activeIatas.has(r.originIata))
        .map((r) => ({
          city: r.originCity,
          iata: r.originIata,
          routeSlug: r.slug,
        })),
    }));
  // Photo par IATA de destination : on indexe tous les IATAs de chaque groupe
  // pour éviter le cas où une ville (ex. New York) a plusieurs codes (JFK, EWR).
  const imgByDestIata = new Map<string, string | null>();
  for (const d of destGroups) {
    for (const r of d.routes) {
      if (!imgByDestIata.has(r.destIata)) imgByDestIata.set(r.destIata, d.image);
    }
  }
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

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.canonicalBase,
    description: site.description,
    email: site.email,
    sameAs: [site.social.instagram, site.social.facebook],
  };
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.canonicalBase,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <Header />
      <SummerPromoPopup />

      <main>
        {/* ── Hero cinématique 3D ── */}
        <HeroCinematic />

        {/* ── Stats ── */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <dl className={`grid gap-px bg-slate-200 overflow-hidden rounded-2xl shadow-sm ${premiumCount >= 50 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
              {([
                {
                  value: liveCount,
                  label: "Bons plans en ce moment",
                  icon: (
                    <svg className="mx-auto mb-2 h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                  ),
                },
                premiumCount >= 50 ? {
                  value: premiumCount,
                  label: "Abonnés premium",
                  icon: (
                    <svg className="mx-auto mb-2 h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  ),
                } : null,
                {
                  value: airports.length,
                  label: "Aéroports de départ",
                  icon: (
                    <svg className="mx-auto mb-2 h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.5 19h19v2h-19zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49L21 11.5c.81-.23 1.28-1.07 1.07-1.86z" />
                    </svg>
                  ),
                },
                {
                  value: totalDest,
                  label: "Destinations disponibles",
                  icon: (
                    <svg className="mx-auto mb-2 h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      {/* piste au bas */}
                      <path d="M2.5 19h19v2h-19z"/>
                      {/* rotation 30° horaire autour du centre -> nez vers bas-droite, ailes vers le haut */}
                      <path transform="rotate(30,12,11)" d="M22.07 9.64c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.49L21 11.5c.81-.23 1.28-1.07 1.07-1.86z"/>
                    </svg>
                  ),
                },
                {
                  value: reviewStats.total > 0 ? (
                    <>
                      {formatRating(reviewStats.average)}
                      <span className="ml-1.5 align-middle text-xl text-amber-500">★</span>
                    </>
                  ) : (
                    "-"
                  ),
                  label:
                    reviewStats.total >= 50
                      ? `Note moyenne (${reviewStats.total} avis)`
                      : "Note moyenne",
                  icon: (
                    <svg className="mx-auto mb-2 h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ),
                },
              ].filter(Boolean) as { value: React.ReactNode; label: string; icon: React.ReactNode }[]).map((s) => (
                <div key={s.label} className="bg-white px-4 py-6 text-center flex flex-col items-center">
                  <dt className="text-sm font-normal text-slate-900">
                    {s.icon}
                    {s.label}
                  </dt>
                  <dd className="mt-auto pt-2 text-4xl font-extrabold text-brand-dark tabular-nums">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Inscription ── */}
        <section
          id="inscription"
          className="mx-auto max-w-7xl px-4 py-20 scroll-mt-20"
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
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
              <Suspense><NeedsSignupBanner /></Suspense>
              <h3 className="text-xl font-bold">Inscris-toi gratuitement</h3>
              <p className="mt-1 text-sm text-slate-600">
                Choisis tes aéroports de départ et reçois par email les bons
                plans qui te concernent.
              </p>
              <div className="mt-4">
                <SignupForm airports={airports} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Comment ça marche (preuve honnête du fonctionnement) ── */}
        <section id="comment-ca-marche" className="border-y border-slate-200 bg-white">
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
                <Link
                  key={`${d.origin}-${d.destination}-${i}`}
                  href={`/vols-pas-chers/${destSlugOf(d.destination)}`}
                  className="block"
                >
                  <DealCard
                    origin={d.origin}
                    destination={d.destination}
                    price={d.price}
                    image={dealImage(d.destination)}
                    teaser
                  />
                </Link>
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
                    Voir toutes les destinations ({allDestCount})
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
                    <h3 className="text-lg font-semibold line-clamp-2 min-h-14">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3 min-h-15">
                      {p.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-sm font-medium text-brand">
                        Lire l&apos;article
                      </span>
                      <span className="text-xs text-slate-900">
                        {formatArticleDate(p.published_at ?? p.created_at)}
                      </span>
                    </div>
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

        {/* ── Avis clients ── */}
        {reviewStats.total > 0 && (
          <section className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-4xl px-4 py-20 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Ce qu&apos;ils en pensent</h2>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {formatRating(reviewStats.average)}
                </span>
                <span className="text-2xl font-normal text-slate-500">/5</span>
                <span className="text-2xl text-amber-500" aria-hidden>
                  {"★".repeat(Math.round(reviewStats.average))}
                  <span className="text-slate-200">
                    {"★".repeat(5 - Math.round(reviewStats.average))}
                  </span>
                </span>
                <span className="text-lg text-slate-700">
                  ({reviewStats.total} avis)
                </span>
              </div>
              {reviewStats.latest.length > 0 && (
                <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-6 text-left">
                  {reviewStats.latest.map((r) => {
                    const tier = subscriberTierById.get(r.subscriber_id);
                    return (
                      <div
                        key={r.id}
                        className="flex w-[calc(50%-0.75rem)] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-amber-500" aria-hidden>
                            {"★".repeat(r.rating)}
                            <span className="text-slate-200">{"★".repeat(5 - r.rating)}</span>
                          </span>
                          <span className="text-xs text-slate-900">
                            {new Date(r.created_at).toLocaleDateString("fr-BE")}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
                        )}
                        <div className="mt-auto pt-3 flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                          {tier && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                tier === "premium"
                                  ? "bg-brand/10 text-brand"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {tier === "premium" ? "Premium" : "Freemium"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        <Suspense fallback={null}>
          <Partners />
        </Suspense>

        {/* ── CTA final ── */}
        <section className="bg-brand">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold">Prêt à voyager moins cher ?</h2>
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

      {adsEnabled && (
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <AdSlot slot={AD_SLOTS.displayContent} format="auto" fullWidthResponsive />
        </div>
      )}

      <Footer />
    </>
  );
}