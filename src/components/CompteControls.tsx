"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Filtres + tri + bascule de vue de l'espace membre.
// - Filtre/tri AUTOMATIQUE (pas besoin de cliquer) : la destination est
//   debouncee, le reste s'applique au changement.
// - La vue (cartes / liste) est memorisee dans le navigateur pour les prochaines
//   visites.
export default function CompteControls({
  airports,
}: {
  airports: readonly { iata: string; city: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const qs = sp.toString();

  const tier = sp.get("tier") === "premium" ? "premium" : "free";
  const origin = sp.get("origin") ?? "";
  const maxPrice = sp.get("maxPrice") ?? "";
  const sort = sp.get("sort") ?? "recent";
  const view = sp.get("view") === "list" ? "list" : "grid";

  const [dest, setDest] = useState(sp.get("destination") ?? "");
  const destTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pousse une nouvelle URL en mettant a jour des parametres (vide = supprime).
  function update(changes: Record<string, string>) {
    const p = new URLSearchParams(qs);
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`/compte?${p.toString()}`);
  }

  // Au chargement : applique la vue memorisee si l'URL n'en precise pas.
  useEffect(() => {
    if (!sp.get("view")) {
      const saved = localStorage.getItem("compte_view");
      if (saved === "list" || saved === "grid") update({ view: saved });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setView(v: "grid" | "list") {
    localStorage.setItem("compte_view", v);
    update({ view: v });
  }

  function onDest(value: string) {
    setDest(value);
    if (destTimer.current) clearTimeout(destTimer.current);
    destTimer.current = setTimeout(() => update({ destination: value }), 400);
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Depart</span>
          <select
            value={origin}
            onChange={(e) => update({ origin: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Tous</option>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Destination</span>
          <input
            type="text"
            value={dest}
            onChange={(e) => onDest(e.target.value)}
            placeholder="Ville ou code"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Prix max (EUR)</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => update({ maxPrice: e.target.value })}
            placeholder="ex. 100"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Trier par</span>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="recent">Plus récent</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </label>
        <div className="flex items-end justify-between gap-2">
          <button
            onClick={() => {
              setDest("");
              router.push(`/compte?tier=${tier}&view=${view}`);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-slate-400"
          >
            Réinitialiser
          </button>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            <button
              onClick={() => setView("grid")}
              className={
                view === "grid"
                  ? "bg-brand px-3 py-2 font-medium text-white"
                  : "px-3 py-2 text-slate-600 hover:bg-slate-50"
              }
            >
              Cartes
            </button>
            <button
              onClick={() => setView("list")}
              className={
                view === "list"
                  ? "bg-brand px-3 py-2 font-medium text-white"
                  : "px-3 py-2 text-slate-600 hover:bg-slate-50"
              }
            >
              Liste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
