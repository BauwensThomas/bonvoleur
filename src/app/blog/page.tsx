import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAll } from "@/lib/db";
import { formatArticleDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog voyage et bons plans",
  description:
    "Guides destinations, conseils voyage et astuces pour voler moins cher depuis la Belgique et la France.",
  alternates: { canonical: "https://www.bonvoleur.com/blog" },
};

export default async function BlogIndex() {
  const all = await getAll("posts");
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
            {posts.map((p) => (
              <Link
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
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
