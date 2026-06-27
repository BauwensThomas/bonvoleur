// Tracking d'ouverture d'email : pixel 1x1 transparent chargé à l'ouverture.
// Reçoit le token de désinscription (unique par abonné) -> marque ses envois
// comme ouverts dans la table sends. Utilisé pour la sunset policy.

import { createClient } from "@supabase/supabase-js";
import { getAll } from "@/lib/db";

// 1x1 GIF transparent (44 octets)
const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("t");
    if (token) {
      const subs = await getAll("subscribers");
      const sub = subs.find((s) => s.unsubscribe_token === token);
      if (sub) {
        await sb()
          .from("sends")
          .update({ opened_at: new Date().toISOString() })
          .eq("subscriber_id", sub.id)
          .is("opened_at", null);
      }
    }
  } catch {
    // Ne jamais bloquer la réponse image quelle que soit l'erreur.
  }

  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
