"use client";

import { useEffect, useState } from "react";

// N'affiche "Déconnexion" que si vraiment connecté (comme AuthStatus.tsx) -
// composant client pour ne pas forcer tout le footer (donc toutes les pages
// qui l'incluent) en rendu dynamique juste pour ce lien.
export default function FooterLogout() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(({ loggedIn }: { loggedIn: boolean }) => setLoggedIn(loggedIn))
      .catch(() => {});
  }, []);

  if (!loggedIn) return null;

  return (
    <li>
      <form action="/auth/logout" method="post">
        <button type="submit" className="block w-full py-1 text-left hover:text-slate-900">
          Déconnexion
        </button>
      </form>
    </li>
  );
}
