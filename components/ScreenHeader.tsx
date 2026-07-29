import { StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// En-tete commun a tous les ecrans ouverts depuis une tuile du tableau de
// bord (Bons plans, Blog, Destinations, ...) : fleche retour en haut a
// gauche (vers le Dashboard) + logo/titre centres. Contrairement a
// LoginScreen (ouvert depuis l'accueil, pas une tuile) qui n'a pas de
// fleche - le bouton retour du telephone suffit la, mais l'utilisateur
// veut une fleche visible explicitement pour les ecrans de contenu.
export default function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable style={[styles.back, { top: insets.top + 8 }]} onPress={() => router.back()}>
        <Text style={styles.backText}>{"<"}</Text>
      </Pressable>
      <View style={styles.titleRow}>
        <Image source={require("../assets/plane-mark.png")} style={styles.titleMark} contentFit="contain" />
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: "relative",
  },
  back: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 24,
    color: "#000000",
    fontWeight: "700",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleMark: {
    width: 26,
    height: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
});
