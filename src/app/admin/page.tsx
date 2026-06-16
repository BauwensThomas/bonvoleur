import Link from "next/link";
import { getAll } from "@/lib/db";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 hover:border-brand hover:shadow-sm transition"
    >
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function AdminDashboard() {
  const [subscribers, deals, posts, partners, runs] = await Promise.all([
    getAll("subscribers"),
    getAll("deals"),
    getAll("posts"),
    getAll("partners"),
    getAll("agent_runs"),
  ]);

  const recentRuns = [...runs]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-1 text-slate-500">Vue d&apos;ensemble de BonVoleur.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Abonnés" value={subscribers.length} href="/admin/subscribers" />
        <Stat label="Deals" value={deals.length} href="/admin/deals" />
        <Stat label="Articles" value={posts.length} href="/admin/blog" />
        <Stat label="Partenaires" value={partners.length} href="/admin/partners" />
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Dernières exécutions d&apos;agents</h2>
          <Link href="/admin/agents" className="text-sm text-brand hover:underline">
            Tout voir
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune exécution pour le moment.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {recentRuns.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <span className="font-medium">{r.agent_name}</span>
                <span className="text-slate-500">
                  {new Date(r.started_at).toLocaleString("fr-BE")} · {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
