import { useEffect, useState } from "react";

export interface Stats {
  liveCount: number;
  airportsCount: number;
  totalDest: number;
  reviewAverage: number;
  reviewTotal: number;
}

// Stats publiques (bons plans, aéroports, destinations, note moyenne) -
// partagées entre l'écran d'accueil (avant connexion) et le tableau de bord
// (après connexion), même route /api/mobile/stats.
export function useStats(): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("https://www.bonvoleur.com/api/mobile/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return stats;
}
