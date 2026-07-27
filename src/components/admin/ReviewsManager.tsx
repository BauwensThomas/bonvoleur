"use client";

import { useMemo, useState } from "react";
import type { Review, ReviewStatus } from "@/lib/types";

const tabs: { key: ReviewStatus | "all"; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvés" },
  { key: "rejected", label: "Rejetés" },
  { key: "all", label: "Tous" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f59e0b" }}>
      {"★".repeat(rating)}
      <span style={{ color: "#e2e8f0" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewsManager({ initial }: { initial: Review[] }) {
  const [items, setItems] = useState<Review[]>(initial);
  const [tab, setTab] = useState<ReviewStatus | "all">("pending");

  async function reload() {
    const res = await fetch("/api/admin/reviews");
    setItems(await res.json());
  }

  const filtered = useMemo(
    () => (tab === "all" ? items : items.filter((r) => r.status === tab)),
    [items, tab]
  );
  const pendingCount = items.filter((r) => r.status === "pending").length;

  async function setStatus(r: Review, status: ReviewStatus) {
    await fetch("/api/admin/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, status }),
    });
    reload();
  }

  async function del(r: Review) {
    if (!confirm(`Supprimer l'avis de ${r.name} ?`)) return;
    await fetch(`/api/admin/reviews?id=${r.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Avis clients</h1>
      <p className="mt-1 text-slate-500 text-sm">
        Valide les avis avant qu&apos;ils n&apos;apparaissent sur la page d&apos;accueil.
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
          <p className="text-sm text-slate-400">Aucun avis dans cette catégorie.</p>
        )}
        {filtered.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{r.name}</span>
                  <Stars rating={r.rating} />
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString("fr-BE")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.status !== "approved" && (
                  <button
                    onClick={() => setStatus(r, "approved")}
                    className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-200"
                  >
                    Approuver
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(r, "rejected")}
                    className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                  >
                    Rejeter
                  </button>
                )}
                <button
                  onClick={() => del(r)}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
