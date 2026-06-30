"use client";

import { useState } from "react";
import DealCard from "./DealCard";

interface PastDeal {
  origin: string;
  destination: string;
  price: number;
  normal_price: number | null;
  dates: string;
  airline: string | null;
  postedAt: string;
}
export interface AirportProof {
  originCity: string;
  originIata: string;
  past: PastDeal[];
  weekCount: number;
}

// Sélecteur d'aéroport de départ (onglets) + preuve sociale / teaser de l'aéroport
// choisi, sur une page destination.
export default function AirportDeals({
  airports,
  destCity,
  destImage,
}: {
  airports: AirportProof[];
  destCity: string;
  destImage?: string | null;
}) {
  // On n'affiche QUE les aéroports qui ont un bon plan (en cours ou historique).
  // Les aéroports sans rien sont masqués (pas de vue vide / "pas encore de bon plan").
  const hasDeals = (x: AirportProof) => x.past.length > 0 || x.weekCount > 0;
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
          <a href="/#inscription" className="font-semibold text-brand hover:underline">
            Inscris-toi gratuitement
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
            href="/#inscription"
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Recevoir les bons plans
          </a>
        </div>
      )}

      {a.past.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-slate-500">
            Ce qu&apos;on a déniché récemment depuis {a.originCity}. Les offres
            en cours sont réservées aux inscrits.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Première card : visible, sans image */}
            <DealCard
              origin={a.past[0].origin}
              destination={a.past[0].destination}
              price={a.past[0].price}
              normal_price={a.past[0].normal_price}
              dates={a.past[0].dates}
              airline={a.past[0].airline}
              postedAt={a.past[0].postedAt}
              image={null}
            />
            {/* Reste : flouté avec CTA inscription (3 colonnes) */}
            {a.past.length > 1 && (
              <div className="relative sm:col-span-1 lg:col-span-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pointer-events-none select-none blur-sm opacity-60">
                  {a.past.slice(1, 4).map((d, i) => (
                    <DealCard
                      key={i}
                      origin={d.origin}
                      destination={d.destination}
                      price={d.price}
                      normal_price={d.normal_price}
                      dates={d.dates}
                      airline={d.airline}
                      postedAt={d.postedAt}
                      image={null}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-xs">
                  <p className="text-center font-semibold text-slate-800">
                    +{a.past.length - 1} bon{a.past.length > 2 ? "s plans" : " plan"} récent{a.past.length > 2 ? "s" : ""}
                  </p>
                  <a
                    href="/#inscription"
                    className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    S&apos;inscrire gratuitement →
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      ) : a.weekCount === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
          {`Pas encore de bon plan ${a.originCity} - ${destCity} à afficher. Inscris-toi pour les recevoir par email dès qu'on en déniche.`}
        </p>
      ) : null}
    </section>
  );
}
