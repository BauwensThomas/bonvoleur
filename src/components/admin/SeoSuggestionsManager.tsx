"use client";

import { useMemo, useState } from "react";
import type { SeoSuggestion, SeoSuggestionStatus } from "@/lib/types";

const tabs: { key: SeoSuggestionStatus | "all"; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvées" },
  { key: "rejected", label: "Rejetées" },
  { key: "all", label: "Toutes" },
];

const TYPE_LABELS: Record<string, string> = {
  title: "Titre",
  meta_description: "Meta description",
  internal_links: "Liens internes",
  content: "Contenu",
};

export default function SeoSuggestionsManager({ initial }: { initial: SeoSuggestion[] }) {
  const [items, setItems] = useState<SeoSuggestion[]>(initial);
  const [tab, setTab] = useState<SeoSuggestionStatus | "all">("pending");

  async function reload() {
    const res = await fetch("/api/admin/seo-suggestions");
    setItems(await res.json());
  }

  const filtered = useMemo(
    () => (tab === "all" ? items : items.filter((s) => s.status === tab)),
    [items, tab]
  );
  const pendingCount = items.filter((s) => s.status === "pending").length;

  async function setStatus(s: SeoSuggestion, status: SeoSuggestionStatus) {
    await fetch("/api/admin/seo-suggestions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, status }),
    });
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Suggestions SEO</h1>
      <p className="mt-1 text-slate-500 text-sm">
        Propositions générées par l&apos;agent SEO à partir des données Search Console. Rien n&apos;est
        jamais appliqué au site sans validation ici.
      </p>

      <div className="mt-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.key
                ? "bg-brand text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">Aucune suggestion dans cette catégorie.</p>
        )}
        {filtered.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {TYPE_LABELS[s.suggestion_type] ?? s.suggestion_type}
                  </span>
                  <a
                    href={s.page}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs text-brand hover:underline"
                  >
                    {s.page}
                  </a>
                </div>

                {s.current_value && (
                  <p className="mt-2 text-sm text-slate-400 line-through">{s.current_value}</p>
                )}
                <p className="mt-1 text-sm font-medium text-slate-800">{s.proposed_value}</p>
                {s.reason && <p className="mt-2 text-xs text-slate-500">{s.reason}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  Détecté le {new Date(s.detected_at).toLocaleDateString("fr-BE")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {s.status !== "approved" && (
                  <button
                    onClick={() => setStatus(s, "approved")}
                    className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-200"
                  >
                    Valider
                  </button>
                )}
                {s.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(s, "rejected")}
                    className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                  >
                    Rejeter
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
