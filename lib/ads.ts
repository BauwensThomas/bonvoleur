import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

// IDs reels AdMob (compte thozma, app "BonVoleur - Vols pas chers").
// En dev (__DEV__), on utilise TOUJOURS les IDs de test Google - cliquer sur
// ses propres vraies annonces viole les regles AdMob et peut faire fermer le
// compte. Ne jamais retirer ce garde-fou.
const REAL_BANNER_ID = "ca-app-pub-3549294158319032/7059669267";
const REAL_NATIVE_ID = "ca-app-pub-3549294158319032/2629469664";

export const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.select({ android: REAL_BANNER_ID, default: TestIds.BANNER })!;

export const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : Platform.select({ android: REAL_NATIVE_ID, default: TestIds.NATIVE })!;
