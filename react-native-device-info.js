// Shim leger recommande par sp-react-native-in-app-updates pour les apps
// Expo (evite d'installer le vrai module natif react-native-device-info,
// deja couvert par expo-constants). Redirige via l'alias babel ci-dessous.
import Constants from "expo-constants";

export const getBundleId = () => {
  return Constants.expoConfig?.ios?.bundleIdentifier ?? "";
};
export const getVersion = () => {
  return Constants.expoConfig?.version;
};
export default {
  getBundleId,
  getVersion,
};
