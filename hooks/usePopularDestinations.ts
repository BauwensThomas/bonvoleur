import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface PopularDestination {
  slug: string;
  city: string;
  image: string | null;
}

// Villes populaires (/api/mobile/destinations/popular, public) - equivalent
// mobile de la section "Destinations populaires" de la homepage : les 8
// villes avec le plus d'aeroports de depart ayant un bon plan actif.
export function usePopularDestinations() {
  const [destinations, setDestinations] = useState<PopularDestination[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/destinations/popular");
      if (!res.ok) throw new Error("request_failed");
      const data = await res.json();
      setDestinations(data.destinations ?? []);
    } catch {
      setError("Impossible de charger les villes populaires. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { destinations, loading, error, refresh: load };
}
