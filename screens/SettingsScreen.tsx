import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Pressable, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE } from "../lib/api";
import { useSession } from "../hooks/useSession";
import { useMemberSession } from "../hooks/useMemberSession";
import { useAirports } from "../hooks/useAirports";
import { usePreferences, type EmailFrequency } from "../hooks/usePreferences";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import VersionFooter from "../components/VersionFooter";

// Memes 4 pages que le footer du site (Footer.tsx) - ouvertes dans le
// navigateur du telephone (pages legales statiques, pas besoin d'une vue
// native dediee, ni de duplication du contenu qui devrait alors etre tenu a
// jour a deux endroits + attendre une revue Play Store pour la moindre
// correction de texte).
const LINKS = [
  { label: "Mentions légales", path: "/mentions-legales" },
  { label: "Politique de confidentialité", path: "/confidentialite" },
  { label: "Conditions générales", path: "/conditions-generales" },
  { label: "Désinscription", path: "/desinscription" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Réglages" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {session && <PreferencesSection />}

        {LINKS.map((link) => (
          <Pressable
            key={link.path}
            style={styles.row}
            onPress={() => Linking.openURL(`${API_BASE}${link.path}`)}
          >
            <Text style={styles.rowText}>{link.label}</Text>
            <Ionicons name="open-outline" size={18} color="#0369a1" />
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <VersionFooter safeArea={false} />
      </View>
    </View>
  );
}

function PreferencesSection() {
  const { result: memberSession } = useMemberSession();
  const activeAirports = useAirports();
  const { prefs, loading, save } = usePreferences();
  const isPremium = memberSession?.tier === "premium";

  const [selected, setSelected] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<EmailFrequency>("weekly");
  const [newsletter, setNewsletter] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!prefs) return;
    setSelected(prefs.home_airports.map((a) => a.toUpperCase()));
    setFrequency(prefs.email_frequency);
    setNewsletter(prefs.newsletter);
    setPushEnabled(prefs.push_enabled);
  }, [prefs]);

  if (loading || !prefs) return <ScreenLoader />;

  // Un aeroport deja choisi mais desactive entre-temps doit rester visible
  // (sinon l'enregistrer l'efface silencieusement) - meme garde-fou que
  // src/app/compte/preferences/page.tsx cote site.
  const activeCodes = new Set(activeAirports.map((a) => a.iata));
  const airportOptions = [
    ...activeAirports.map((a) => ({ iata: a.iata, city: a.city, disabled: false })),
    ...selected
      .filter((iata) => !activeCodes.has(iata))
      .map((iata) => ({ iata, city: iata, disabled: true })),
  ];

  function toggleAirport(iata: string) {
    if (isPremium) {
      setSelected((cur) => (cur.includes(iata) ? cur.filter((c) => c !== iata) : [...cur, iata]));
    } else {
      setSelected([iata]);
    }
  }

  async function onSave() {
    if (selected.length === 0) {
      setStatus("error");
      setMessage("Choisis au moins un aéroport de départ.");
      return;
    }
    setStatus("saving");
    setMessage("");
    const result = await save({ home_airports: selected, email_frequency: frequency, newsletter, push_enabled: pushEnabled });
    if (result.ok) {
      setStatus("saved");
      setMessage("Préférences enregistrées.");
    } else {
      setStatus("error");
      setMessage(result.error);
    }
  }

  return (
    <View style={styles.prefsBox}>
      <Text style={styles.sectionTitle}>{isPremium ? "Tes aéroports de départ" : "Ton aéroport de départ"}</Text>
      <Text style={styles.sectionHint}>
        {isPremium ? "Tu peux en suivre plusieurs (avantage premium)." : "En gratuit : un seul aéroport."}
      </Text>
      <View style={styles.chipWrap}>
        {airportOptions.map((a) => {
          const on = selected.includes(a.iata);
          return (
            <Pressable
              key={a.iata}
              style={[styles.chip, on && styles.chipActive, a.disabled && styles.chipDisabled]}
              onPress={() => !a.disabled && toggleAirport(a.iata)}
              disabled={a.disabled}
            >
              <Text style={[styles.chipText, on && styles.chipTextActive]}>
                {a.city} ({a.iata}){a.disabled ? " · désactivé" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Fréquence des emails</Text>
      <RadioRow label="Tous les jours (premium)" active={frequency === "daily"} disabled={!isPremium} onPress={() => setFrequency("daily")} />
      <RadioRow label="Une fois par semaine" active={frequency === "weekly"} onPress={() => setFrequency("weekly")} />
      <RadioRow label="En pause (aucun email)" active={frequency === "none"} onPress={() => setFrequency("none")} />

      <Text style={styles.sectionTitle}>Newsletter du blog</Text>
      <CheckRow label="Recevoir la newsletter" checked={newsletter} onPress={() => setNewsletter((v) => !v)} />

      <Text style={styles.sectionTitle}>Notifications push</Text>
      <CheckRow label="Recevoir les notifications push" checked={pushEnabled} onPress={() => setPushEnabled((v) => !v)} />

      {message ? <Text style={status === "error" ? styles.errorText : styles.successText}>{message}</Text> : null}

      <Pressable style={styles.saveButton} onPress={onSave} disabled={status === "saving"}>
        {status === "saving" ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
      </Pressable>
    </View>
  );
}

function RadioRow({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.optionRow} onPress={disabled ? undefined : onPress} disabled={disabled}>
      <Ionicons
        name={active ? "radio-button-on" : "radio-button-off"}
        size={20}
        color={disabled ? "#cbd5e1" : "#0ea5e9"}
      />
      <Text style={[styles.optionText, disabled && styles.optionTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

function CheckRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.optionRow} onPress={onPress}>
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={20} color="#0ea5e9" />
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  rowText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    backgroundColor: "#ffffff",
    paddingTop: 6,
  },
  prefsBox: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 14,
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
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
  chipDisabled: {
    opacity: 0.5,
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
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  optionText: {
    color: "#334155",
    fontSize: 14,
  },
  optionTextDisabled: {
    color: "#cbd5e1",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 12,
  },
  successText: {
    color: "#15803d",
    fontSize: 12,
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
