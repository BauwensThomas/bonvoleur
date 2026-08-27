import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPostsCached, findPostCached } from "@/lib/posts-cache";
import { site } from "@/lib/site";
import { formatArticleDate } from "@/lib/dates";
import { getAdsEnabled } from "@/lib/settings";
import { AD_SLOTS } from "@/lib/ads";
import AdSlot from "@/components/AdSlot";

export const revalidate = 60;

type Params = { slug: string };

// Temps de lecture estimé (~200 mots/minute).
function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function generateStaticParams() {
  // Au build : si la DB n'est pas joignable (tables Supabase pas encore créées),
  // on ne génère aucune page statique plutôt que de planter le build.
  try {
    const posts = await getAllPostsCached();
    return posts
      .filter((p) => p.status === "published")
      .map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPostCached((p) => p.slug === slug);
  if (!post) return { title: "Article introuvable" };
  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt,
    alternates: { canonical: `https://www.bonvoleur.com/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.meta_title ?? post.title,
      description: post.meta_description ?? post.excerpt,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [post, adsEnabled] = await Promise.all([
    findPostCached((p) => p.slug === slug),
    getAdsEnabled(),
  ]);
  if (!post || post.status !== "published") notFound();

  const allPosts = (await getAllPostsCached())
    .filter((p) => p.status === "published" && p.slug !== slug)
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));
  const titleWords = (post.title ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const scored = allPosts.map((p) => ({
    post: p,
    score: titleWords.filter((w) => p.title?.toLowerCase().includes(w)).length,
  }));
  const related = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.post);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: site.name },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    image: post.cover_image ?? undefined,
  };

  const faq = post.faq ?? [];
  const faqJsonLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {faqJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        )}
        <Link href="/blog" className="text-sm text-brand hover:underline">
          ← Retour au blog
        </Link>

        {/* En-tete : cadre avec la photo a gauche, titre + meta a cote. */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex">
          {post.cover_image && (
            <div className="relative min-h-60 w-full sm:min-h-80 sm:w-1/2">
              <Image
                src={post.cover_image}
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex flex-col justify-center p-6 sm:w-1/2">
            <h1 className="text-2xl font-bold sm:text-3xl">{post.title}</h1>
            <p className="mt-3 text-sm text-slate-500">
              Par <span className="text-slate-700">{post.author}</span>
              {" · "}
              {new Date(
                post.published_at ?? post.created_at
              ).toLocaleDateString("fr-BE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {readingMinutes(post.content)} min de lecture
            </p>
            {post.cover_image && post.cover_image_credit && (
              <p className="mt-1 text-xs text-slate-400">
                Photo : {post.cover_image_credit.replace(/^[Pp]hoto\s+/, "")}
              </p>
            )}
          </div>
        </div>

        <article className="prose prose-slate mt-8 max-w-none prose-headings:font-bold prose-a:text-brand">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
                const external = href?.startsWith("http");
                return (
                  <a
                    href={href}
                    {...(external
                      ? { target: "_blank", rel: "sponsored noopener noreferrer" }
                      : {})}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </article>

        {adsEnabled && (
          <div className="my-8">
            <AdSlot slot={AD_SLOTS.inArticleBlog} format="fluid" layout="in-article" />
          </div>
        )}

        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold">Questions fréquentes</h2>
            <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {faq.map((f, i) => (
                <details key={i} className="group p-4">
                  <summary className="cursor-pointer font-semibold text-slate-800 marker:content-['']">
                    {f.question}
                  </summary>
                  <p className="mt-2 text-slate-600">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 rounded-2xl bg-brand/5 border border-brand/20 p-6 text-center">
          <p className="font-semibold">Ne rate plus aucun bon plan</p>
          <Link
            href="/#inscription"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark transition"
          >
            S&apos;inscrire gratuitement
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">A lire aussi</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
                >
                  {p.cover_image && (
                    <div className="relative h-36">
                      <Image
                        src={p.cover_image}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold leading-snug text-slate-800 line-clamp-2">{p.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.excerpt}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-sm font-medium text-brand">Lire l&apos;article</span>
                      <span className="text-xs text-slate-900">
                        {formatArticleDate(p.published_at ?? p.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
