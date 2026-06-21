"use client";

import { useState } from "react";
import Link from "next/link";
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
  const [active, setActive] = useState(airports[0]?.originIata ?? "");
  const a = airports.find((x) => x.originIata === active) ?? airports[0];
  if (!a) return null;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">Bons plans vers {destCity}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choisis ton aéroport de départ.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {airports.map((x) => {
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
            <strong>{a.weekCount}</strong> bon{a.weekCount > 1 ? "s" : ""} plan
            {a.weekCount > 1 ? "s" : ""} {a.originCity} - {destCity} cette
            semaine, réservé{a.weekCount > 1 ? "s" : ""} aux inscrits.
          </p>
          <Link
            href="/#inscription"
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Recevoir les bons plans
          </Link>
        </div>
      )}

      {a.past.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-slate-500">
            Ce qu&apos;on a déniché récemment depuis {a.originCity}. Les offres
            en cours sont réservées aux inscrits.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {a.past.map((d, i) => (
              <DealCard
                key={`${d.origin}-${i}`}
                origin={d.origin}
                destination={d.destination}
                price={d.price}
                normal_price={d.normal_price}
                dates={d.dates}
                airline={d.airline}
                postedAt={d.postedAt}
                image={destImage}
              />
            ))}
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
