import type { Metadata } from "next";
import Sidebar from "@/components/admin/Sidebar";
import { isAuthenticated } from "@/lib/auth";

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
