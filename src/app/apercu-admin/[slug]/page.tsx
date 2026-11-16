import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAll } from "@/lib/db";
import { getAdsEnabled } from "@/lib/settings";
import { isAuthenticated } from "@/lib/auth";
import ArticleView from "@/components/ArticleView";

// Aperçu d'un article (brouillon ou publié) avec exactement la mise en page de
// la page publique. Réservé à l'admin connecté (sinon 404, comme si la page
// n'existait pas), jamais indexé, lecture directe en base (pas de cache).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu article",
  robots: { index: false, follow: false },
};

export default async function ArticlePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthenticated())) notFound();
  const { slug } = await params;
  const [posts, adsEnabled] = await Promise.all([getAll("posts"), getAdsEnabled()]);
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      {post.status !== "published" && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          Aperçu du brouillon : cet article n&apos;est pas publié et n&apos;est visible que par toi.
        </div>
      )}
      <ArticleView post={post} slug={slug} adsEnabled={adsEnabled} />
    </>
  );
}
