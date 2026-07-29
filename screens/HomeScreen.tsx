import { ImageBackground, StyleSheet, Text, View, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";

// Écran d'accueil : simple image de fond + texte, comme la homepage web
// (src/components/HeroCinematic.tsx), mais sans animation ni 3D - juste
// une image statique avec le texte par-dessus.
const HERO_IMAGE = "https://www.bonvoleur.com/hero/01-nuit.webp";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.background} resizeMode="cover">
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

          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>S'inscrire</Text>
          </Pressable>
        </View>
      </ImageBackground>
      <View style={styles.rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050d1f",
  },
  background: {
    height: 420,
    justifyContent: "flex-start",
  },
  rest: {
    flex: 1,
    backgroundColor: "#050d1f",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 90,
  },
  badge: {
    alignSelf: "flex-start",
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
  },
  headlineAccent: {
    color: "#7dd3fc",
  },
  subtext: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    marginTop: 10,
    maxWidth: 320,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 18,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
