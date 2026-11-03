import { useEffect } from "react";
import { Dimensions } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";

// Portrait verrouille sur telephone, libre sur tablette et pliable ouvert.
// Google (Play Console, 2026-11) demande de retirer le verrou d'orientation du
// manifeste pour les grands ecrans ; l'interface reste concue pour le portrait
// sur telephone, donc le verrou est applique ICI, selon la taille de l'ecran
// (plus petit cote < 600 dp = telephone). Re-evalue quand la taille change
// (pliable qui s'ouvre ou se ferme).
const LARGE_SCREEN_MIN_DP = 600;

async function applyPolicy() {
  const { width, height } = Dimensions.get("window");
  try {
    if (Math.min(width, height) < LARGE_SCREEN_MIN_DP) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.unlockAsync();
    }
  } catch {
    // Jamais bloquant : sans verrou, l'app reste utilisable.
  }
}

export function useOrientationPolicy() {
  useEffect(() => {
    applyPolicy();
    const sub = Dimensions.addEventListener("change", applyPolicy);
    return () => sub.remove();
  }, []);
}
