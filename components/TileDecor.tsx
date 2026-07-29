import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

// Petits dessins decoratifs (dans un conteneur position:"relative" +
// overflow:"hidden") - amene de la couleur/texture a une tuile en couleur
// unie. variant="full" (par defaut) : 4 exemplaires disperses, pour les
// grandes tuiles (menu Dashboard, Comment ca marche, Deconnexion).
// variant="single" : un seul, en haut a droite - pour les petites cases de
// stats (4 par cadre) ou 4 exemplaires surchargeaient trop.
export default function TileDecor({
  icon,
  color,
  variant = "full",
}: {
  icon: IconName;
  color: string;
  variant?: "full" | "single";
}) {
  if (variant === "single") {
    return (
      <Ionicons
        name={icon}
        size={28}
        color={color}
        style={[styles.decorIcon, { top: 6, right: 6, transform: [{ rotate: "18deg" }] }]}
      />
    );
  }

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
