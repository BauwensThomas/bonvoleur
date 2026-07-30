import { useEffect } from "react";
import { useRouter } from "expo-router";
import DashboardScreen from "../screens/DashboardScreen";
import ScreenLoader from "../components/ScreenLoader";
import { useSession } from "../hooks/useSession";

export default function Dashboard() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Apres deconnexion depuis le Dashboard, retour a l'accueil (pas
    // directement au formulaire de connexion) - l'utilisateur a quitte
    // l'app, pas juste sa session expiree en cours de tache.
    if (!loading && !session) router.replace("/");
  }, [loading, session, router]);

  if (loading || !session) return <ScreenLoader />;

  return <DashboardScreen />;
}
