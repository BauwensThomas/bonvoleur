import { useEffect, useRef } from "react";
import { apiFetch } from "../lib/api";
import {
  registerForPushNotificationsAsync,
  getLastRegisteredPushToken,
  setLastRegisteredPushToken,
} from "../lib/push";
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
    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      // Le jeton Expo peut changer sans prevenir (reinstall, rotation
      // FCM/APNs) - si ce n'est plus celui qu'on avait enregistre, on
      // desinscrit d'abord l'ancien pour ne pas laisser cet appareil avec
      // deux jetons valides (= une notif recue en double).
      const previous = await getLastRegisteredPushToken();
      if (previous && previous !== token) {
        await apiFetch("/api/push/unregister", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: previous }),
        }).catch(() => {});
      }
      await apiFetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
      await setLastRegisteredPushToken(token);
    });
  }, [session]);
}
