import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_VERSION } from "../lib/version";

// safeArea=true : ecran non scrollable, pousse le texte au-dessus de la
// barre de navigation du telephone (ex. HomeScreen). safeArea=false : deja
// dans un ScrollView dont le contentContainerStyle reserve cet espace
// (ex. DashboardScreen) - evite de compter l'inset deux fois.
export default function VersionFooter({ safeArea = true }: { safeArea?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Text style={[styles.version, safeArea && { marginBottom: Math.max(insets.bottom, 12) + 8 }]}>
      BonVoleur · Version mobile {APP_VERSION}
    </Text>
  );
}

const styles = StyleSheet.create({
  version: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
