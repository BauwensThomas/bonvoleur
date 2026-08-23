import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export interface MemberSession {
  status: "member" | "anonymous" | "no-account";
  email: string | null;
  tier?: "free" | "premium";
  home_airports?: string[];
  push_enabled?: boolean;
  premium_until?: string | null;
  premium_cancel_at_period_end?: boolean;
  premium_interval?: "month" | "year" | null;
  has_stripe_customer?: boolean;
}

// Cache partage (egress Supabase, 2026-08-22) : useMemberSession() est
// appele independamment par 8 ecrans (Dashboard, Destinations, Blog,
// Reglages, Abonnement...) - sans ce cache, naviguer entre plusieurs
// d'entre eux en quelques secondes refait autant d'appels identiques a
// /api/mobile/session, alors que le statut d'abonnement change tres
// rarement dans une session. TTL court (60s) : assez pour eviter les
// doublons de navigation, assez court pour rester a jour apres un
// changement reel (upgrade premium, etc. - refresh() bypasse le cache).
const CACHE_TTL_MS = 60_000;
let cached: { data: MemberSession; fetchedAt: number } | null = null;
let inFlight: Promise<MemberSession> | null = null;

async function fetchSession(): Promise<MemberSession> {
  const res = await apiFetch("/api/mobile/session");
  if (!res.ok) throw new Error("request_failed");
  const data = (await res.json()) as MemberSession;
  cached = { data, fetchedAt: Date.now() };
  return data;
}

// Statut d'abonnement (/api/mobile/session) - équivalent bearer-token de
// getMemberState() côté site, utilisé pour l'écran "Mon abonnement".
export function useMemberSession() {
  const [result, setResult] = useState<MemberSession | null>(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (bypassCache = false) => {
    if (!bypassCache && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setResult(cached.data);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      // Plusieurs ecrans peuvent monter en meme temps (transition de
      // navigation) - partager la MEME requete en vol plutot que d'en tirer
      // une par ecran.
      if (bypassCache || !inFlight) {
        inFlight = fetchSession().finally(() => {
          inFlight = null;
        });
      }
      setResult(await inFlight);
    } catch {
      setError("Impossible de charger ton abonnement. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { result, loading, error, refresh };
}
