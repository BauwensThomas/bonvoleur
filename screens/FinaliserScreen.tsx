import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAirports } from "../hooks/useAirports";
import { apiFetch } from "../lib/api";

// Derniere etape pour un compte authentifie (Google) pas encore abonne -
// equivalent natif de /compte/finaliser cote site. Sans cet ecran, un
// nouveau compte Google atterrissait direct sur le Dashboard sans jamais
// avoir choisi d'aeroport - bons plans vides/en erreur, sans explication
// (bug reel trouve le 2026-08-14, probablement vecu par un vrai testeur).
export default function FinaliserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const airports = useAirports();
  const [homeAirport, setHomeAirport] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!(homeAirport && consent) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_airport: homeAirport, consent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Une erreur est survenue.");
        setBusy(false);
        return;
      }
      if (router.canDismiss()) router.dismissAll();
      router.replace("/dashboard");
    } catch {
      setError("Impossible de finaliser ton inscription pour le moment. Réessaie.");
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>Plus qu&apos;une étape</Text>
      <Text style={styles.subtitle}>
        Choisis ton aéroport de départ pour recevoir les bons plans qui te concernent.
      </Text>

      <View style={styles.chipWrap}>
        {airports.map((a) => {
          const on = homeAirport === a.iata;
          return (
            <Pressable
              key={a.iata}
              onPress={() => setHomeAirport(a.iata)}
              style={[styles.chip, on && styles.chipActive]}
            >
              <Text style={[styles.chipText, on && styles.chipTextActive]}>
                {a.city} ({a.iata})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.optionRow} onPress={() => setConsent((c) => !c)}>
        <Ionicons name={consent ? "checkbox" : "square-outline"} size={20} color="#0ea5e9" />
        <Text style={styles.optionText}>
          J&apos;accepte de recevoir les alertes deals, la newsletter, et la politique de
          confidentialité
        </Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.buttonPrimary, !(homeAirport && consent) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!(homeAirport && consent) || busy}
      >
        {busy ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.buttonPrimaryText}>Accéder à mes bons plans</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
    marginBottom: 24,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 20,
  },
  optionText: {
    flex: 1,
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 8,
  },
  buttonPrimary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPrimaryText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
});
