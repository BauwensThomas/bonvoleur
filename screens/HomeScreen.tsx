import { useEffect, useState } from "react";
import { ImageBackground, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

// Écran d'accueil : simple image de fond + texte, comme la homepage web
// (src/components/HeroCinematic.tsx), mais sans animation ni 3D - juste
// une image statique avec le texte par-dessus.
const HERO_IMAGE = "https://www.bonvoleur.com/hero/04-ville.webp";

interface Stats {
  liveCount: number;
  airportsCount: number;
  totalDest: number;
  reviewAverage: number;
  reviewTotal: number;
}

// Entier si rond (5 -> "5"), sinon 1 décimale avec virgule française (4.5 -> "4,5").
// Même règle que formatRating() côté site web (src/lib/reviews.ts).
function formatRating(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(".", ",");
}

export default function HomeScreen() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("https://www.bonvoleur.com/api/mobile/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

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

      <View style={styles.rest}>
        {!stats ? (
          <ActivityIndicator color="#7dd3fc" style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.liveCount}</Text>
              <Text style={styles.statLabel}>Bons plans en ce moment</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.airportsCount}</Text>
              <Text style={styles.statLabel}>Aéroports de départ</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{stats.totalDest}</Text>
              <Text style={styles.statLabel}>Destinations disponibles</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>
                {stats.reviewTotal > 0 ? formatRating(stats.reviewAverage) : "-"}
                {stats.reviewTotal > 0 && <Text style={styles.statStar}> ★</Text>}
              </Text>
              <Text style={styles.statLabel}>
                {stats.reviewTotal >= 50 ? `Note moyenne (${stats.reviewTotal} avis)` : "Note moyenne"}
              </Text>
            </View>
          </View>
        )}
      </View>
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
    backgroundColor: "#0b1526",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statTile: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  statStar: {
    color: "#f59e0b",
    fontSize: 18,
  },
  statLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
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
