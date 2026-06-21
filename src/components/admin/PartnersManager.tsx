"use client";

import { useMemo, useState } from "react";
import type { Partner } from "@/lib/types";

type Draft = Partial<Partner>;

const empty: Draft = {
  name: "",
  logo: "",
  url: "",
  affiliate_url: "",
  category: "Hébergement",
  description: "",
  is_active: true,
};

const categories = [
  "Hébergement",
  "Location voiture",
  "Activités",
  "Assurance",
  "Autre",
];

export default function PartnersManager({ initial }: { initial: Partner[] }) {
  const [items, setItems] = useState<Partner[]>(initial);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/partners");
    setItems(await res.json());
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  async function save() {
    if (!draft) return;
    const method = draft.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/partners", {
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

  async function toggle(p: Partner) {
    await fetch("/api/admin/partners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    reload();
  }

  async function del(p: Partner) {
    if (!confirm(`Supprimer ${p.name} ?`)) return;
    await fetch(`/api/admin/partners?id=${p.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Partenaires</h1>
        <button
          onClick={() => setDraft({ ...empty })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ajouter un partenaire
        </button>
      </div>
      <p className="mt-1 text-slate-500 text-sm">
        Gère les partenaires affichés sur le site (triés par position).
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou catégorie..."
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pos.</th>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Catégorie</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 text-slate-700">{p.position}</td>
                <td className="px-4 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    {p.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.logo}
                        alt=""
                        className="h-6 w-auto max-w-16 object-contain"
                      />
                    ) : null}
                    {p.name}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">{p.category}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggle(p)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.is_active ? "Actif" : "Inactif"}
                  </button>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-700">
                  Aucun partenaire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">
              {draft.id ? "Modifier" : "Ajouter"} un partenaire
            </h2>
            <div className="mt-4 grid gap-3">
              <Field label="Nom">
                <input
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="in"
                />
              </Field>
              <Field label="URL du logo (optionnel)">
                <input
                  value={draft.logo ?? ""}
                  onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
                  className="in"
                  placeholder="https://.../logo.svg ou .png"
                />
                {draft.logo ? (
                  <span className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    Aperçu :
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.logo}
                      alt=""
                      className="h-7 w-auto rounded border border-slate-200 bg-white object-contain p-0.5"
                    />
                  </span>
                ) : null}
              </Field>
              <Field label="Catégorie">
                <select
                  value={draft.category ?? "Autre"}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  className="in"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="URL du site">
                <input
                  value={draft.url ?? ""}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  className="in"
                />
              </Field>
              <Field label="URL d'affiliation">
                <input
                  value={draft.affiliate_url ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, affiliate_url: e.target.value })
                  }
                  className="in"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  className="in"
                  rows={2}
                />
              </Field>
              <Field label="Position">
                <input
                  type="number"
                  value={draft.position ?? 0}
                  onChange={(e) =>
                    setDraft({ ...draft, position: Number(e.target.value) })
                  }
                  className="in"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_active ?? true}
                  onChange={(e) =>
                    setDraft({ ...draft, is_active: e.target.checked })
                  }
                />
                Actif (affiché sur le site)
              </label>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
