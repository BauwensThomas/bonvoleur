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
