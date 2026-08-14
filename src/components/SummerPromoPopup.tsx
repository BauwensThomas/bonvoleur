"use client";

import { useEffect, useState } from "react";
import { claimPopupSlot } from "@/lib/popupSlot";

const TS_KEY = "promo_ete2026_ts";
const PROMO_CODE = "ETE2026";
const EXPIRY = new Date("2026-09-01");
const INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours

export default function SummerPromoPopup() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (new Date() >= EXPIRY) return;

    // Verifie si on a deja affiche dans les 3 derniers jours.
    const last = parseInt(localStorage.getItem(TS_KEY) ?? "0", 10);
    if (Date.now() - last < INTERVAL_MS) return;

    const reveal = () => {
      if (!claimPopupSlot()) return;
      setVisible(true);
    };

    // Verifie cote serveur si l'utilisateur est deja premium (seul cas exclu).
    fetch("/api/me")
      .then((r) => r.json())
      .then(({ tier }: { tier: string }) => {
        if (tier === "premium") return;
        setTimeout(reveal, 2500);
      })
      .catch(() => {
        // En cas d'erreur reseau, on affiche quand meme.
        setTimeout(reveal, 2500);
      });
  }, []);

  function close() {
    localStorage.setItem(TS_KEY, String(Date.now()));
    setVisible(false);
  }

  function goToPremium() {
    localStorage.setItem("promo_code_pending", PROMO_CODE);
    close();
  }

  function copy() {
    navigator.clipboard.writeText(PROMO_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Bandeau ete */}
        <div className="bg-linear-to-r from-amber-400 to-orange-500 px-6 py-4 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">
            Offre ete - jusqu'au 31 aout
          </p>
          <p className="mt-0.5 text-2xl font-extrabold">-15% sur le premium</p>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5">
          <p className="text-slate-700">
            Recois les bons plans en temps reel, sans limite. Profite de la
            remise avec le code :
          </p>

          {/* Code promo */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3">
            <span className="flex-1 text-center font-mono text-2xl font-extrabold tracking-widest text-amber-700">
              {PROMO_CODE}
            </span>
            <button
              onClick={copy}
              className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-500 active:scale-95"
            >
              {copied ? "Copie !" : "Copier"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            -15% sur ton 1er mois (mensuel) ou ta 1re annee (annuel) - puis prix habituel
          </p>

          {/* CTA */}
          <div className="mt-5 flex flex-col gap-2">
            <a
              href="/compte"
              onClick={goToPremium}
              className="block rounded-xl bg-brand py-3 text-center font-semibold text-white transition hover:bg-brand-dark"
            >
              Passer premium avec le code
            </a>
            <button
              onClick={close}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Non merci, peut-etre une autre fois
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
