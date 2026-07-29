import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

// Aeroports de depart favoris de l'abonne (marque "*" dans le filtre Depart
// de l'ecran des deals, comme sur le site web CompteControls.tsx).
export function useHomeAirports(): string[] {
  const [homeAirports, setHomeAirports] = useState<string[]>([]);

  useEffect(() => {
    apiFetch("/api/mobile/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHomeAirports((data?.home_airports ?? []).map((a: string) => a.toUpperCase())))
      .catch(() => {});
  }, []);

  return homeAirports;
}
