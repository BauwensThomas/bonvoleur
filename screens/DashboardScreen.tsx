import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStats } from "../hooks/useStats";
import { formatRating } from "../lib/format";
import VersionFooter from "../components/VersionFooter";

// Écran d'accueil APRÈS connexion : pas d'image hero (c'est l'écran avant
// connexion qui vend le service) - ici on va droit au but. Les stats sont un
// simple bandeau d'info en haut (pas la mise en avant qu'elles ont sur
// l'écran hero). "Mes bons plans" est une tuile du menu comme les autres
// (même taille), mais en bleu pour rester repérable. "Réglages" est aussi
// une tuile, toujours en dernière position.
const MENU = [
  { label: "Mes bons plans", accent: true },
  { label: "Blog" },
  { label: "Destinations" },
  { label: "Comment ça marche" },
  { label: "Destinations populaires" },
  { label: "Avis" },
  { label: "Partenaires" },
  { label: "Réglages" },
];

export default function DashboardScreen() {
  const stats = useStats();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 16 }}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Image source={require("../assets/plane-mark.png")} style={styles.brandMark} contentFit="contain" />
          <Text style={styles.headerTitle}>
            BonVoleur<Text style={styles.headerTitleAccent}>.com</Text>
          </Text>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats ? stats.liveCount : "-"}</Text>
            <Text style={styles.statLabel}>Bons plans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats ? stats.airportsCount : "-"}</Text>
            <Text style={styles.statLabel}>Aéroports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats ? stats.totalDest : "-"}</Text>
            <Text style={styles.statLabel}>Destinations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats && stats.reviewTotal > 0 ? formatRating(stats.reviewAverage) : "-"}
              {stats && stats.reviewTotal > 0 ? <Text style={styles.statStar}> ★</Text> : null}
            </Text>
            <Text style={styles.statLabel}>Note</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {MENU.map((item) => (
            <Pressable key={item.label} style={[styles.menuTile, item.accent && styles.menuTileAccent]}>
              <Text style={[styles.menuTileText, item.accent && styles.menuTileTextAccent]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <VersionFooter safeArea={false} />
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
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fbcfe8",
    backgroundColor: "#fdf2f8",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: "#fbcfe8",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  statStar: {
    color: "#f59e0b",
    fontSize: 12,
  },
  statLabel: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
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
  menuTileAccent: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  menuTileText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  menuTileTextAccent: {
    color: "#fff",
  },
});
