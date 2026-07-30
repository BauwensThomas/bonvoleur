import { useEffect, useRef } from "react";
import { apiFetch } from "../lib/api";
import { registerForPushNotificationsAsync } from "../lib/push";
import { useSession } from "./useSession";

// Enregistre le jeton Expo Push de cet appareil des qu'un membre est connecte.
// Idempotent cote serveur (Set sur push_tokens) - sans risque de le rappeler
// a chaque montage. Le vrai interrupteur "recevoir des push ou non" reste
// push_enabled (Reglages) : /api/push/register ajoute juste le jeton
// disponible, sendPushForHotDeals() cote site ne l'utilise que si
// push_enabled !== false, donc enregistrer le jeton sans condition ici est
// sans consequence si l'abonne a coupe les notifications.
export function usePushRegistration() {
  const { session } = useSession();
  const registered = useRef(false);

  useEffect(() => {
    if (!session || registered.current) return;
    registered.current = true;
    registerForPushNotificationsAsync().then((token) => {
      if (!token) return;
      apiFetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    });
  }, [session]);
}
