import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Session Supabase courante, mise a jour en direct (connexion/deconnexion)
// via onAuthStateChange - utilise par les ecrans qui doivent rediriger selon
// l'etat de connexion (accueil -> dashboard si deja connecte, et inversement).
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
