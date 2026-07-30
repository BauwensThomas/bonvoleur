// Envoi de notifications push via l'API Expo Push (aucune cle requise pour un
// projet Expo standard). Modele sur sendBatch() de email.ts : chunks + succes
// par message dans l'ordre d'entree, robuste face aux echecs partiels.
import "server-only";

export interface PushMessage {
  to: string; // jeton Expo Push (ExponentPushToken[...])
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100; // limite Expo par requete

export async function sendPushBatch(messages: PushMessage[]): Promise<boolean[]> {
  if (messages.length === 0) return [];
  const results: boolean[] = new Array(messages.length).fill(false);

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data, sound: "default" }))
        ),
      });
      const json = await res.json();
      const tickets: ExpoTicket[] = json.data ?? [];
      tickets.forEach((t, j) => {
        results[i + j] = t.status === "ok";
        if (t.status !== "ok") {
          console.error(`[push] échec pour ${chunk[j].to}:`, t.message, t.details);
        }
      });
    } catch (e) {
      console.error("[push] échec du lot:", e);
    }
  }

  return results;
}
