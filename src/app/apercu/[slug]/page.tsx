import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAll } from "@/lib/db";
import { getAdsEnabled } from "@/lib/settings";
import { verifyPreviewToken } from "@/lib/preview-token";
import ArticleView from "@/components/ArticleView";
import PrintPreviewBar from "@/components/PrintPreviewBar";

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
  const [posts, adsEnabled] = await Promise.all([getAll("posts"), getAdsEnabled()]);
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <PrintPreviewBar message="Aperçu privé : cet article n'est pas encore publié, merci de ne pas partager ce lien." />
      <ArticleView post={post} slug={slug} adsEnabled={adsEnabled} />
    </>
  );
}
