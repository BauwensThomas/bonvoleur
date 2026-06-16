"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getConsent,
  setConsent,
  OPEN_SETTINGS_EVENT,
} from "@/lib/consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // N'affiche le bandeau que si aucun choix n'a encore été fait.
    if (getConsent() === null) setVisible(true);

    // Permet de rouvrir le bandeau depuis le footer ("Gérer les cookies").
    const reopen = () => setVisible(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (!visible) return null;

  const choose = (choice: "accepted" | "refused") => {
    setConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white shadow-lg"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          On utilise des cookies pour mesurer l&apos;audience et afficher de la
          publicité. Tu peux accepter ou refuser. En savoir plus dans notre{" "}
          <Link href="/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => choose("refused")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:border-slate-400"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}
