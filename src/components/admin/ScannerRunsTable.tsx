"use client";

import { useState } from "react";
import type { WorkflowRun } from "@/lib/github-actions";

function badge(run: WorkflowRun) {
  if (run.status !== "completed") return { label: "En cours", cls: "bg-sky-100 text-sky-700" };
  if (run.conclusion === "success") return { label: "Succès", cls: "bg-emerald-100 text-emerald-700" };
  if (run.conclusion === "failure") return { label: "Échec", cls: "bg-red-100 text-red-700" };
  return { label: run.conclusion ?? "?", cls: "bg-slate-100 text-slate-600" };
}

interface LogState {
  loading: boolean;
  text?: string;
  error?: string;
}

export default function ScannerRunsTable({ runs }: { runs: WorkflowRun[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<number, LogState>>({});

  async function toggle(run: WorkflowRun) {
    if (openId === run.id) {
      setOpenId(null);
      return;
    }
    setOpenId(run.id);
    if (!logs[run.id]) {
      setLogs((s) => ({ ...s, [run.id]: { loading: true } }));
      try {
        const res = await fetch(`/api/admin/scanner/log?runId=${run.id}`);
        const data = await res.json();
        setLogs((s) => ({
          ...s,
          [run.id]: res.ok && data.ok
            ? { loading: false, text: data.log }
            : { loading: false, error: data.error ?? "erreur" },
        }));
      } catch {
        setLogs((s) => ({ ...s, [run.id]: { loading: false, error: "échec de l'appel" } }));
      }
    }
  }

  if (runs.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-500">
        Aucune exécution pour le moment.
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Run</th>
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Déclencheur</th>
            <th className="px-4 py-2 font-medium">Statut</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {runs.map((r) => {
            const b = badge(r);
            const open = openId === r.id;
            const log = logs[r.id];
            return (
              <FragmentRow key={r.id}>
                <tr
                  onClick={() => toggle(r)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-2 text-slate-700">
                    <span className="mr-1 inline-block w-3 text-slate-700">
                      {open ? "▾" : "▸"}
                    </span>
                    #{r.runNumber}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(r.createdAt).toLocaleString("fr-BE")}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {r.event === "schedule" ? "Planifié" : "Manuel"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.cls}`}>
                      {b.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={r.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand hover:underline"
                    >
                      GitHub
                    </a>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={5} className="bg-slate-900 px-4 py-3">
                      {log?.loading && (
                        <p className="font-mono text-xs text-slate-300">Chargement du log...</p>
                      )}
                      {log?.error && (
                        <p className="font-mono text-xs text-red-400">Erreur : {log.error}</p>
                      )}
                      {log?.text && (
                        <pre className="max-h-105 overflow-auto whitespace-pre-wrap wrap-break-word font-mono text-xs leading-relaxed text-slate-100">
                          {log.text}
                        </pre>
                      )}
                    </td>
                  </tr>
                )}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Petit wrapper pour grouper deux <tr> sans casser le <tbody>.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
