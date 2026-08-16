import { useEffect } from "react";
import { Platform } from "react-native";
import { APP_VERSION } from "../lib/version";

// Mise a jour forcee au lancement (mode "immediate" de l'API Google Play
// In-App Updates) : si une version plus recente existe sur le Play Store,
// Google affiche son propre ecran plein ecran bloquant pour forcer la mise
// a jour avant de pouvoir continuer - decision explicite (2026-08-16),
// les utilisateurs sans mise a jour automatique du Play Store activee ne
// verraient sinon jamais les nouvelles versions.
// Natif uniquement (Play Core) : inoperant sur web (npm run web) et dans
// Expo Go (module natif absent) - jamais importe hors Android.
export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    (async () => {
      try {
        const { default: SpInAppUpdates, IAUUpdateKind } = await import("sp-react-native-in-app-updates");
        const inAppUpdates = new SpInAppUpdates(false);
        const result = await inAppUpdates.checkNeedsUpdate({ curVersion: APP_VERSION });
        if (result.shouldUpdate) {
          await inAppUpdates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE });
        }
      } catch {
        // Jamais bloquant : si le Play Store n'est pas joignable (hors ligne,
        // app pas encore publiee/disponible pour ce compte, etc.), l'app
        // continue normalement.
      }
    })();
  }, []);
}
