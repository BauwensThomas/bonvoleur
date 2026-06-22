"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/scanner", label: "Scanner" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/partners", label: "Partenaires" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/subscribers", label: "Abonnés" },
  { href: "/admin/agents", label: "Agents" },
];

export default function Sidebar({
  incompleteCount = 0,
}: {
  incompleteCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="h-16 flex items-center px-5 font-bold border-b border-slate-200">
        BonVoleur<span className="text-brand">.admin</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active =
            l.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{l.label}</span>
              {l.href === "/admin/photos" && incompleteCount > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    active ? "bg-white text-brand" : "bg-red-100 text-red-700"
                  }`}
                  title="Fiches sans photo ou sans texte"
                >
                  {incompleteCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-200 space-y-1">
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Voir le site
        </Link>
        <button
          onClick={logout}
          className="w-full text-left rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
