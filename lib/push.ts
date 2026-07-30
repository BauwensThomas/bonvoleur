import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Demande la permission puis récupère le jeton Expo Push de cet appareil.
// null si : web (pas de vrai push natif, comme datetimepicker), simulateur
// (pas de vrai jeton), permission refusée, ou pas de projectId EAS configuré
// (le projet n'a pas encore été lié à EAS - `eas init` requis avant que les
// jetons réels fonctionnent, voir project_mobile_app.md).
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("[push] Pas de projectId EAS configuré - jeton push non disponible.");
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.warn("[push] Impossible d'obtenir le jeton push:", e);
    return null;
  }
}
