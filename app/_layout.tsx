import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Sentry from "@sentry/react-native";
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

// Meme service Sentry.io que le site web (projet separe "react-native"),
// migre de GlitchTip le 2026-08-16. Init au niveau module (pas dans un
// useEffect) pour capturer les erreurs le plus tot possible au demarrage.
Sentry.init({
  dsn: "https://c6f1e61d18e419397b8b8355d4d3e093@o4511919540469760.ingest.de.sentry.io/4511919941222480",
  tracesSampleRate: 0.1,
});

function RootLayout() {
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

// Sentry.wrap capture les erreurs de rendu (equivalent d'un error boundary)
// + instrumente les transitions de navigation.
export default Sentry.wrap(RootLayout);
