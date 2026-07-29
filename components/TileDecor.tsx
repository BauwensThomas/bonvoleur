import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

// Petits dessins decoratifs (dans un conteneur position:"relative" +
// overflow:"hidden") - amene de la couleur/texture a une tuile en couleur
// unie. variant="full" (par defaut) : 2 exemplaires, haut-gauche et
// bas-droite (menu Dashboard) - "edge" pousse ces 2 exemplaires vers les
// coins reels plutot que vers le centre, pour les libelles longs (2
// lignes, ex. "Mon abonnement"/"Villes populaires") ou la version
// centree venait recouvrir le texte. variant="single" : un
// seul exemplaire, coin choisi via "corner" - pour les petites cases de
// stats (4 par cadre) ou "Comment ca marche" ou 4 exemplaires surchargeaient trop.
export default function TileDecor({
  icon,
  color,
  variant = "full",
  corner = "top-right",
  edge = false,
}: {
  icon: IconName;
  color: string;
  variant?: "full" | "single";
  corner?: "top-right" | "bottom-right";
  edge?: boolean;
}) {
  if (variant === "single") {
    const cornerStyle = corner === "bottom-right" ? { bottom: 6, right: 6 } : { top: 6, right: 6 };
    return (
      <Ionicons
        name={icon}
        size={28}
        color={color}
        style={[styles.decorIcon, cornerStyle, { transform: [{ rotate: "18deg" }] }]}
      />
    );
  }

  const topLeft = edge ? { top: 2, left: 4 } : { top: 8, left: 10 };
  const bottomRight = edge ? { bottom: 2, right: 4 } : { bottom: 10, right: 14 };

  return (
    <>
      <Ionicons
        name={icon}
        size={26}
        color={color}
        style={[styles.decorIcon, topLeft, { transform: [{ rotate: "-20deg" }] }]}
      />
      <Ionicons
        name={icon}
        size={18}
        color={color}
        style={[styles.decorIcon, bottomRight, { transform: [{ rotate: "18deg" }] }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  decorIcon: {
    position: "absolute",
  },
});
