// Client Supabase côté serveur (Server Components, Route Handlers) avec session
// par cookies, pour l'authentification des abonnés (Supabase Auth).
// Utilise la clé ANON publique (NEXT_PUBLIC_*), jamais la service role ici.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // En Server Component on ne peut pas écrire les cookies : le refresh
          // de session est géré par le proxy (middleware). On ignore l'erreur.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* appelé depuis un Server Component */
          }
        },
      },
    }
  );
}
