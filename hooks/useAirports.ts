import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface Airport {
  iata: string;
  city: string;
  country: "BE" | "FR";
}

// Aeroports de depart actifs (/api/mobile/airports, public) - pour le filtre
// "Depart" de l'ecran des bons plans.
export function useAirports(): Airport[] {
  const [airports, setAirports] = useState<Airport[]>([]);

  useEffect(() => {
    apiFetch("/api/mobile/airports")
      .then((res) => res.json())
      .then((data) => setAirports(data.airports ?? []))
      .catch(() => {});
  }, []);

  return airports;
}
