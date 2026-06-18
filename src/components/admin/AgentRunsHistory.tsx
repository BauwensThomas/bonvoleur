"use client";

import { useMemo, useState } from "react";
import type { AgentRun } from "@/lib/types";
import { agents } from "@/lib/agents";

const statusStyles: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

export default function AgentRunsHistory({ runs }: { runs: AgentRun[] }) {
  const [agent, setAgent] = useState("");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return runs.filter((r) => {
      if (agent && r.agent_name !== agent) return false;
      if (date && !r.started_at.startsWith(date)) return false;
      if (q && !r.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [runs, agent, date, query]);

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
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {(agent || date || query) && (
          <button
            onClick={() => {
              setAgent("");
              setDate("");
              setQuery("");
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

      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
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
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium">{r.agent_name}</td>
                <td className="px-4 py-2 text-slate-600">{r.trigger}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusStyles[r.status] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                  {new Date(r.started_at).toLocaleString("fr-BE")}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.summary}
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
    </div>
  );
}
