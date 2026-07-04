"use client";

import { useMemo, useState } from "react";
import type { Subscriber } from "@/lib/types";

type SortKey = "created_at" | "email" | "tier";
type SortDir = "asc" | "desc";

export default function SubscribersManager({
  initial,
}: {
  initial: Subscriber[];
}) {
  const [items, setItems] = useState<Subscriber[]>(initial);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "premium" | "free">("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const premium = items.filter((s) => s.tier === "premium").length;
  const freemium = items.length - premium;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items
      .filter((s) => {
        if (tierFilter === "premium" && s.tier !== "premium") return false;
        if (tierFilter === "free" && s.tier === "premium") return false;
        if (!q) return true;
        return (
          s.email.toLowerCase().includes(q) ||
          (s.home_airports ?? []).some((a) => a.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "email") cmp = a.email.localeCompare(b.email);
        else if (sortKey === "tier") cmp = (a.tier ?? "").localeCompare(b.tier ?? "");
        else cmp = a.created_at.localeCompare(b.created_at);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [items, search, tierFilter, sortKey, sortDir]);

  async function del(s: Subscriber) {
    if (!confirm(`Supprimer ${s.email} ?`)) return;
    const res = await fetch(`/api/admin/subscribers?id=${s.id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== s.id));
    else alert("Suppression impossible.");
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abonnés</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} inscrits · {premium} premium · {freemium} freemium
          </p>
        </div>
        <a
          href="/api/admin/subscribers/export"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Exporter en CSV
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email ou aéroport..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {(["all", "premium", "free"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded-md px-3 py-1 font-medium transition ${
                tierFilter === t
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t === "all" ? `Tous (${items.length})` : t === "premium" ? `Premium (${premium})` : `Freemium (${freemium})`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th
                className="cursor-pointer px-4 py-2 font-medium hover:text-slate-800"
                onClick={() => handleSort("email")}
              >
                Email <SortIcon col="email" />
              </th>
              <th className="px-4 py-2 font-medium">Aéroports</th>
              <th
                className="cursor-pointer px-4 py-2 font-medium hover:text-slate-800"
                onClick={() => handleSort("tier")}
              >
                Tier <SortIcon col="tier" />
              </th>
              <th className="px-4 py-2 font-medium">Abonnement</th>
              <th
                className="cursor-pointer px-4 py-2 font-medium hover:text-slate-800"
                onClick={() => handleSort("created_at")}
              >
                Inscrit le <SortIcon col="created_at" />
              </th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr key={s.id} className={s.unsubscribed_at ? "opacity-50" : ""}>
                <td className="px-4 py-2 font-medium">
                  {s.email}
                  {s.unsubscribed_at && (
                    <span className="ml-2 text-xs text-red-500">désinscrit</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {s.home_airports?.length ? s.home_airports.join(", ") : "-"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.tier === "premium"
                        ? "bg-brand/10 text-brand-dark"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {s.tier === "premium" ? "Premium" : "Gratuit"}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {s.tier === "premium" && s.premium_until ? (
                    <span className={s.premium_cancel_at_period_end ? "text-amber-700" : ""}>
                      {s.premium_cancel_at_period_end ? "résilié, fin le " : "renouv. auto le "}
                      {new Date(s.premium_until).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}
                      {s.premium_interval
                        ? ` (${s.premium_interval === "year" ? "annuel" : "mensuel"})`
                        : ""}
                    </span>
                  ) : "-"}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(s.created_at).toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels" })}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => del(s)}
                    title="Supprimer"
                    aria-label="Supprimer"
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-700">
                  Aucun abonné.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
