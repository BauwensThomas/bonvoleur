import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { findOne, getAll } from "@/lib/db";
import { site } from "@/lib/site";

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
    const posts = await getAll("posts");
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
  const post = await findOne("posts", (p) => p.slug === slug);
  if (!post) return { title: "Article introuvable" };
  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt,
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
  const post = await findOne("posts", (p) => p.slug === slug);
  if (!post || post.status !== "published") notFound();

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
        <h1 className="mt-4 text-3xl font-bold">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Par <span className="text-slate-700">{post.author}</span>
          {" · "}
          {new Date(post.published_at ?? post.created_at).toLocaleDateString(
            "fr-BE",
            { day: "numeric", month: "long", year: "numeric" }
          )}
          {" · "}
          {readingMinutes(post.content)} min de lecture
        </p>
        <article className="prose prose-slate mt-6 max-w-none prose-headings:font-bold prose-a:text-brand">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </article>

        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold">Questions fréquentes</h2>
            <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
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

        <div className="mt-10 rounded-xl bg-brand/5 border border-brand/20 p-6 text-center">
          <p className="font-semibold">Ne rate plus aucun bon plan</p>
          <Link
            href="/#inscription"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark transition"
          >
            S&apos;inscrire gratuitement
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
