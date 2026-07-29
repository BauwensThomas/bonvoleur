import { StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStats } from "../hooks/useStats";
import StatsGrid from "../components/StatsGrid";

// Écran d'accueil (avant connexion) : simple image de fond + texte, comme la
// homepage web (src/components/HeroCinematic.tsx), mais sans animation ni 3D -
// juste une image statique avec le texte par-dessus.
const HERO_IMAGE = "https://www.bonvoleur.com/hero/04-ville.webp";

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
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEWSLETTER · DEALS VOLS BE / FR</Text>
          </View>

          <Text style={styles.headline}>
            Vole plus loin,{"\n"}
            <Text style={styles.headlineAccent}>paye moins.</Text>
          </Text>

          <Text style={styles.subtext}>Deals vérifiés depuis la Belgique et la France.</Text>

          <View style={styles.buttonRow}>
            {/* TEMPORAIRE : navigue direct vers le tableau de bord pour prévisualiser,
                en attendant la vraie connexion Supabase (email magique + Google). */}
            <Pressable style={styles.buttonPrimary} onPress={() => router.push("/dashboard")}>
              <Text style={styles.buttonPrimaryText}>S'inscrire</Text>
            </Pressable>
            <Pressable style={styles.buttonSecondary} onPress={() => router.push("/dashboard")}>
              <Text style={styles.buttonSecondaryText}>Se connecter</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.rest}>
        <StatsGrid stats={stats} />
        <Text style={[styles.version, { marginBottom: Math.max(insets.bottom, 12) + 8 }]}>
          BonVoleur · Version mobile 1.0
        </Text>
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
  version: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  buttonPrimary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonSecondary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonSecondaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
