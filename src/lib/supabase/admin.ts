import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client Supabase ADMIN (service role) pour les opérations d'authentification
// privilégiées (supprimer un compte). À n'utiliser QUE côté serveur.
function admin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface OrphanAuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

// Liste les comptes auth.users qui n'ont AUCUNE ligne correspondante dans
// `subscribers` - typiquement quelqu'un qui s'est connecté (Google/lien
// magique, ce qui crée le compte auth immédiatement) mais a abandonné avant
// de finir /compte/finaliser (choix d'aéroport + consentement), qui est le
// seul endroit où la ligne `subscribers` est créée. Invisible autrement,
// aucune page n'existe pour lister les comptes auth bruts.
export async function listOrphanAuthUsers(
  subscriberEmails: Set<string>
): Promise<OrphanAuthUser[]> {
  const sb = admin();
  const orphans: OrphanAuthUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      const email = u.email?.toLowerCase();
      if (email && !subscriberEmails.has(email)) {
        orphans.push({
          id: u.id,
          email: u.email!,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        });
      }
    }
    if (data.users.length < 200) break;
  }
  return orphans;
}

// Indique si un email a déjà un compte auth.users (peu importe le
// fournisseur). Utilisé pour prévenir plus tôt dans le formulaire
// d'inscription ("cet email existe déjà") plutôt que de laisser choisir un
// mot de passe pour rien - Supabase ne propose pas cette vérification côté
// client (anti-énumération), donc on la fait nous-mêmes côté serveur.
export async function authUserExists(email: string): Promise<boolean> {
  const sb = admin();
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    if (data.users.some((u) => u.email?.toLowerCase() === target)) return true;
    if (data.users.length < 200) break;
  }
  return false;
}

// Supprime le compte d'authentification (auth.users) correspondant à un email.
// Utilisé à la suppression d'un abonné en admin -> erasure complète (RGPD).
export async function deleteAuthUserByEmail(email: string): Promise<boolean> {
  const sb = admin();
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    const user = data.users.find((u) => u.email?.toLowerCase() === target);
    if (user) {
      await sb.auth.admin.deleteUser(user.id);
      return true;
    }
    if (data.users.length < 200) break;
  }
  return false;
}
