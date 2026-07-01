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
  if (pct > 0)   return { label: "Insuffisant",  cls: "bg-red-100 text-red-800"   };
  return           { label: "Aucun deal",         cls: "bg-slate-100 text-slate-500" };
}

// --- Source Supabase : historique réel de nos scans ---
async function fromSupabase(cutoff: string): Promise<Map<string, Map<string, number>>> {
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const all: { origin: string; created_at: string }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb
      .from("deals")
      .select("origin,created_at")
      .gte("created_at", cutoff)
      .range(offset, offset + 999);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  const out = new Map<string, Map<string, number>>();
  for (const d of all) {
    const iata = iataFrom(d.origin);
    if (!iata) continue;
    if (!out.has(iata)) out.set(iata, new Map());
    const day = d.created_at.slice(0, 10);
    const m = out.get(iata)!;
    m.set(day, (m.get(day) ?? 0) + 1);
  }
  return out;
}

// --- Source Travelpayouts : cache des prix récents (toutes compagnies sauf Ryanair) ---
async function fromTravelpayouts(cutoff: string): Promise<Map<string, Map<string, number>>> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return new Map();

  const results = await Promise.all(
    Object.keys(AIRPORTS).map(async (iata) => {
      try {
        const res = await fetch(
          `https://api.travelpayouts.com/v2/prices/latest?origin=${iata}&currency=eur&period_type=month&one_way=false&page=1&limit=1000&show_to_affiliates=true&sorting=price&token=${token}`,
          { next: { revalidate: 3600 } }
        );
        const json = await res.json();
        return { iata, data: (json.data ?? []) as { value: number; found_at: string }[] };
      } catch {
        return { iata, data: [] };
      }
    })
  );

  const out = new Map<string, Map<string, number>>();
  for (const { iata, data } of results) {
    const perDay = new Map<string, number>();
    for (const o of data) {
      const found = (o.found_at ?? "").slice(0, 10);
      if (!found || found < cutoff.slice(0, 10)) continue;
      perDay.set(found, (perDay.get(found) ?? 0) + 1);
    }
    out.set(iata, perDay);
  }
  return out;
}

export default async function AirportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const days   = Math.min(Math.max(Number(params?.days ?? 30), 7), 90);
  const source = params?.source === "travelpayouts" ? "travelpayouts" : "supabase";
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const byAirport = source === "travelpayouts"
    ? await fromTravelpayouts(cutoff)
    : await fromSupabase(cutoff);

  // Jours récents pour le mini-graphe.
  const recentDays: string[] = [];
  for (let i = Math.min(days, 14) - 1; i >= 0; i--) {
    recentDays.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  }

  const rows = Object.entries(AIRPORTS).map(([iata, city]) => {
    const perDay     = byAirport.get(iata) ?? new Map<string, number>();
    const total      = [...perDay.values()].reduce((a, b) => a + b, 0);
    const daysWithDeal = perDay.size;
    const pct        = Math.round((daysWithDeal / days) * 100);
    const avg        = total > 0 ? (total / days).toFixed(1) : "0";
    return { iata, city, total, daysWithDeal, pct, avg, perDay };
  });
  rows.sort((a, b) => b.pct - a.pct || b.total - a.total);

  const totalDeals = [...byAirport.values()].reduce(
    (sum, m) => sum + [...m.values()].reduce((a, b) => a + b, 0),
    0
  );

  const sourceLabel = source === "travelpayouts"
    ? "Cache Travelpayouts (toutes compagnies sauf Ryanair)"
    : "Historique réel de nos scans (Supabase)";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Couverture aéroports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Deals par aéroport BE/FR pour décider lesquels ouvrir à l&apos;inscription.
            Point bleu = actif sur le site.
          </p>
        </div>
        <PeriodSelector days={days} source={source} />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        <span className="font-semibold text-slate-800">{totalDeals.toLocaleString("fr-BE")}</span> deals
        {" "}sur {days} jours — <span className="italic">{sourceLabel}</span>.
        {source === "supabase" && (
          <span className="block mt-0.5 text-xs text-amber-700">
            Les nouveaux aéroports sont scannés depuis le 01/07/2026 seulement — les données s&apos;accumulent au fil des jours.
          </span>
        )}
        {source === "travelpayouts" && (
          <span className="block mt-0.5 text-xs text-slate-400">
            Estimation basée sur le cache Travelpayouts. Ne couvre pas Ryanair. Pour l&apos;historique réel, utilise la source Supabase.
          </span>
        )}
      </p>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">Aéroport</th>
              <th className="px-4 py-3 text-right">Offres</th>
              <th className="px-4 py-3 text-right">Jours couverts</th>
              <th className="px-4 py-3 text-right">Couverture</th>
              <th className="px-4 py-3 text-right">Moy / jour</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-center text-xs">14 derniers jours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ iata, city, total, daysWithDeal, pct, avg, perDay }) => {
              const { label, cls } = statusLabel(pct);
              const onSite  = ON_SITE.has(iata);
              const maxDay  = Math.max(...recentDays.map((d) => perDay.get(d) ?? 0), 1);
              return (
                <tr key={iata} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span className="flex items-center gap-2">
                      {onSite && <span className="w-2 h-2 rounded-full bg-brand shrink-0" title="Sur le site" />}
                      <span>
                        {city}
                        <span className="ml-1.5 text-xs text-slate-400 font-normal">{iata}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{total}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{daysWithDeal}/{days}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">{pct}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{avg}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-end gap-0.5 justify-center h-6">
                      {recentDays.map((day) => {
                        const count = perDay.get(day) ?? 0;
                        const h = count > 0 ? Math.max(Math.round((count / maxDay) * 20), 3) : 1;
                        return (
                          <div
                            key={day}
                            title={`${day} : ${count} offre(s)`}
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
          Fiable = 80%+ des jours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          À surveiller = 40-80% des jours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
          Insuffisant = moins de 40% des jours
        </span>
      </div>
    </div>
  );
}
