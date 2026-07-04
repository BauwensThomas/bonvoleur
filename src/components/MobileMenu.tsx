"use client";

import { useState } from "react";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";

// Menu hamburger affiché uniquement sur mobile (< sm). En desktop, le Header
// montre la nav classique. Le panneau se déploie sous la barre du Header.
export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* Cliquer à côté ferme le menu. */}
          <div
            onClick={close}
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/20"
            aria-hidden
          />
          <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white shadow-lg">
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2 text-base font-medium">
              <Link
                href="/vols-pas-chers"
                onClick={close}
                className="rounded-lg px-2 py-3 text-slate-700 hover:bg-slate-50"
              >
                Destinations
              </Link>
              <Link
                href="/blog"
                onClick={close}
                className="rounded-lg px-2 py-3 text-slate-700 hover:bg-slate-50"
              >
                Blog
              </Link>
              <div className="rounded-lg px-2 py-3">
                <AuthStatus onClick={close} />
              </div>
              <Link
                href="/#inscription"
                onClick={close}
                className="my-2 rounded-lg bg-brand px-4 py-3 text-center font-semibold text-white hover:bg-brand-dark"
              >
                S&apos;inscrire
              </Link>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
