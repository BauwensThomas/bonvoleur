import { useEffect } from "react";
import { useRouter } from "expo-router";
import HomeScreen from "../screens/HomeScreen";
import ScreenLoader from "../components/ScreenLoader";
import { useSession } from "../hooks/useSession";

export default function Index() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  if (loading || session) return <ScreenLoader />;

  return <HomeScreen />;
}
