import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseServer } from "@/lib/supabase/server";
import { findOne, insert } from "@/lib/db";
import type { Subscriber, Tier } from "@/lib/types";

export interface Member {
  email: string;
  tier: Tier;
  subscriber: Subscriber;
}

// Récupère l'abonné connecté de façon SÛRE :
// - getUser() revalide le jeton auprès de Supabase Auth (pas une simple lecture
//   de cookie), donc impossible de forger une session.
// - le tier (gratuit/premium) vient TOUJOURS de la base (table subscribers),
//   jamais de l'URL : un gratuit ne peut pas voir le premium en bricolant le lien.
// Au premier login, on crée un abonné « gratuit » si l'email n'existe pas encore.
export async function getMember(): Promise<Member | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!email) return null;

  let sub = await findOne(
    "subscribers",
    (s) => s.email.toLowerCase() === email
  );

  if (!sub) {
    sub = await insert("subscribers", {
      email,
      tier: "free",
      home_airports: [],
      unsubscribe_token: randomUUID(),
      consent_at: new Date().toISOString(),
      unsubscribed_at: null,
      referrer_id: null,
    });
  }

  const tier: Tier = sub.tier === "premium" ? "premium" : "free";
  return { email, tier, subscriber: sub };
}
