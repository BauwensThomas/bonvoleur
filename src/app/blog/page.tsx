import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog voyage et bons plans",
  description:
    "Guides destinations, conseils voyage et astuces pour voler moins cher depuis la Belgique et la France.",
  alternates: { canonical: "https://www.bonvoleur.com/blog" },
};

function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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
          Guides, conseils et astuces pour voyager moins cher.
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
                  <p className="text-xs font-medium text-slate-500">
                    {frDate(p.published_at ?? p.created_at)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold line-clamp-2 min-h-14">
                    {p.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-3 min-h-15">
                    {p.excerpt}
                  </p>
                  <span className="mt-auto pt-3 text-sm font-medium text-brand">
                    Lire l&apos;article
                  </span>
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
