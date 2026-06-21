"use client";

import { useState } from "react";
import Link from "next/link";

interface Origin {
  city: string;
  iata: string;
  routeSlug: string;
}
export interface DestinationCard {
  city: string;
  slug: string;
  image: string | null;
  origins: Origin[];
}

// Grille de destinations sur l'accueil. Clic sur une ville desservie par
// plusieurs aeroports -> petit menu deroulant des departs (sur place, pas de
// nouvelle page). Un seul depart -> lien direct vers la route.
export default function DestinationsGrid({
  destinations,
}: {
  destinations: DestinationCard[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  const Inner = ({ d }: { d: DestinationCard }) => (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={d.image ? { backgroundImage: `url(${d.image})` } : undefined}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
        {d.city}
      </span>
      {d.origins.length > 1 && (
        <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {d.origins.length} départs
        </span>
      )}
    </>
  );

  const base =
    "group relative block aspect-4/3 overflow-hidden rounded-2xl bg-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg";

  return (
    <>
      {/* Clic en dehors -> ferme le menu */}
      {open && (
        <button
          aria-label="Fermer"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(null)}
        />
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {destinations.map((d) => {
          if (d.origins.length <= 1) {
            return (
              <Link
                key={d.slug}
                href={`/vols-pas-chers/${d.origins[0]?.routeSlug ?? ""}`}
                className={base}
              >
                <Inner d={d} />
              </Link>
            );
          }
          return (
            <div key={d.slug} className="relative">
              <button
                type="button"
                onClick={() => setOpen(open === d.slug ? null : d.slug)}
                className={`${base} w-full text-left`}
              >
                <Inner d={d} />
              </button>
              {open === d.slug && (
                <div className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ton aéroport de départ
                  </p>
                  {d.origins.map((o) => (
                    <Link
                      key={o.routeSlug}
                      href={`/vols-pas-chers/${o.routeSlug}`}
                      className="block px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-brand"
                    >
                      {o.city} ({o.iata})
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
