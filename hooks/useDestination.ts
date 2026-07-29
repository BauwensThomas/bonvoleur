import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface DestinationOrigin {
  originIata: string;
  originCity: string;
  weekCount: 0 | 1;
}

export interface DestinationContent {
  intro: string;
  airlines: string[];
  duration: string;
  bestPeriod: string;
  tips: string[];
}

export interface DestinationDetail {
  slug: string;
  destIata: string;
  destCity: string;
  region: string;
  image: string | null;
  imageCredit: string | null;
  photos: { url: string; credit: string }[] | null;
  content: DestinationContent | null;
  origins: DestinationOrigin[];
  faq: { question: string; answer: string }[];
}

// Fiche destination par slug (/api/mobile/destinations/[slug], public) -
// equivalent mobile de /vols-pas-chers/[route].
export function useDestination(slug: string) {
  const [destination, setDestination] = useState<DestinationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      const res = await apiFetch(`/api/mobile/destinations/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("request_failed");
      setDestination(await res.json());
    } catch {
      setError("Impossible de charger cette destination. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return { destination, loading, notFound, error, refresh: load };
}
