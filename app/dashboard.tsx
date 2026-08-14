import { useEffect } from "react";
import { useRouter } from "expo-router";
import DashboardScreen from "../screens/DashboardScreen";
import ScreenLoader from "../components/ScreenLoader";
import { useSession } from "../hooks/useSession";
import { useMemberSession } from "../hooks/useMemberSession";

export default function Dashboard() {
  const { session, loading: sessionLoading } = useSession();
  const { result, loading: memberLoading } = useMemberSession();
  const router = useRouter();

  useEffect(() => {
    // Apres deconnexion depuis le Dashboard, retour a l'accueil (pas
    // directement au formulaire de connexion) - l'utilisateur a quitte
    // l'app, pas juste sa session expiree en cours de tache.
    if (!sessionLoading && !session) { router.replace("/"); return; }
    // Connecte (Google) mais pas encore abonne : sans ce garde-fou, le
    // Dashboard s'affichait quand meme avec des donnees vides/en erreur,
    // sans jamais proposer de choisir un aeroport (bug trouve le 2026-08-14).
    if (!memberLoading && result?.status === "no-account") {
      router.replace("/finaliser");
    }
  }, [sessionLoading, memberLoading, session, result, router]);

  if (sessionLoading || !session || memberLoading || result?.status === "no-account") {
    return <ScreenLoader />;
  }

  return <DashboardScreen />;
}
