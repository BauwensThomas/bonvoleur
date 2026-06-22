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

// Espace utilisé dans le bucket Storage "photos" (nombre de fichiers + octets).
export async function getStorageStats(): Promise<{ count: number; bytes: number }> {
  try {
    const client = sb();
    let count = 0;
    let bytes = 0;
    for (const folder of ["destinations", "articles", "defaults"]) {
      const { data } = await client.storage
        .from("photos")
        .list(folder, { limit: 1000 });
      for (const f of data ?? []) {
        count += 1;
        bytes += (f.metadata as { size?: number } | null)?.size ?? 0;
      }
    }
    return { count, bytes };
  } catch {
    return { count: 0, bytes: 0 };
  }
}
