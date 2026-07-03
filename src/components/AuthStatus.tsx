"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AuthStatus({ onClick }: { onClick?: () => void }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(({ loggedIn }: { loggedIn: boolean }) => {
        setLoggedIn(loggedIn);
      })
      .catch(() => {
        setLoggedIn(false);
      });
  }, []);

  // Pendant le chargement : lien neutre sans indicateur
  if (loggedIn === null) {
    return (
      <Link href="/compte" onClick={onClick} className="text-slate-600 hover:text-slate-900">
        Connexion
      </Link>
    );
  }

  if (!loggedIn) {
    return (
      <Link href="/compte" onClick={onClick} className="text-slate-600 hover:text-slate-900">
        Connexion
      </Link>
    );
  }

  return (
    <Link
      href="/compte"
      onClick={onClick}
      className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      Connecté
    </Link>
  );
}
