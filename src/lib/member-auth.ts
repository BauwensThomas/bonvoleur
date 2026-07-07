import "server-only";
import { createSupabaseServer } from "@/lib/supabase/server";
import { findOne } from "@/lib/db";
import type { Subscriber, Tier } from "@/lib/types";

export type MemberState =
  | { status: "anonymous" }
  | { status: "no-account"; email: string }
  | { status: "unconfirmed"; email: string }
  | { status: "member"; email: string; tier: Tier; subscriber: Subscriber };

// État de connexion de l'abonné, de façon SÛRE :
// - getUser() revalide le jeton auprès de Supabase Auth (pas une simple lecture
//   de cookie), donc impossible de forger une session.
// - le tier (gratuit/premium) vient TOUJOURS de la base (table subscribers),
//   jamais de l'URL : un gratuit ne peut pas voir le premium en bricolant le lien.
// - on NE crée PAS de compte ici : si l'email connecté n'est pas déjà abonné,
//   on renvoie « no-account » pour rediriger vers l'inscription.
export async function getMemberState(): Promise<MemberState> {
  const supabase = await createSupabaseServer();
  
  let user: any;
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;
  } catch (error: any) {
    // Ignorer les erreurs de token expiré/invalide (refresh_token_not_found)
    // C'est un comportement normal à l'expiration de session.
    // Autres erreurs seront loggées mais ne bloqueront pas.
    if (error?.code !== "refresh_token_not_found") {
      console.error("[getMemberState] Erreur inattendue:", error);
    }
    user = null;
  }

  const email = user?.email?.toLowerCase();
  if (!email) return { status: "anonymous" };

  const sub = await findOne(
    "subscribers",
    (s) => s.email.toLowerCase() === email
  );
  // Pas d'abonné -> doit s'inscrire.
  if (!sub) return { status: "no-account", email };
  // Inscrit mais double opt-in non validé -> doit confirmer par email d'abord.
  if (!sub.consent_at) return { status: "unconfirmed", email };
  // NB : `unsubscribed_at` (emails coupés) ne bloque PAS l'accès au compte :
  // l'abonné garde son espace et son premium, il a juste arrêté les emails.

  const tier: Tier = sub.tier === "premium" ? "premium" : "free";
  return { status: "member", email, tier, subscriber: sub };
}
