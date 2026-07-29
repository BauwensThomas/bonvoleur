import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface DestinationSummary {
  slug: string;
  destIata: string;
  destCity: string;
  region: string;
  image: string | null;
  originCount: number;
}

// Destinations (/api/mobile/destinations, public) - equivalent mobile de
// /vols-pas-chers, groupe par ville d'arrivee.
export function useDestinations() {
  const [destinations, setDestinations] = useState<DestinationSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/destinations");
      if (!res.ok) throw new Error("request_failed");
      const data = await res.json();
      setDestinations(data.destinations ?? []);
    } catch {
      setError("Impossible de charger les destinations. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { destinations, loading, error, refresh: load };
}
