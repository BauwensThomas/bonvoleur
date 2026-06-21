"use client";

import { useState } from "react";

export interface DestPhoto {
  destIata: string;
  destCity: string;
  image: string | null;
}

// Gère les photos de destination du site (bannières route, vignettes accueil,
// cartes deals). Colle une URL d'image (Unsplash ou autre) pour remplacer la
// photo auto. Vide le champ + enregistre pour revenir au dégradé.
export default function PhotosManager({ initial }: { initial: DestPhoto[] }) {
  const [items, setItems] = useState<DestPhoto[]>(initial);
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((d) => [d.destIata, d.image ?? ""]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(destIata: string) {
    setBusy(destIata);
    setMsg(null);
    const res = await fetch("/api/admin/routes-image", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination_iata: destIata, image_url: draft[destIata] || null }),
    });
    setBusy(null);
    if (res.ok) {
      setItems((prev) =>
        prev.map((d) =>
          d.destIata === destIata ? { ...d, image: draft[destIata] || null } : d
        )
      );
      setMsg(`Photo mise à jour (${destIata}).`);
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(`Erreur ${destIata} : ${j.error ?? res.status}`);
    }
  }

  return (
    <div>
      {msg && (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {msg}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <div
            key={d.destIata}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className="h-32 bg-linear-to-br from-brand-dark to-brand bg-cover bg-center"
              style={
                draft[d.destIata]
                  ? { backgroundImage: `url(${draft[d.destIata]})` }
                  : undefined
              }
            />
            <div className="p-4">
              <p className="font-semibold text-slate-900">
                {d.destCity}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({d.destIata})
                </span>
              </p>
              <input
                value={draft[d.destIata] ?? ""}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, [d.destIata]: e.target.value }))
                }
                placeholder="URL de l'image (https://...)"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => save(d.destIata)}
                disabled={busy === d.destIata}
                className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {busy === d.destIata ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
