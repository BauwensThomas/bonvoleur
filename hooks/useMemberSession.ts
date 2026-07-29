import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface MemberSession {
  status: "member" | "anonymous" | "no-account" | "unconfirmed";
  email: string | null;
  tier?: "free" | "premium";
  home_airports?: string[];
  push_enabled?: boolean;
  premium_until?: string | null;
  premium_cancel_at_period_end?: boolean;
  premium_interval?: "month" | "year" | null;
  has_stripe_customer?: boolean;
}

// Statut d'abonnement (/api/mobile/session) - équivalent bearer-token de
// getMemberState() côté site, utilisé pour l'écran "Mon abonnement".
export function useMemberSession() {
  const [result, setResult] = useState<MemberSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/session");
      if (!res.ok) throw new Error("request_failed");
      setResult(await res.json());
    } catch {
      setError("Impossible de charger ton abonnement. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { result, loading, error, refresh: load };
}
