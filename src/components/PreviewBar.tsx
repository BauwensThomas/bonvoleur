"use client";

import { useEffect, useState } from "react";

// Bandeau des aperçus d'articles. Avec `expiresAt` (epoch ms, lien privé
// partagé), affiche un compte à rebours jusqu'à l'expiration du lien.
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (d > 0) parts.push(`${d} j`);
  parts.push(`${h} h`, `${String(m).padStart(2, "0")} min`, `${String(s).padStart(2, "0")} s`);
  return parts.join(" ");
}

export default function PreviewBar({ message, expiresAt }: { message: string; expiresAt?: number }) {
  // null tant que le composant n'est pas monté : évite un décalage
  // serveur/navigateur sur l'heure.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(expiresAt - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
      <span>{message}</span>
      {expiresAt && remaining !== null && (
        <span className="rounded-lg bg-amber-900 px-3 py-1 text-xs font-semibold text-white">
          {remaining > 0
            ? `Cet aperçu expire dans ${formatRemaining(remaining)}`
            : "Cet aperçu a expiré : actualisez la page"}
        </span>
      )}
    </div>
  );
}
