import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findPostCached } from "@/lib/posts-cache";
import { getAdsEnabled } from "@/lib/settings";
import { verifyPreviewToken } from "@/lib/preview-token";
import ArticleView from "@/components/ArticleView";
import PreviewBar from "@/components/PreviewBar";

// Aperçu privé d'un article via un lien signé (valable 7 jours), généré depuis
// /admin/blog. Sans jeton valide : 404, comme si la page n'existait pas.
// Jamais indexé, jamais mis en cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu article",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PrivatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ slug }, { t }] = await Promise.all([params, searchParams]);
  if (!verifyPreviewToken(slug, t)) notFound();
  // Lecture via le cache des articles (invalide a chaque modification dans
  // l'admin) : une visite du lien ne retelecharge pas toute la table.
  const [post, adsEnabled] = await Promise.all([findPostCached((p) => p.slug === slug), getAdsEnabled()]);
  if (!post) notFound();
  // Article publie : le lien prive expire aussitot (la version publique prend
  // le relais, rien n'est expose de plus).
  if (post.status === "published") redirect(`/blog/${slug}`);

  return (
    <>
      <PreviewBar
        message="Aperçu privé : cet article n'est pas encore publié, merci de ne pas partager ce lien."
        expiresAt={Number(t?.split(".")[0]) * 1000}
      />
      <ArticleView post={post} slug={slug} adsEnabled={adsEnabled} />
    </>
  );
}
