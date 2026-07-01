import { createClient } from "@supabase/supabase-js";
import PeriodSelector from "@/components/admin/PeriodSelector";

const AIRPORTS: Record<string, string> = {
  BRU: "Bruxelles",
  CRL: "Charleroi",
  LGG: "Liège",
  ANR: "Anvers",
  OST: "Ostende",
  CDG: "Paris CDG",
  ORY: "Paris Orly",
  BVA: "Paris Beauvais",
  LYS: "Lyon",
  NCE: "Nice",
  MRS: "Marseille",
  BOD: "Bordeaux",
  TLS: "Toulouse",
  NTE: "Nantes",
  LIL: "Lille",
  MPL: "Montpellier",
  SXB: "Strasbourg",
};

const ON_SITE = new Set(["BRU", "CRL", "CDG", "LYS"]);

function iataFrom(origin: string): string | null {
  const m = origin.match(/\(([A-Z]{3})\)/);
  return m ? m[1] : null;
}

function statusLabel(pct: number) {
  if (pct >= 80) return { label: "Fiable", cls: "bg-green-100 text-green-800" };
  if (pct >= 40) return { label: "À surveiller", cls: "bg-amber-100 text-amber-800" };
  if (pct > 0) return { label: "Insuffisant", cls: "bg-red-100 text-red-800" };
  return { label: "Aucun deal", cls: "bg-slate-100 text-slate-500" };
}

export default async function AirportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const days = Math.min(Math.max(Number(params?.days ?? 30), 7), 90);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Récupère tous les deals de la période (paginé par 1000).
  const allDeals: { origin: string; created_at: string }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb
      .from("deals")
      .select("origin,created_at")
      .gte("created_at", cutoff)
      .range(offset, offset + 999);
    if (!data?.length) break;
    allDeals.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  // Agrégation : {iata -> {jour -> nb}}.
  const byAirport = new Map<string, Map<string, number>>();
  for (const d of allDeals) {
    const iata = iataFrom(d.origin);
    if (!iata) continue;
    if (!byAirport.has(iata)) byAirport.set(iata, new Map());
    const day = d.created_at.slice(0, 10);
    const m = byAirport.get(iata)!;
    m.set(day, (m.get(day) ?? 0) + 1);
  }

  // Jours du dernier N, pour la mini-vue quotidienne.
  const recentDays: string[] = [];
  for (let i = Math.min(days, 14) - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    recentDays.push(d.toISOString().slice(0, 10));
  }

  // Calcul des stats par aéroport.
  const rows = Object.entries(AIRPORTS).map(([iata, city]) => {
    const perDay = byAirport.get(iata) ?? new Map<string, number>();
    const total = [...perDay.values()].reduce((a, b) => a + b, 0);
    const daysWithDeal = perDay.size;
    const pct = Math.round((daysWithDeal / days) * 100);
    const avg = total > 0 ? (total / days).toFixed(1) : "0";
    return { iata, city, total, daysWithDeal, pct, avg, perDay };
  });

  rows.sort((a, b) => b.pct - a.pct || b.total - a.total);

  const totalDeals = allDeals.length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Couverture aéroports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Deals collectés par aéroport BE/FR — pour décider lesquels ouvrir à l&apos;inscription.
            Les aéroports <span className="font-medium text-slate-700">sur le site</span> sont marqués d&apos;un point bleu.
          </p>
        </div>
        <PeriodSelector days={days} />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        <span className="font-semibold text-slate-800">{totalDeals.toLocaleString("fr-BE")}</span> deals collectés sur {days} jours
        {" "}(depuis tous les aéroports confondus).
      </p>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Aéroport</th>
              <th className="px-4 py-3 text-right">Deals</th>
              <th className="px-4 py-3 text-right">Jours couverts</th>
              <th className="px-4 py-3 text-right">Couverture</th>
              <th className="px-4 py-3 text-right">Moy / jour</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-center text-xs">
                {days <= 14 ? "Deals / jour" : `14 derniers jours`}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ iata, city, total, daysWithDeal, pct, avg, perDay }) => {
              const { label, cls } = statusLabel(pct);
              const onSite = ON_SITE.has(iata);
              const maxDay = Math.max(...recentDays.map((d) => perDay.get(d) ?? 0), 1);
              return (
                <tr key={iata} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span className="flex items-center gap-2">
                      {onSite && (
                        <span className="w-2 h-2 rounded-full bg-brand shrink-0" title="Sur le site" />
                      )}
                      <span>
                        {city}
                        <span className="ml-1.5 text-xs text-slate-400 font-normal">{iata}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{total}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {daysWithDeal}/{days}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">
                    {pct}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{avg}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
                      {label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-end gap-0.5 justify-center h-6">
                      {recentDays.map((day) => {
                        const count = perDay.get(day) ?? 0;
                        const h = count > 0 ? Math.max(Math.round((count / maxDay) * 20), 3) : 1;
                        return (
                          <div
                            key={day}
                            title={`${day} : ${count} deal(s)`}
                            style={{ height: `${h}px` }}
                            className={`w-2 rounded-sm ${count > 0 ? "bg-brand" : "bg-slate-200"}`}
                          />
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
          Fiable = deals 80%+ des jours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          À surveiller = 40-80% des jours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
          Insuffisant = moins de 40% des jours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand inline-block" />
          Point bleu = aéroport actif sur le site
        </span>
      </div>
    </div>
  );
}
