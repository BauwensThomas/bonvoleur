import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface Deal {
  id: string;
  origin: string;
  destination: string;
  price: number;
  normal_price: number | null;
  dates: string;
  airline: string | null;
  booking_url: string;
  published_at: string | null;
  created_at: string;
}

export interface DealsResult {
  deals: Deal[];
  total: number;
  liveLockedForFree: number;
  lastRefresh: string | null;
  tier: "free" | "premium";
}

export interface DealFilters {
  origin?: string;
  destination?: string;
  region?: string;
  maxPrice?: number;
}

// Deals de l'abonne connecte (/api/mobile/deals) - meme gating premium/gratuit
// que la page /compte du site, deja gere cote serveur (getMemberDeals()).
// Les filtres sont les memes que CompteControls.tsx cote site web.
export function useDeals(filters: DealFilters = {}) {
  const [result, setResult] = useState<DealsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { origin, destination, region, maxPrice } = filters;

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (origin) params.set("origin", origin);
      if (destination) params.set("destination", destination);
      if (region) params.set("region", region);
      if (maxPrice) params.set("maxPrice", String(maxPrice));
      const qs = params.toString();
      const res = await apiFetch(`/api/mobile/deals${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("request_failed");
      setResult(await res.json());
    } catch {
      setError("Impossible de charger tes bons plans. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, region, maxPrice]);

  useEffect(() => {
    load();
  }, [load]);

  return { result, loading, error, refresh: load };
}
