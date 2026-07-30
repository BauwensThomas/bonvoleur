import { StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStats } from "../hooks/useStats";
import StatsGrid from "../components/StatsGrid";
import TileDecor from "../components/TileDecor";
import VersionFooter from "../components/VersionFooter";

// Écran d'accueil (avant connexion) : simple image de fond + texte, comme la
// homepage web (src/components/HeroCinematic.tsx), mais sans animation ni 3D -
// juste une image statique avec le texte par-dessus.
const HERO_IMAGE = "https://www.bonvoleur.com/hero/04-ville.webp";
const HOW_IT_WORKS_URL = "https://www.bonvoleur.com/#comment-ca-marche";

export default function HomeScreen() {
  const stats = useStats();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.hero}>
        {/* contentPosition="bottom" : coupe le ciel en haut de la photo, garde la montagne/la baie */}
        <Image
          source={{ uri: HERO_IMAGE }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="bottom"
        />
        <View style={styles.overlay} />
        <View style={[styles.brandRow, { top: insets.top + 12 }]}>
          <Image source={require("../assets/plane-mark-white.png")} style={styles.brandMark} contentFit="contain" />
          <Text style={styles.brandText}>
            BonVoleur<Text style={styles.brandTextAccent}>.com</Text>
          </Text>
        </View>
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEWSLETTER · DEALS VOLS BE / FR</Text>
          </View>

          <Text style={styles.headline}>
            Vole plus loin,{"\n"}
            <Text style={styles.headlineAccent}>paye moins.</Text>
          </Text>

          <Text style={styles.subtext}>Deals vérifiés depuis la Belgique et la France.</Text>

          <Pressable style={styles.buttonPrimary} onPress={() => router.push("/login")}>
            <Text style={styles.buttonPrimaryText}>S&apos;inscrire / Connexion</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.rest}>
        <StatsGrid stats={stats} />
        <Pressable style={styles.howItWorksTile} onPress={() => Linking.openURL(HOW_IT_WORKS_URL)}>
          <TileDecor icon="help-circle" color="rgba(14,165,233,0.18)" variant="single" corner="bottom-right" />
          <Text style={styles.howItWorksText}>Comment ça marche</Text>
          <Text style={styles.howItWorksSub}>Voir sur le site →</Text>
        </Pressable>
        <VersionFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  hero: {
    height: 340,
    justifyContent: "center",
  },
  rest: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  brandRow: {
    position: "absolute",
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMark: {
    width: 22,
    height: 22,
  },
  brandText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  brandTextAccent: {
    color: "#7dd3fc",
  },
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 32,
    marginBottom: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headline: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    textAlign: "center",
  },
  headlineAccent: {
    color: "#7dd3fc",
  },
  subtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    marginTop: 10,
    maxWidth: 320,
    textAlign: "center",
  },
  buttonPrimary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  howItWorksTile: {
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#f8fafc",
    position: "relative",
    overflow: "hidden",
  },
  howItWorksText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  howItWorksSub: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
