import Link from "next/link";
import { getAll, getRecentDeals } from "@/lib/db";
import { getMemberDeals } from "@/lib/member-deals";
import { getScannerRuns } from "@/lib/github-actions";
import { getDestinations } from "@/lib/routes";

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
  const [subscribers, memberDeals, posts, partners, runs, scanner, airports, destinations] =
    await Promise.all([
      getAll("subscribers"),
      getMemberDeals("premium"),
      getAll("posts"),
      getAll("partners"),
      getAll("agent_runs"),
      getScannerRuns(),
      getAll("airports"),
      getDestinations(),
    ]);

  const activeAirports = airports
    .filter((a: { active: boolean; iata: string; name?: string }) => a.active)
    .sort((a: { iata: string }, b: { iata: string }) => a.iata.localeCompare(b.iata));

  const AIRPORT_NAMES: Record<string, string> = {
    BRU: "Bruxelles", CRL: "Charleroi", LGG: "Liège", ANR: "Anvers", OST: "Ostende",
    CDG: "Paris CDG", ORY: "Paris Orly", BVA: "Paris Beauvais",
    LYS: "Lyon", NCE: "Nice", MRS: "Marseille", BOD: "Bordeaux",
    TLS: "Toulouse", NTE: "Nantes", LIL: "Lille", MPL: "Montpellier", SXB: "Strasbourg",
  };

  const freemiumCount = subscribers.filter((s: { tier?: string }) => s.tier !== "premium").length;
  const premiumSubCount = subscribers.filter((s: { tier?: string }) => s.tier === "premium").length;

  const activeIatas = new Set(activeAirports.map((a: { iata: string }) => a.iata));

  // Destinations avec au moins un deal actif (fenêtre 5 jours, même logique que homepage).
  const recentDeals = await getRecentDeals(5);
  const activeDestIatas = new Set(
    recentDeals
      .filter((d) => {
        const orig = d.origin.match(/\(([A-Z]{3})\)/)?.[1] ?? "";
        return activeIatas.has(orig);
      })
      .map((d) => d.destination.match(/\(([A-Z]{3})\)/)?.[1] ?? "")
      .filter(Boolean)
  );
  const activeDestCount = destinations.filter((d) =>
    d.routes.some((r) => activeDestIatas.has(r.destIata))
  ).length;

  const recentRuns = [...runs]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-1 text-slate-500">Vue d&apos;ensemble de BonVoleur.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/admin/subscribers"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
        >
          <p className="text-3xl font-bold tabular-nums">{subscribers.length}</p>
          <p className="mt-1 text-sm text-slate-500">Abonnés</p>
          <div className="mt-2 flex gap-3 text-xs">
            <span className="text-slate-400">{freemiumCount} freemium</span>
            <span className="font-medium text-brand">{premiumSubCount} premium</span>
          </div>
        </Link>
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
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Aéroports actifs</h2>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                {activeAirports.length}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeAirports.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun aéroport actif</p>
              ) : (
                activeAirports.map((a: { iata: string }) => (
                  <span
                    key={a.iata}
                    className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-800"
                  >
                    {AIRPORT_NAMES[a.iata] ?? a.iata}
                    <span className="ml-1 text-green-500 font-normal">{a.iata}</span>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="shrink-0">
            <h2 className="font-semibold">Destinations</h2>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">Total en base</span>
                <span className="font-semibold tabular-nums">{destinations.length}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">Avec deals actifs</span>
                <span className="font-semibold tabular-nums text-green-700">{activeDestCount}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">Sans deals actifs</span>
                <span className="font-semibold tabular-nums text-amber-600">{destinations.length - activeDestCount}</span>
              </div>
            </div>
            <Link href="/admin/photos" className="mt-3 inline-block text-sm text-brand hover:underline">
              Voir les fiches
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
