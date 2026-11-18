import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAll } from "@/lib/db";
import { getAdsEnabled } from "@/lib/settings";
import { isAuthenticated } from "@/lib/auth";
import ArticleView from "@/components/ArticleView";
import PreviewBar from "@/components/PreviewBar";

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
      <PreviewBar
        message={
          post.status !== "published"
            ? "Aperçu du brouillon : cet article n'est pas publié et n'est visible que par toi."
            : "Aperçu de l'article publié."
        }
      />
      <ArticleView post={post} slug={slug} adsEnabled={adsEnabled} />
    </>
  );
}
