import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStats } from "../hooks/useStats";
import { formatRating } from "../lib/format";
import VersionFooter from "../components/VersionFooter";

// Écran d'accueil APRÈS connexion : pas d'image hero (c'est l'écran avant
// connexion qui vend le service) - ici on va droit au but. Les stats sont un
// seul cadre rosé en 2x2 (pas 4 tuiles séparées comme sur l'écran hero, mais
// pas non plus un bandeau compressé sur une seule ligne). "Bons plans"
// est une tuile du menu comme les autres (même taille), mais en bleu pour
// rester repérable. "Réglages" est aussi une tuile, toujours en dernière
// position. Pas de "Comment ça marche" ici - inutile pour quelqu'un déjà
// inscrit, ça reste sur l'écran d'avant connexion. "Mon abonnement" prend sa
// place (pertinent pour un membre, sert aussi l'upsell premium). La version
// est fixée en bas de l'écran (hors du scroll), en respectant la zone de
// sécurité pour ne jamais passer sous les boutons de navigation du téléphone.
const MENU: { label: string; accent?: true; route?: string }[] = [
  { label: "Bons plans", accent: true, route: "/deals" },
  { label: "Blog" },
  { label: "Destinations" },
  { label: "Mon abonnement" },
  { label: "Villes populaires" },
  { label: "Avis" },
  { label: "Partenaires" },
  { label: "Réglages" },
];

export default function DashboardScreen() {
  const stats = useStats();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Image source={require("../assets/plane-mark.png")} style={styles.brandMark} contentFit="contain" />
          <Text style={styles.headerTitle}>
            BonVoleur<Text style={styles.headerTitleAccent}>.com</Text>
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={[styles.statCell, styles.statCellRight, styles.statCellBottom]}>
            <Text style={styles.statValue}>{stats ? stats.liveCount : "-"}</Text>
            <Text style={styles.statLabel}>Bons plans en ce moment</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBottom]}>
            <Text style={styles.statValue}>{stats ? stats.airportsCount : "-"}</Text>
            <Text style={styles.statLabel}>Aéroports de départ</Text>
          </View>
          <View style={[styles.statCell, styles.statCellRight]}>
            <Text style={styles.statValue}>{stats ? stats.totalDest : "-"}</Text>
            <Text style={styles.statLabel}>Destinations disponibles</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              {stats && stats.reviewTotal > 0 ? formatRating(stats.reviewAverage) : "-"}
              {stats && stats.reviewTotal > 0 ? <Text style={styles.statStar}> ★</Text> : null}
            </Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {MENU.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.menuTile, item.accent && styles.menuTileAccent]}
              onPress={() => item.route && router.push(item.route as never)}
            >
              <Text style={[styles.menuTileText, item.accent && styles.menuTileTextAccent]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
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
  statsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fbcfe8",
    backgroundColor: "#fdf2f8",
    overflow: "hidden",
  },
  statCell: {
    width: "50%",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  statCellRight: {
    borderRightWidth: 1,
    borderRightColor: "#fbcfe8",
  },
  statCellBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#fbcfe8",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  statStar: {
    color: "#f59e0b",
    fontSize: 16,
  },
  statLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  menuTile: {
    width: "47%",
    minHeight: 92,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
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
  footer: {
    backgroundColor: "#ffffff",
    paddingTop: 6,
  },
});
