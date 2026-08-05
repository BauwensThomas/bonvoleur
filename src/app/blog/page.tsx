import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAll } from "@/lib/db";
import { formatArticleDate } from "@/lib/dates";
import { getAdsEnabled, getSeoOverride } from "@/lib/settings";
import { SEO_PAGE_DEFAULTS } from "@/lib/seo-page-defaults";
import { AD_SLOTS } from "@/lib/ads";
import AdUnit from "@/components/AdUnit";

const AD_INTERVAL = 6;
// La 1ere pub arrive plus tot que le rythme de croisiere (sinon la liste
// parait vide avant de voir une seule pub), puis on retombe sur AD_INTERVAL.
const AD_FIRST = 3;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = await Promise.all([
    getSeoOverride("/blog", "title"),
    getSeoOverride("/blog", "meta_description"),
  ]);
  return {
    title: title || SEO_PAGE_DEFAULTS["/blog"].title,
    description: description || SEO_PAGE_DEFAULTS["/blog"].description,
    alternates: { canonical: "https://www.bonvoleur.com/blog" },
  };
}

export default async function BlogIndex() {
  const [all, adsEnabled] = await Promise.all([getAll("posts"), getAdsEnabled()]);
  const posts = all
    .filter((p) => p.status === "published")
    .sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(
        a.published_at ?? a.created_at
      )
    );

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold">Le blog BonVoleur</h1>
        <p className="mt-2 text-slate-600">
          Guides destinations, bons plans et astuces pour voyager moins cher depuis la Belgique et la France.
          On décortique les meilleures destinations, on t&apos;explique comment dénicher un vol pas cher et on partage
          nos conseils pratiques pour préparer chaque étape de ton voyage, de l&apos;aéroport au logement.
        </p>

        {posts.length === 0 ? (
          <p className="mt-10 text-slate-500">
            Les premiers articles arrivent bientôt.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Fragment key={p.id}>
                <Link
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
                    <h2 className="text-lg font-semibold line-clamp-2 min-h-14">
                      {p.title}
                    </h2>
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
                </Link>
                {adsEnabled &&
                  (i + 1 === AD_FIRST ||
                    (i + 1 > AD_FIRST && (i + 1 - AD_FIRST) % AD_INTERVAL === 0)) && (
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <span className="absolute left-3 top-2 z-10 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Publicité
                    </span>
                    <div className="pt-7">
                      <AdUnit
                        slot={AD_SLOTS.inFeedBlog.slot}
                        layoutKey={AD_SLOTS.inFeedBlog.layoutKey}
                        format="fluid"
                      />
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
