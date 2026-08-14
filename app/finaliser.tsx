import { useEffect } from "react";
import { useRouter } from "expo-router";
import FinaliserScreen from "../screens/FinaliserScreen";
import ScreenLoader from "../components/ScreenLoader";
import { useSession } from "../hooks/useSession";
import { useMemberSession } from "../hooks/useMemberSession";

export default function Finaliser() {
  const { session, loading: sessionLoading } = useSession();
  const { result, loading: memberLoading } = useMemberSession();
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading || memberLoading) return;
    if (!session) { router.replace("/login"); return; }
    // Deja abonne (ou reessaie apres coup) -> pas besoin d'etre ici.
    if (result?.status === "member") router.replace("/dashboard");
  }, [sessionLoading, memberLoading, session, result, router]);

  if (sessionLoading || memberLoading || !session || result?.status === "member") {
    return <ScreenLoader />;
  }

  return <FinaliserScreen />;
}
