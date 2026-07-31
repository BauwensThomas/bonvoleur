import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import mobileAds, { AdsConsent } from "react-native-google-mobile-ads";
import { usePushRegistration } from "../hooks/usePushRegistration";

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
    // RGPD (UE/UK/Suisse) : recueille le consentement AVANT d'initialiser le
    // SDK pub - le formulaire de Google (UMP) ne s'affiche que si vraiment
    // requis (geolocalisation de l'appareil), sinon cet appel ne fait rien.
    (async () => {
      try {
        await AdsConsent.requestInfoUpdate();
        await AdsConsent.loadAndShowConsentFormIfRequired();
      } catch {
        // Le consentement echoue rarement mais ne doit jamais bloquer l'app.
      }
      await mobileAds().initialize();
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
