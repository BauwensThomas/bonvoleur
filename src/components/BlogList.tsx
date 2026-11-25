"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdUnit from "@/components/AdUnit";
import { AD_SLOTS } from "@/lib/ads";

export interface BlogListPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  dateLabel: string;
}

const AD_INTERVAL = 6;
// La 1ere pub arrive plus tot que le rythme de croisiere (sinon la liste
// parait vide avant de voir une seule pub), puis on retombe sur AD_INTERVAL.
const AD_FIRST = 3;
// Nombre d'articles affiches d'abord, puis par clic sur "Afficher plus".
const PAGE_SIZE = 12;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Tous les articles restent dans le HTML (les liens internes restent
// explorables par Google) ; ceux qui ne sont pas "affichés" sont seulement
// masqués en CSS, donc leurs images ne sont pas chargées.
export default function BlogList({ posts, adsEnabled }: { posts: BlogListPost[]; adsEnabled: boolean }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const q = normalize(query.trim());
  const searching = q.length > 0;

  const matches = useMemo(() => {
    if (!searching) return posts.map(() => true);
    const words = q.split(/\s+/);
    return posts.map((p) => {
      const hay = normalize(`${p.title} ${p.excerpt}`);
      return words.every((w) => hay.includes(w));
    });
  }, [posts, q, searching]);

  const matchCount = matches.filter(Boolean).length;
  // En recherche : tous les résultats. Sinon : les `shown` premiers.
  const limit = searching ? Infinity : shown;
  // Rang (1, 2, 3...) de chaque article visible, 0 s'il est masque : sert au
  // placement des pubs.
  const ranks: number[] = [];
  let count = 0;
  for (let i = 0; i < posts.length; i += 1) {
    const isVisible = matches[i] && count < limit;
    ranks.push(isVisible ? ++count : 0);
  }
  const remaining = Math.max(0, posts.length - shown);

  return (
    <>
      <div className="mt-6">
        <label htmlFor="blog-search" className="sr-only">
          Rechercher un article
        </label>
        <input
          id="blog-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un article (ex : Lisbonne, bagage cabine, Charleroi...)"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {searching && (
          <p className="mt-2 text-sm text-slate-600" role="status">
            {matchCount === 0
              ? "Aucun article ne correspond à ta recherche."
              : `${matchCount} article${matchCount > 1 ? "s" : ""} trouvé${matchCount > 1 ? "s" : ""}.`}
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => {
          const r = ranks[i];
          const visible = r > 0;
          const showAd =
            visible && adsEnabled && !searching && (r === AD_FIRST || (r > AD_FIRST && (r - AD_FIRST) % AD_INTERVAL === 0));
          return (
            <Fragment key={p.id}>
              <Link
                href={`/blog/${p.slug}`}
                className={`group flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg ${
                  visible ? "flex" : "hidden"
                }`}
              >
                {p.cover_image && (
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={p.cover_image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold line-clamp-2 min-h-14">{p.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-3 min-h-15">{p.excerpt}</p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-medium text-brand">Lire l&apos;article</span>
                    <span className="text-xs text-slate-900">{p.dateLabel}</span>
                  </div>
                </div>
              </Link>
              {showAd && (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <span className="absolute left-3 top-2 z-10 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Publicité
                  </span>
                  <div className="pt-7">
                    <AdUnit slot={AD_SLOTS.inFeedBlog.slot} layoutKey={AD_SLOTS.inFeedBlog.layoutKey} format="fluid" />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {!searching && remaining > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-brand shadow-sm hover:border-brand/40 hover:shadow-md"
          >
            Afficher plus d&apos;articles ({remaining} restant{remaining > 1 ? "s" : ""})
          </button>
        </div>
      )}
    </>
  );
}
