"use client";

import { useEffect, useState } from "react";

// Compte a rebours jusqu'a la prochaine actualisation du scanner (premium).
// Les heures sont en heure locale du navigateur (~Bruxelles pour notre audience).
export default function RefreshCountdown({ times }: { times: readonly string[] }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const candidates = times.map((t) => {
        const [h, m] = t.split(":").map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
      });
      let next = candidates.find((d) => d.getTime() > now.getTime());
      if (!next) {
        // Toutes les heures du jour sont passees : premiere heure de demain.
        next = new Date(candidates[0]);
        next.setDate(next.getDate() + 1);
      }
      setRemaining(next.getTime() - now.getTime());
    };
    const id = setInterval(compute, 1000);
    const first = setTimeout(compute, 0); // premier rendu hors corps d'effet
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [times]);

  if (remaining === null) return null;

  const totalSec = Math.max(0, Math.floor(remaining / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm">
      <span>
        <span className="text-slate-600">
          Prochaine actualisation des bons plans dans{" "}
        </span>
        <span className="font-mono font-semibold text-brand-dark">
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>
      </span>
      <span className="text-xs text-slate-400">
        scan a {times.join(", ")}
      </span>
    </div>
  );
}
