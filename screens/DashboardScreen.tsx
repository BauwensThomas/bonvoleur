import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStats } from "../hooks/useStats";
import StatsGrid from "../components/StatsGrid";

// Écran d'accueil APRÈS connexion : pas d'image hero (c'est l'écran avant
// connexion qui vend le service) - ici on va droit au but. "Mes bons plans"
// est mis en avant (le coeur de la valeur de l'app), le reste du site est
// accessible via une grille de tuiles. Réglages en petit lien discret, pas
// une tuile de la même taille que le reste.
const MENU = [
  { label: "Blog" },
  { label: "Destinations" },
  { label: "Comment ça marche" },
  { label: "Destinations populaires" },
  { label: "Avis" },
  { label: "Partenaires" },
];

export default function DashboardScreen() {
  const stats = useStats();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 16 }}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.brand}>
            <Image source={require("../assets/plane-mark.png")} style={styles.brandMark} contentFit="contain" />
            <Text style={styles.headerTitle}>
              BonVoleur<Text style={styles.headerTitleAccent}>.com</Text>
            </Text>
          </View>
          <Pressable>
            <Text style={styles.settingsLink}>Réglages</Text>
          </Pressable>
        </View>

        <Pressable style={styles.dealsCard}>
          <Text style={styles.dealsCardLabel}>Mes bons plans</Text>
          <Text style={styles.dealsCardSub}>Les vols pas chers depuis tes aéroports</Text>
        </Pressable>

        <View style={styles.menuGrid}>
          {MENU.map((item) => (
            <Pressable key={item.label} style={styles.menuTile}>
              <Text style={styles.menuTileText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <StatsGrid stats={stats} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMark: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerTitleAccent: {
    color: "#0369a1",
  },
  settingsLink: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  dealsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  dealsCardLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  dealsCardSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginTop: 4,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  menuTile: {
    width: "47%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  menuTileText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
