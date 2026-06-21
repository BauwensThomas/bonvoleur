"use client";

import { useMemo, useState } from "react";
import type { Subscriber } from "@/lib/types";

export default function SubscribersManager({
  initial,
}: {
  initial: Subscriber[];
}) {
  const [items, setItems] = useState<Subscriber[]>(initial);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.home_airports ?? []).some((a) => a.toLowerCase().includes(q))
    );
  }, [items, search]);

  const premium = items.filter((s) => s.tier === "premium").length;

  async function del(s: Subscriber) {
    if (!confirm(`Supprimer ${s.email} ?`)) return;
    const res = await fetch(`/api/admin/subscribers?id=${s.id}`, {
      method: "DELETE",
    });
    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== s.id));
    else alert("Suppression impossible.");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abonnés</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} inscrits · {premium} premium
          </p>
        </div>
        <a
          href="/api/admin/subscribers/export"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Exporter en CSV
        </a>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par email ou aéroport..."
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Aéroports</th>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Inscrit le</th>
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
                <td className="px-4 py-2 text-slate-500">
                  {new Date(s.created_at).toLocaleDateString("fr-BE")}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => del(s)}
                    title="Supprimer"
                    aria-label="Supprimer"
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-700">
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
