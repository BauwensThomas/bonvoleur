import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseServer } from "@/lib/supabase/server";
import { findOne, insert, update } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import type { Subscriber, Tier } from "@/lib/types";

export type MemberState =
  | { status: "anonymous" }
  | { status: "no-account"; email: string }
  | { status: "member"; email: string; tier: Tier; subscriber: Subscriber };

// Métadonnées Supabase Auth qu'on peut connaître pour un email (voir
// SignupForm.tsx, étape 1 : l'aéroport est stocké dans user_metadata au
// moment du signUp(), avant même que l'email soit confirmé).
export interface AuthUserMetadata {
  home_airport?: string;
}

// Résout le MemberState à partir d'un email déjà authentifié par Supabase Auth
// (peu importe la source : cookie web ou jeton bearer mobile). Seule logique
// de dérivation du tier - partagée par getMemberState() (web) et
// src/lib/mobile-auth.ts (app mobile) pour ne jamais avoir deux versions qui
// divergent.
//
// Crée et/ou confirme automatiquement l'abonné dès qu'on arrive ici : les 2
// seuls appelants de cette fonction ne passent JAMAIS un email qui n'a pas
// déjà été vérifié par Supabase Auth (Google ou mot de passe + clic de
// confirmation) - donc atteindre ce point est en soi une preuve d'identité
// plus forte que l'ancien double opt-in maison (jeton dans un email).
export async function resolveMemberState(
  email: string | null | undefined,
  metadata?: AuthUserMetadata
): Promise<MemberState> {
  const e = email?.toLowerCase();
  if (!e) return { status: "anonymous" };

  let sub = await findOne("subscribers", (s) => s.email.toLowerCase() === e);

  if (!sub) {
    const airport = metadata?.home_airport?.trim().toUpperCase();
    // Pas d'aéroport connu (parcours Google, qui n'en fournit jamais) -> doit
    // passer par /compte/finaliser pour le choisir.
    if (!airport) return { status: "no-account", email: e };

    // Parcours mot de passe : l'aéroport a été donné dès l'étape 1 du
    // formulaire d'inscription (user_metadata), et l'email vient d'être
    // vérifié par le clic de confirmation -> création + confirmation
    // immédiates, aucun écran intermédiaire.
    await insert("subscribers", {
      email: e,
      tier: "free",
      home_airports: [airport],
      unsubscribe_token: randomUUID(),
      consent_at: new Date().toISOString(),
      unsubscribed_at: null,
      referrer_id: null,
    });
    sub = await findOne("subscribers", (s) => s.email.toLowerCase() === e);
    if (!sub) return { status: "no-account", email: e }; // ne devrait jamais arriver
    try {
      await sendEmail(welcomeEmail(e, unsubscribeUrl(e, sub.unsubscribe_token)));
    } catch (err) {
      console.error("[resolveMemberState] envoi bienvenue échoué:", err);
    }
  } else if (!sub.consent_at) {
    // Compte créé via l'ancien formulaire newsletter (avant le passage au
    // mot de passe), jamais confirmé. Arriver ici authentifié suffit à le
    // confirmer maintenant plutôt que de bloquer sur un ancien lien de
    // confirmation par email peut-être perdu/supprimé.
    const now = new Date().toISOString();
    await update("subscribers", sub.id, { consent_at: now });
    sub = { ...sub, consent_at: now };
    try {
      await sendEmail(welcomeEmail(e, unsubscribeUrl(e, sub.unsubscribe_token)));
    } catch (err) {
      console.error("[resolveMemberState] envoi bienvenue échoué:", err);
    }
  }
  // NB : write non-atomique (pas de garde "WHERE consent_at IS NULL" côté
  // appli) - dans le pire cas (deux onglets/web+app simultanés), l'email de
  // bienvenue pourrait partir deux fois. Sans gravité, même famille de race
  // condition déjà tolérée par le garde-fou "course" de l'ancien
  // /api/member/finalize.

  let tier: Tier = sub.tier === "premium" ? "premium" : "free";

  // Filet de sécurité : le webhook Stripe est la SEULE source qui repasse un
  // compte à `free` (annulation, fin d'abonnement). Si ce webhook n'arrive
  // jamais (panne, incident réseau côté Stripe ou nous), rien d'autre ne
  // corrige `tier` - un abonné pourrait rester premium indéfiniment après la
  // fin réelle de son abonnement. `premium_until` (date de fin de période,
  // mise à jour à chaque renouvellement) sert de repli : si elle est dans le
  // passé, on ne fait plus confiance à `tier` seul.
  if (tier === "premium" && sub.premium_until && new Date(sub.premium_until) < new Date()) {
    tier = "free";
    await update("subscribers", sub.id, { tier: "free" }).catch(() => {});
  }

  return { status: "member", email: e, tier, subscriber: sub };
}

// État de connexion de l'abonné, de façon SÛRE :
// - getUser() revalide le jeton auprès de Supabase Auth (pas une simple lecture
//   de cookie), donc impossible de forger une session.
// - le tier (gratuit/premium) vient TOUJOURS de la base (table subscribers),
//   jamais de l'URL : un gratuit ne peut pas voir le premium en bricolant le lien.
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

  return resolveMemberState(
    user?.email,
    user?.user_metadata as AuthUserMetadata | undefined
  );
}
