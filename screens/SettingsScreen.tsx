import { StyleSheet, Text, View, Pressable, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE } from "../lib/api";
import ScreenHeader from "../components/ScreenHeader";
import VersionFooter from "../components/VersionFooter";

// Memes 4 pages que le footer du site (Footer.tsx) - ouvertes dans le
// navigateur du telephone (pages legales statiques, pas besoin d'une vue
// native dediee).
const LINKS = [
  { label: "Mentions légales", path: "/mentions-legales" },
  { label: "Politique de confidentialité", path: "/confidentialite" },
  { label: "Conditions générales", path: "/conditions-generales" },
  { label: "Désinscription", path: "/desinscription" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Réglages" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
});
