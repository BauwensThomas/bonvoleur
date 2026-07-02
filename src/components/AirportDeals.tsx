"use client";

import { useState } from "react";

export interface AirportProof {
  originCity: string;
  originIata: string;
  weekCount: number;
}

// Sélecteur d'aéroport de départ (onglets) + preuve sociale / teaser de l'aéroport
// choisi, sur une page destination.
export default function AirportDeals({
  airports,
  destCity,
  destImage,
  isMember = false,
  ctaHref = "/#inscription",
}: {
  airports: AirportProof[];
  destCity: string;
  destImage?: string | null;
  isMember?: boolean;
  ctaHref?: string;
}) {
  // On n'affiche QUE les aéroports qui ont un bon plan en cours.
  const hasDeals = (x: AirportProof) => x.weekCount > 0;
  const ordered = airports
    .filter(hasDeals)
    .filter((x, i, arr) => arr.findIndex((a) => a.originIata === x.originIata) === i);
  const [active, setActive] = useState(ordered[0]?.originIata ?? "");
  const a = ordered.find((x) => x.originIata === active) ?? ordered[0];

  // Aucun aéroport n'a de bon plan pour cette destination : un seul message.
  if (!a) {
    return (
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Bons plans vers {destCity}</h2>
        <p className="mt-3 rounded-2xl border border-brand/30 bg-brand/5 p-6 text-slate-700">
          On surveille les vols vers {destCity} depuis la Belgique et la France.{" "}
          <a href={ctaHref} className="font-semibold text-brand hover:underline">
            {isMember ? "Voir mon espace membre" : "Inscris-toi gratuitement"}
          </a>{" "}
          pour être prévenu dès qu&apos;un bon plan tombe.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">Bons plans vers {destCity}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choisis ton aéroport de départ.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ordered.map((x) => {
          const on = x.originIata === active;
          return (
            <button
              key={x.originIata}
              type="button"
              onClick={() => setActive(x.originIata)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                on
                  ? "bg-brand text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-brand/40 hover:text-brand"
              }`}
            >
              {x.originCity} ({x.originIata})
            </button>
          );
        })}
      </div>

      {a.weekCount > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
          <p className="text-sm text-slate-700">
            <strong>Un bon plan</strong> {a.originCity} - {destCity} en ce
            moment, réservé aux inscrits.
          </p>
          <a
            href={ctaHref}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {isMember ? "Voir le bon plan" : "Recevoir les bons plans"}
          </a>
        </div>
      )}

    </section>
  );
}
