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

const base =
  "group relative block aspect-4/3 overflow-hidden rounded-2xl bg-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg";

// Grille de destinations. Clic sur une ville desservie par plusieurs aeroports
// -> l'image s'assombrit et les aeroports apparaissent DANS la carte.
// Un seul depart -> lien direct vers la route.
export default function DestinationsGrid({
  destinations,
}: {
  destinations: DestinationCard[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  const Photo = ({ d }: { d: DestinationCard }) => (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={d.image ? { backgroundImage: `url(${d.image})` } : undefined}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
    </>
  );

  return (
    <>
      {/* Clic en dehors -> ferme */}
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
                <Photo d={d} />
                <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
                  {d.city}
                </span>
              </Link>
            );
          }

          const isOpen = open === d.slug;
          return (
            <div key={d.slug} className={`${base} ${isOpen ? "z-20" : ""}`}>
              <Photo d={d} />

              {/* Etat fermé : nom + badge, toute la carte ouvre le menu */}
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : d.slug)}
                aria-expanded={isOpen}
                aria-label={`Aéroports de départ vers ${d.city}`}
                className="absolute inset-0"
              >
                <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
                  {d.city}
                </span>
                <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {d.origins.length} départs
                </span>
              </button>

              {/* Etat ouvert : voile foncé + aéroports DANS la carte */}
              {isOpen && (
                <div
                  onClick={() => setOpen(null)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-3 text-center backdrop-blur-[1px]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                    {d.city} · départ
                  </p>
                  {d.origins.map((o) => (
                    <Link
                      key={o.routeSlug}
                      href={`/vols-pas-chers/${o.routeSlug}`}
                      className="rounded-full bg-white/95 px-4 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-white hover:text-brand"
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
