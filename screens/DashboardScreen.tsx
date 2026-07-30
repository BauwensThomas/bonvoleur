import { ScrollView, StyleSheet, Text, View, Pressable, Share } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStats } from "../hooks/useStats";
import { formatRating } from "../lib/format";
import { supabase } from "../lib/supabase";
import { apiFetch, API_BASE } from "../lib/api";
import { registerForPushNotificationsAsync } from "../lib/push";
import VersionFooter from "../components/VersionFooter";
import TileDecor, { type IconName } from "../components/TileDecor";

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
// "longLabel" : libelle plus long qui passe sur 2 lignes ("Mon abonnement",
// "Villes populaires") - l'icone decorative doit rester dans les vrais
// coins (edge) et la tuile un peu plus haute, sinon l'icone recouvre le
// texte. Les autres tuiles gardent la disposition plus rentree d'origine.
const MENU: { label: string; icon: IconName; accent?: true; route?: string; longLabel?: true }[] = [
  { label: "Bons plans", icon: "pricetag", accent: true, route: "/deals" },
  { label: "Blog", icon: "book", route: "/blog" },
  { label: "Destinations", icon: "airplane", route: "/destinations" },
  { label: "Mon abonnement", icon: "diamond", longLabel: true, route: "/abonnement" },
  { label: "Villes populaires", icon: "business", longLabel: true, route: "/villes-populaires" },
  { label: "Avis", icon: "star", route: "/avis" },
  { label: "Partenaires", icon: "people", route: "/partenaires" },
  { label: "Réglages", icon: "settings", route: "/reglages" },
];

const STAT_DECOR_COLOR = "rgba(202,138,4,0.18)";

export default function DashboardScreen() {
  const stats = useStats();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  async function logout() {
    // Retire le jeton push AVANT de couper la session (l'API a besoin du
    // jeton bearer, effacé par signOut()) - sinon cet appareil resterait
    // notifie pour un compte dont il est deconnecte.
    const pushToken = await registerForPushNotificationsAsync();
    if (pushToken) {
      await apiFetch("/api/push/unregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pushToken }),
      }).catch(() => {});
    }
    await supabase.auth.signOut();
  }

  // TODO(playstore) : remplacer par le lien de la fiche Play Store une fois
  // l'app publiee (voir project_mobile_app.md / plan mobile, Phase 3) - pour
  // l'instant on partage le site, seul lien reellement disponible.
  function shareApp() {
    Share.share({
      message: `Découvre BonVoleur, l'app qui déniche les vols pas chers depuis la Belgique et la France : ${API_BASE}`,
    }).catch(() => {});
  }

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
            <TileDecor icon="pricetag" color={STAT_DECOR_COLOR} variant="single" />
            <Text style={styles.statValue}>{stats ? stats.liveCount : "-"}</Text>
            <Text style={styles.statLabel}>Bons plans en ce moment</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBottom]}>
            <TileDecor icon="airplane" color={STAT_DECOR_COLOR} variant="single" />
            <Text style={styles.statValue}>{stats ? stats.airportsCount : "-"}</Text>
            <Text style={styles.statLabel}>Aéroports de départ</Text>
          </View>
          <View style={[styles.statCell, styles.statCellRight]}>
            <TileDecor icon="location" color={STAT_DECOR_COLOR} variant="single" />
            <Text style={styles.statValue}>{stats ? stats.totalDest : "-"}</Text>
            <Text style={styles.statLabel}>Destinations disponibles</Text>
          </View>
          <View style={styles.statCell}>
            <TileDecor icon="star" color={STAT_DECOR_COLOR} variant="single" />
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
              <TileDecor
                icon={item.icon}
                color={item.accent ? "rgba(255,255,255,0.3)" : "rgba(14,165,233,0.18)"}
                edge={item.longLabel}
              />
              <Text style={[styles.menuTileText, item.accent && styles.menuTileTextAccent]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.shareButton} onPress={shareApp}>
          <Ionicons name="share-social-outline" size={18} color="#15803d" />
          <Text style={styles.shareButtonText}>Partager</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#be123c" />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </Pressable>
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
    marginBottom: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fef08a",
    backgroundColor: "#fefce8",
    overflow: "hidden",
  },
  statCell: {
    width: "50%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    position: "relative",
    overflow: "hidden",
  },
  statCellRight: {
    borderRightWidth: 1,
    borderRightColor: "#fef08a",
  },
  statCellBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#fef08a",
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    rowGap: 12,
  },
  menuTile: {
    width: "48%",
    minHeight: 68,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  menuTileAccent: {
    backgroundColor: "#7dd3fc",
  },
  menuTileText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  menuTileTextAccent: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    backgroundColor: "#ffffff",
    paddingTop: 6,
  },
  shareButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareButtonText: {
    color: "#15803d",
    fontWeight: "700",
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#fbcfe8",
    backgroundColor: "#fdf2f8",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutButtonText: {
    color: "#be123c",
    fontWeight: "700",
    fontSize: 14,
  },
});
