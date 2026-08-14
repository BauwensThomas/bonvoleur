"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { claimPopupSlot } from "@/lib/popupSlot";

const TS_KEY = "app_announce_ts";
const INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 semaine

export default function AppAnnouncePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!site.appPublished) return;

    const last = parseInt(localStorage.getItem(TS_KEY) ?? "0", 10);
    if (Date.now() - last < INTERVAL_MS) return;

    const timer = setTimeout(() => {
      if (!claimPopupSlot()) return;
      setVisible(true);
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    localStorage.setItem(TS_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Bandeau app */}
        <div className="bg-linear-to-r from-sky-500 to-brand px-6 py-4 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">
            Nouveau
          </p>
          <p className="mt-0.5 text-2xl font-extrabold">L&apos;app BonVoleur</p>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5">
          <p className="text-slate-700">
            Reçois les bons plans en notification push, avant même l&apos;email.
            Retrouve aussi tes alertes, tes destinations favorites et ton
            abonnement, directement sur ton téléphone.
          </p>

          {/* CTA */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <a href={site.playStoreUrl} target="_blank" rel="noopener noreferrer" onClick={close}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://play.google.com/intl/fr/badges/static/images/badges/fr_badge_web_generic.png"
                alt="Disponible sur Google Play"
                width={202}
                height={60}
                className="h-15 w-auto"
              />
            </a>
            <button
              onClick={close}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Non merci, peut-être une autre fois
            </button>
          </div>
        </div>

        {/* Bouton fermer */}
        <button
          onClick={close}
          className="absolute right-4 top-4 text-white/80 hover:text-white"
          aria-label="Fermer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
