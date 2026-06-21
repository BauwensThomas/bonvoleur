import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAll } from "@/lib/db";
import { getDestinations } from "@/lib/routes";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog voyage et bons plans",
  description:
    "Guides destinations, conseils voyage et astuces pour voler moins cher depuis la Belgique et la France.",
};

function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Encart voyage (image gauche/droite alternée) inséré entre les articles.
function TravelBlock({ image, reverse }: { image: string; reverse: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:col-span-2 sm:flex ${
        reverse ? "sm:flex-row-reverse" : ""
      }`}
    >
      <div
        className="h-44 bg-cover bg-center sm:h-auto sm:w-1/2"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="flex flex-col justify-center p-6 sm:w-1/2">
        <h3 className="text-xl font-bold">Envie de voyager moins cher ?</h3>
        <p className="mt-2 text-slate-600">
          Reçois nos meilleurs bons plans de vols depuis la Belgique et la
          France, par email et gratuitement.
        </p>
        <Link
          href="/#inscription"
          className="mt-4 w-fit rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
        >
          S&apos;inscrire gratuitement
        </Link>
      </div>
    </div>
  );
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

  // Images de voyage pour les encarts (photos de destinations déjà en base).
  const travel = (await getDestinations())
    .map((d) => d.image)
    .filter((x): x is string => Boolean(x));

  // Interleave : un encart tous les 3 puis 4 articles (alterné), image
  // gauche/droite alternée. Automatique au fil des articles ajoutés.
  const items: ({ kind: "post"; post: Post } | { kind: "block"; image: string; reverse: boolean })[] = [];
  let sinceLast = 0;
  let useGap3 = true;
  let blockIdx = 0;
  posts.forEach((post, i) => {
    items.push({ kind: "post", post });
    sinceLast += 1;
    const gap = useGap3 ? 3 : 4;
    if (travel.length > 0 && sinceLast === gap && i < posts.length - 1) {
      items.push({
        kind: "block",
        image: travel[blockIdx % travel.length],
        reverse: blockIdx % 2 === 1,
      });
      blockIdx += 1;
      sinceLast = 0;
      useGap3 = !useGap3;
    }
  });

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
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {items.map((it, i) =>
              it.kind === "block" ? (
                <TravelBlock key={`b${i}`} image={it.image} reverse={it.reverse} />
              ) : (
                <Link
                  key={it.post.id}
                  href={`/blog/${it.post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  {it.post.cover_image && (
                    <div
                      className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${it.post.cover_image})` }}
                    />
                  )}
                  <div className="p-5">
                    <p className="text-xs font-medium text-slate-500">
                      {frDate(it.post.published_at ?? it.post.created_at)}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{it.post.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {it.post.excerpt}
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-brand">
                      Lire l&apos;article
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
