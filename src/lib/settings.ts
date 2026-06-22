// Réglages simples du site, stockés en base (table site_settings : key/value).
// Sert notamment à l'image de secours par défaut des destinations, modifiable
// depuis /admin/photos sans redéploiement.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_DEST_IMAGE } from "./destinations";

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  if (!_sb) _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const { data } = await sb()
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return (data?.value as string) ?? null;
  } catch {
    return null; // table absente / erreur : on retombe sur les valeurs par défaut
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sb().from("site_settings").upsert({ key, value }, { onConflict: "key" });
}

// Image de secours configurée, sinon la constante (visuel avion).
export async function getDefaultDestImage(): Promise<string> {
  return (await getSetting("default_dest_image")) || DEFAULT_DEST_IMAGE;
}
