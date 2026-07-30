import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export type EmailFrequency = "daily" | "weekly" | "none";

export interface Preferences {
  home_airports: string[];
  email_frequency: EmailFrequency;
  newsletter: boolean;
  push_enabled: boolean;
}

// Preferences du compte (/api/mobile/preferences, GET+PATCH) - equivalent
// mobile de /compte/preferences (site) : aeroports suivis, frequence email,
// newsletter, notifications push. Gating gratuit/premium deja gere cote
// serveur (1 aeroport max + pas de quotidien pour un gratuit).
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/preferences");
      if (!res.ok) throw new Error("request_failed");
      setPrefs(await res.json());
    } catch {
      setError("Impossible de charger tes préférences. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: Preferences): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await apiFetch("/api/mobile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
      setPrefs(next);
      return { ok: true };
    } catch {
      return { ok: false, error: "Impossible d'enregistrer pour le moment. Réessaie." };
    }
  }

  return { prefs, loading, error, refresh: load, save };
}
