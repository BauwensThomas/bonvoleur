"use client";

import { useState } from "react";

export interface DestPhoto {
  destIata: string;
  destCity: string;
  image: string | null;
  hasContent: boolean;
}

// Gère les photos de destination du site (bannières route, vignettes accueil,
// cartes deals). Colle une URL d'image (Unsplash ou autre) pour remplacer la
// photo auto. Vide le champ + enregistre pour revenir à l'image de secours.
export default function PhotosManager({
  initial,
  defaultImage,
}: {
  initial: DestPhoto[];
  defaultImage: string;
}) {
  const [items, setItems] = useState<DestPhoto[]>(initial);
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((d) => [d.destIata, d.image ?? ""]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [fallback, setFallback] = useState(defaultImage);
  const [fbBusy, setFbBusy] = useState(false);
  const [query, setQuery] = useState("");

  const shown = items.filter((d) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      d.destCity.toLowerCase().includes(q) ||
      d.destIata.toLowerCase().includes(q)
    );
  });

  async function persistFallback(value: string) {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "default_dest_image", value }),
    });
    return res.ok;
  }

  async function saveFallback() {
    setFbBusy(true);
    setMsg(null);
    const ok = await persistFallback(fallback);
    setFbBusy(false);
    setMsg(ok ? "Image de secours mise à jour." : "Erreur sur l'image de secours.");
  }

  // Téléverse un fichier depuis l'ordinateur -> Supabase Storage -> enregistre.
  async function uploadFallback(file: File) {
    setFbBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.url) {
      setFbBusy(false);
      setMsg(`Erreur téléversement : ${j.error ?? res.status}`);
      return;
    }
    setFallback(j.url);
    const ok = await persistFallback(j.url);
    setFbBusy(false);
    setMsg(ok ? "Image téléversée et enregistrée." : "Téléversée, mais erreur d'enregistrement.");
  }

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

      {/* Image de secours par défaut (modifiable) */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">
          Image de secours (par défaut)
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Affichée quand une destination n&apos;a pas encore de photo. Colle une
          URL (par ex. une image d&apos;avion).
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div
            className="h-12 w-20 shrink-0 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${fallback})` }}
          />
          <input
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="https://..."
            className="min-w-60 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={saveFallback}
            disabled={fbBusy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {fbBusy ? "..." : "Enregistrer"}
          </button>
          <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand">
            Téléverser depuis l&apos;ordi
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={fbBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFallback(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une ville (ou code aéroport)..."
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {shown.map((d) => (
          <div
            key={d.destIata}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className="relative h-28 bg-cover bg-center"
              style={{ backgroundImage: `url(${draft[d.destIata] || fallback})` }}
            >
              {!draft[d.destIata] && (
                <span className="absolute left-2 top-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                  Sans photo
                </span>
              )}
              {!d.hasContent && (
                <span className="absolute right-2 top-2 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                  Sans texte
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-900">
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
