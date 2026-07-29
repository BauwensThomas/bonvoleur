import { useEffect } from "react";
import { useRouter } from "expo-router";
import DashboardScreen from "../screens/DashboardScreen";
import ScreenLoader from "../components/ScreenLoader";
import { useSession } from "../hooks/useSession";

export default function Dashboard() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (loading || !session) return <ScreenLoader />;

  return <DashboardScreen />;
}
