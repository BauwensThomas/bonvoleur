import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPostsCached } from "@/lib/posts-cache";
import { formatArticleDate } from "@/lib/dates";
import { getAdsEnabled, getSeoOverride } from "@/lib/settings";
import { SEO_PAGE_DEFAULTS } from "@/lib/seo-page-defaults";
import BlogList from "@/components/BlogList";

// ISR (comme l'accueil) : pas de donnee par visiteur sur cette page, voir
// vols-pas-chers/page.tsx pour le contexte complet (egress Supabase).
export const revalidate = 60;

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
  const [all, adsEnabled] = await Promise.all([getAllPostsCached(), getAdsEnabled()]);
  const posts = all
    .filter((p) => p.status === "published")
    .sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(
        a.published_at ?? a.created_at
      )
    );

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Le blog BonVoleur",
    url: "https://www.bonvoleur.com/blog",
    inLanguage: "fr",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://www.bonvoleur.com/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
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
          <BlogList
            adsEnabled={adsEnabled}
            posts={posts.map((p) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              excerpt: p.excerpt ?? "",
              cover_image: p.cover_image,
              dateLabel: formatArticleDate(p.published_at ?? p.created_at),
            }))}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
