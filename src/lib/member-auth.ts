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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!email) return { status: "anonymous" };

  const sub = await findOne(
    "subscribers",
    (s) => s.email.toLowerCase() === email
  );
  // Pas d'abonné, ou désinscrit -> doit (re)passer par l'inscription.
  if (!sub || sub.unsubscribed_at) return { status: "no-account", email };
  // Inscrit mais double opt-in non validé -> doit confirmer par email d'abord.
  if (!sub.consent_at) return { status: "unconfirmed", email };

  const tier: Tier = sub.tier === "premium" ? "premium" : "free";
  return { status: "member", email, tier, subscriber: sub };
}
