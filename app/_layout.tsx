import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { usePushRegistration } from "../hooks/usePushRegistration";
import { initAds } from "../lib/adsReady";

// Affiche l'alerte meme si l'app est au premier plan (comportement par
// defaut d'expo-notifications sans ce handler : rien ne s'affiche).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  usePushRegistration();

  useEffect(() => {
    // Lien profond minimal : taper sur une notification ouvre "Mes bons
    // plans" (v1 - pas de deep link vers un deal precis, cf. plan Phase 3).
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/deals");
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    // RGPD (UE/UK/Suisse) : recueille le consentement puis initialise le SDK
    // pub - centralise dans lib/adsReady.ts (promesse partagee) pour que les
    // composants de pub (BannerAdSlot, NativeAdCard) puissent attendre la
    // meme initialisation au lieu de tirer une requete avant qu'elle finisse.
    initAds();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
