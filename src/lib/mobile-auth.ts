import "server-only";
import { createClient } from "@supabase/supabase-js";
import { resolveMemberState, type MemberState, type AuthUserMetadata } from "@/lib/member-auth";

// Authentification pour l'app mobile : un jeton d'accès Supabase envoyé dans
// l'en-tête "Authorization: Bearer <token>" (pas de cookie côté mobile).
// getUser(token) revalide le jeton auprès de Supabase Auth exactement comme
// getMemberState() le fait pour le web - même garantie de sécurité, juste une
// source de jeton différente (en-tête au lieu de cookie).
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export function bearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

// Résout le MemberState à partir du jeton bearer d'une requête. Réutilise
// resolveMemberState() (src/lib/member-auth.ts) : même dérivation du tier que
// le web, une seule source de vérité.
export async function getMobileMemberState(req: Request): Promise<MemberState> {
  const token = bearerToken(req);
  if (!token) return { status: "anonymous" };

  try {
    const { data: { user } } = await anonClient().auth.getUser(token);
    return resolveMemberState(user?.email, user?.user_metadata as AuthUserMetadata | undefined);
  } catch {
    return { status: "anonymous" };
  }
}
