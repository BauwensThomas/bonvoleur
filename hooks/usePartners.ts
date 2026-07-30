import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface Partner {
  id: string;
  name: string;
  logo: string | null;
  url: string;
  category: string;
  description: string;
}

// Partenaires actifs (/api/mobile/partners, public) - equivalent mobile de la
// section "Nos partenaires voyage" de la homepage.
export function usePartners() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/partners");
      if (!res.ok) throw new Error("request_failed");
      const data = await res.json();
      setPartners(data.partners ?? []);
    } catch {
      setError("Impossible de charger les partenaires. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { partners, loading, error, refresh: load };
}
