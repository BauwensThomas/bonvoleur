"use client";

import { useMemo, useState } from "react";
import type { AgentRun } from "@/lib/types";
import { agents } from "@/lib/agents";

const statusStyles: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  error: "bg-red-100 text-red-700",
};

// Libellés clairs (le statut "draft" signifie "exécuté mais rien à envoyer/produire").
const statusLabels: Record<string, string> = {
  success: "réussi",
  draft: "rien à faire",
  error: "échec",
};

const PAGE_SIZE = 15;

export default function AgentRunsHistory({ runs }: { runs: AgentRun[] }) {
  const [agent, setAgent] = useState("");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return runs.filter((r) => {
      if (agent && r.agent_name !== agent) return false;
      if (date && !r.started_at.startsWith(date)) return false;
      if (q && !r.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [runs, agent, date, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Tous les agents</option>
          {agents.map((a) => (
            <option key={a.name} value={a.name}>
              {a.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans le résumé..."
          className="flex-1 min-w-50 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {(agent || date || query) && (
          <button
            onClick={() => {
              setAgent("");
              setDate("");
              setQuery("");
              setPage(0);
            }}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {filtered.length} exécution(s)
      </p>


      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Agent</th>
              <th className="px-4 py-2 font-medium">Déclencheur</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Résumé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium">{r.agent_name}</td>
                <td className="px-4 py-2 text-slate-600">{r.trigger}</td>
                <td className="px-4 py-2">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusStyles[r.status] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {statusLabels[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                  {new Date(r.started_at).toLocaleString("fr-BE", { timeZone: "Europe/Brussels" })}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.summary}
                  {r.agent_name === "seo-route" && r.output_ref && (() => {
                    try {
                      const slugs = JSON.parse(r.output_ref) as string[];
                      return (
                        <span className="block text-xs text-red-600 mt-1">
                          {slugs.join(", ")}
                        </span>
                      );
                    } catch { return null; }
                  })()}
                  {r.error && (
                    <span className="block text-xs text-red-600">{r.error}</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-700">
                  Aucune exécution ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-slate-500">
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
