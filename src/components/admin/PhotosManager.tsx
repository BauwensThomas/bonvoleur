"use client";

import { useState } from "react";

export interface PhotoSlot {
  url: string | null;
  credit: string;
  sizeKb: number | null;
}

export interface DestPhoto {
  destIata: string;
  destCity: string;
  cover: PhotoSlot;
  gallery: (PhotoSlot | null)[];
  hasContent: boolean;
}

export default function PhotosManager({
  initial,
  defaultImage,
}: {
  initial: DestPhoto[];
  defaultImage: string;
}) {
  const [items, setItems] = useState<DestPhoto[]>(initial);
  const [editing, setEditing] = useState<{ iata: string; slot: number } | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftCredit, setDraftCredit] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fallback, setFallback] = useState(defaultImage);
  const [fbBusy, setFbBusy] = useState(false);
  const [query, setQuery] = useState("");

  const shown = items.filter((d) => {
    const q = query.trim().toLowerCase();
    return !q || d.destCity.toLowerCase().includes(q) || d.destIata.toLowerCase().includes(q);
  });

  function selectSlot(iata: string, slot: number, currentUrl: string | null, currentCredit: string) {
    if (editing?.iata === iata && editing?.slot === slot) {
      setEditing(null);
    } else {
      setEditing({ iata, slot });
      setDraftUrl(currentUrl ?? "");
      setDraftCredit(currentCredit);
    }
  }

  function buildCredit(raw: string): string {
    const c = raw.trim();
    if (!c) return "";
    if (c.toLowerCase().includes("unsplash")) return c;
    return `${c} / Unsplash`;
  }

  async function rehostIfNeeded(url: string, destCity: string, slot: number): Promise<string> {
    if (!url || url.includes("/storage/v1/object/public/photos/")) return url;
    const res = await fetch("/api/admin/rehost-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, dest_city: destCity, slot }),
    });
    const j = await res.json().catch(() => ({}));
    return j.url ?? url;
  }

  async function saveSlot() {
    if (!editing) return;
    setBusy(true);
    setMsg(null);
    const credit = buildCredit(draftCredit);
    const item = items.find((d) => d.destIata === editing.iata);
    if (!item) { setBusy(false); return; }
    const finalUrl = draftUrl ? await rehostIfNeeded(draftUrl, item.destCity, editing.slot) : "";

    if (editing.slot === 0) {
      const res = await fetch("/api/admin/routes-image", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_iata: editing.iata, image_url: finalUrl || null, image_credit: credit || null }),
      });
      setBusy(false);
      if (res.ok) {
        setItems((prev) =>
          prev.map((d) =>
            d.destIata === editing.iata
              ? { ...d, cover: { ...d.cover, url: finalUrl || null, credit, sizeKb: null } }
              : d
          )
        );
        setMsg(`Bannière ${editing.iata} mise à jour.`);
        setEditing(null);
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(`Erreur : ${j.error ?? res.status}`);
      }
    } else {
      const idx = editing.slot - 1;
      const newGallery = [...item.gallery];
      newGallery[idx] = finalUrl
        ? { url: finalUrl, credit: credit || newGallery[idx]?.credit || "", sizeKb: null }
        : null;
      const photos = newGallery
        .filter((p): p is PhotoSlot => p !== null && p.url !== null)
        .map((p) => ({ url: p.url!, credit: p.credit }));
      const res = await fetch("/api/admin/routes-photos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_iata: editing.iata, photos }),
      });
      setBusy(false);
      if (res.ok) {
        setItems((prev) =>
          prev.map((d) =>
            d.destIata === editing.iata ? { ...d, gallery: newGallery } : d
          )
        );
        setMsg(`Galerie ${editing.iata} mise à jour.`);
        setEditing(null);
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(`Erreur : ${j.error ?? res.status}`);
      }
    }
  }

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

  return (
    <div>
      {msg && (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{msg}</p>
      )}

      {/* Image de secours */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">Image de secours (par défaut)</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Affichée quand une destination n&apos;a pas encore de photo.
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
            Téléverser
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
        placeholder="Rechercher une ville ou code IATA..."
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-col gap-3">
        {shown.map((d) => {
          const isEditingThis = editing?.iata === d.destIata;
          const slots = [
            { label: "Bannière", slot: 0, photo: d.cover },
            { label: "Galerie 1", slot: 1, photo: d.gallery[0] },
            { label: "Galerie 2", slot: 2, photo: d.gallery[1] },
            { label: "Galerie 3", slot: 3, photo: d.gallery[2] },
            { label: "Galerie 4", slot: 4, photo: d.gallery[3] },
          ] as const;

          return (
            <div
              key={d.destIata}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
                <span className="font-semibold text-slate-900">{d.destCity}</span>
                <span className="text-xs text-slate-400">{d.destIata}</span>
                {!d.hasContent && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                    Sans texte
                  </span>
                )}
                {!d.cover.url && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                    Sans photo
                  </span>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2 p-3 pb-0">
                {slots.map(({ label, slot, photo }) => {
                  const isActive = isEditingThis && editing?.slot === slot;
                  const imgUrl = photo?.url ?? (slot === 0 ? fallback : null);
                  return (
                    <button
                      key={slot}
                      onClick={() => selectSlot(d.destIata, slot, photo?.url ?? null, photo?.credit ?? "")}
                      className={`group w-full text-left ${isActive ? "opacity-100" : "opacity-90 hover:opacity-100"}`}
                    >
                      <div
                        className={`aspect-video w-full rounded-lg bg-cover bg-center bg-slate-100 transition ${
                          isActive ? "ring-2 ring-brand ring-offset-1" : "group-hover:ring-2 group-hover:ring-slate-300"
                        }`}
                        style={imgUrl ? { backgroundImage: `url(${imgUrl})` } : undefined}
                      >
                        {!imgUrl && (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            Vide
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
                      <p className="text-[11px] font-medium text-slate-700">
                        {photo?.sizeKb != null ? `${photo.sizeKb} KB` : "-"}
                      </p>
                    </button>
                  );
                })}
              </div>

              {isEditingThis && (
                <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Modifier :{" "}
                    <strong>
                      {slots.find((s) => s.slot === editing?.slot)?.label}
                    </strong>
                  </span>
                  <input
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    placeholder="URL de la photo (https://...) ou vide pour supprimer"
                    className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    autoFocus
                  />
                  <input
                    value={draftCredit}
                    onChange={(e) => setDraftCredit(e.target.value)}
                    placeholder="Nom du photographe (/ Unsplash ajouté auto)"
                    className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={saveSlot}
                    disabled={busy}
                    className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {busy ? "..." : "Enregistrer"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-slate-300"
                  >
                    Annuler
                  </button>
                </div>
              )}
              {!isEditingThis && <div className="pb-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
