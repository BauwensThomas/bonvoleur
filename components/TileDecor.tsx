import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

// Petits dessins decoratifs disperses (tailles/angles/positions varies) dans
// un conteneur position:"relative" + overflow:"hidden" - amene de la
// couleur/texture a une tuile en couleur unie, reutilise sur les tuiles du
// Dashboard, les cadres de stats et le bouton de deconnexion.
export default function TileDecor({ icon, color }: { icon: IconName; color: string }) {
  return (
    <>
      <Ionicons
        name={icon}
        size={34}
        color={color}
        style={[styles.decorIcon, { top: -10, left: -8, transform: [{ rotate: "-20deg" }] }]}
      />
      <Ionicons
        name={icon}
        size={18}
        color={color}
        style={[styles.decorIcon, { bottom: -2, right: 10, transform: [{ rotate: "18deg" }] }]}
      />
      <Ionicons
        name={icon}
        size={24}
        color={color}
        style={[styles.decorIcon, { bottom: -8, left: 14, transform: [{ rotate: "-10deg" }] }]}
      />
      <Ionicons
        name={icon}
        size={20}
        color={color}
        style={[styles.decorIcon, { top: -4, right: -4, transform: [{ rotate: "24deg" }] }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  decorIcon: {
    position: "absolute",
  },
});
