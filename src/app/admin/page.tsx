import Link from "next/link";
import { getAll } from "@/lib/db";
import { getMemberDeals } from "@/lib/member-deals";
import { getScannerRuns } from "@/lib/github-actions";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
    >
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function AdminDashboard() {
  const [subscribers, memberDeals, posts, partners, runs, scanner] =
    await Promise.all([
      getAll("subscribers"),
      getMemberDeals("premium"), // ce que voit le premium : 1 deal par route
      getAll("posts"),
      getAll("partners"),
      getAll("agent_runs"),
      getScannerRuns(),
    ]);

  const recentRuns = [...runs]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-1 text-slate-500">Vue d&apos;ensemble de BonVoleur.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Abonnés" value={subscribers.length} href="/admin/subscribers" />
        <Stat label="Deals" value={memberDeals.total} href="/admin/deals" />
        <Stat label="Articles" value={posts.length} href="/admin/blog" />
        <Stat label="Partenaires" value={partners.length} href="/admin/partners" />
        <Stat
          label="Exécutions scanner"
          value={scanner.total}
          href="/admin/scanner"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  {new Date(r.started_at).toLocaleString("fr-BE", { timeZone: "Europe/Brussels" })} · {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
