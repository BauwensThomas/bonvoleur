import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenLoader from "../components/ScreenLoader";

// Cible du retour Stripe (success_url/return_url = site.canonicalBase +
// "/compte...") une fois l'App Link verifie - le site n'a pas d'equivalent
// direct de "/compte" dans l'app (c'est /abonnement ici), donc ce fichier
// sert juste de redirection immediate vers le vrai ecran.
export default function ComptePasserelle() {
  const router = useRouter();
  const { upgraded } = useLocalSearchParams<{ upgraded?: string }>();

  useEffect(() => {
    router.replace(upgraded ? "/abonnement?upgraded=1" : "/abonnement");
  }, [router, upgraded]);

  return <ScreenLoader />;
}
