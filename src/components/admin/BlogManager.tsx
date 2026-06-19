"use client";

import { useState } from "react";
import type { Post } from "@/lib/types";

type Draft = Partial<Post>;
const empty: Draft = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  meta_title: "",
  meta_description: "",
  status: "draft",
};

export default function BlogManager({ initial }: { initial: Post[] }) {
  const [items, setItems] = useState<Post[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/posts");
    setItems(await res.json());
  }

  async function save() {
    if (!draft) return;
    const method = draft.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/posts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDraft(null);
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Erreur");
    }
  }

  async function del(p: Post) {
    if (!confirm("Supprimer cet article ?")) return;
    await fetch(`/api/admin/posts?id=${p.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog</h1>
        <button
          onClick={() => setDraft({ ...empty })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Nouvel article
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Titre</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.title}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.status === "published" ? "Publié" : "Brouillon"}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                  {p.published_at || p.created_at
                    ? new Date(
                        p.published_at ?? p.created_at
                      ).toLocaleDateString("fr-BE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button
                    onClick={() => setDraft(p)}
                    className="text-brand hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => del(p)}
                    className="text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-700">
                  Aucun article.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">
              {draft.id ? "Modifier" : "Nouvel"} article
            </h2>
            <div className="mt-4 grid gap-3">
              <L label="Titre">
                <input
                  className="in"
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </L>
              <L label="Slug (laisser vide = auto)">
                <input
                  className="in"
                  value={draft.slug ?? ""}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                />
              </L>
              <L label="Résumé (excerpt)">
                <textarea
                  className="in"
                  rows={2}
                  value={draft.excerpt ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, excerpt: e.target.value })
                  }
                />
              </L>
              <L label="Contenu">
                <textarea
                  className="in font-mono"
                  rows={10}
                  value={draft.content ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                />
              </L>
              <L label="Meta title (SEO)">
                <input
                  className="in"
                  value={draft.meta_title ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, meta_title: e.target.value })
                  }
                />
              </L>
              <L label="Meta description (SEO)">
                <textarea
                  className="in"
                  rows={2}
                  value={draft.meta_description ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, meta_description: e.target.value })
                  }
                />
              </L>
              <L label="Statut">
                <select
                  className="in"
                  value={draft.status ?? "draft"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as Post["status"],
                    })
                  }
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                </select>
              </L>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .in {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
