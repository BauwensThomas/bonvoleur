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

// Deals de l'abonne connecte (/api/mobile/deals) - meme gating premium/gratuit
// que la page /compte du site, deja gere cote serveur (getMemberDeals()).
export function useDeals() {
  const [result, setResult] = useState<DealsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/deals");
      if (!res.ok) throw new Error("request_failed");
      setResult(await res.json());
    } catch {
      setError("Impossible de charger tes bons plans. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { result, loading, error, refresh: load };
}
