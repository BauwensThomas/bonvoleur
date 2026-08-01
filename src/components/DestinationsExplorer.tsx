"use client";

import { useMemo, useState } from "react";
import DestinationsGrid, { type DestinationCard } from "./DestinationsGrid";
import { REGION_ORDER as REGIONS } from "@/lib/destinations";

export type ExplorerDestination = DestinationCard & { region: string };

// Ordre des filtres = ordre partagé des régions, puis "Autre" en dernier.
const REGION_ORDER: string[] = [...REGIONS, "Autre"];

// Recherche + filtre par région au-dessus de la grille de destinations.
export default function DestinationsExplorer({
  destinations,
  adsEnabled,
}: {
  destinations: ExplorerDestination[];
  adsEnabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("Toutes");

  const regions = useMemo(() => {
    const present = new Set(destinations.map((d) => d.region));
    return ["Toutes", ...REGION_ORDER.filter((r) => present.has(r))];
  }, [destinations]);

  const filtered = useMemo(() => {
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const query = norm(q.trim());
    return destinations.filter(
      (d) =>
        (region === "Toutes" || d.region === region) &&
        (!query || norm(d.city).includes(query))
    );
  }, [destinations, q, region]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une ville..."
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => {
            const on = region === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  on
                    ? "bg-brand text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-brand/40 hover:text-brand"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {filtered.length} destination{filtered.length > 1 ? "s" : ""}
      </p>

      <div className="mt-6">
        {filtered.length > 0 ? (
          <DestinationsGrid destinations={filtered} adsEnabled={adsEnabled} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Aucune destination ne correspond à ta recherche.
          </p>
        )}
      </div>
    </div>
  );
}
