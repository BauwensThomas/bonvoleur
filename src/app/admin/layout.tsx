import type { Metadata } from "next";
import Sidebar from "@/components/admin/Sidebar";
import { isAuthenticated } from "@/lib/auth";
import { getDestinations } from "@/lib/routes";
import { getAll } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  // Non authentifié : seule la page de login arrive ici (middleware redirige
  // le reste). On la rend en plein écran, sans sidebar.
  if (!authed) return <>{children}</>;

  // Nombre de fiches incomplètes (sans photo ou sans texte) -> badge sidebar.
  let incomplete = 0;
  try {
    const dests = await getDestinations(false);
    incomplete = dests.filter((d) => !d.image || !d.content?.intro).length;
  } catch {
    /* base indispo : pas de badge */
  }

  // Nombre d'avis en attente de validation -> badge sidebar.
  let pendingReviews = 0;
  try {
    pendingReviews = (await getAll("reviews")).filter((r) => r.status === "pending").length;
  } catch {
    /* base indispo : pas de badge */
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar incompleteCount={incomplete} pendingReviewsCount={pendingReviews} />
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
