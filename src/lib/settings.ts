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

// Interrupteur global des publicités AdSense - desactive par defaut (le
// compte n'est pas encore approuve par Google au moment de l'implementation).
// Controle depuis /admin, sans avoir a toucher au code pour tout couper.
export async function getAdsEnabled(): Promise<boolean> {
  return (await getSetting("ads_enabled")) === "true";
}

// Liste tous les fichiers du dossier destinations/ -> map path -> taille en octets.
export async function getStorageDestFiles(): Promise<Record<string, number>> {
  try {
    const { data } = await sb().storage.from("photos").list("destinations", { limit: 1000 });
    const map: Record<string, number> = {};
    for (const f of data ?? []) {
      map[`destinations/${f.name}`] = (f.metadata as { size?: number } | null)?.size ?? 0;
    }
    return map;
  } catch {
    return {};
  }
}

// Espace utilisé dans le bucket Storage "photos", détaillé par dossier.
export interface StorageStats {
  destinations: number;
  articles: number;
  defaults: number;
  bytes: number; // total tous dossiers confondus
}
export async function getStorageStats(): Promise<StorageStats> {
  const res: StorageStats = { destinations: 0, articles: 0, defaults: 0, bytes: 0 };
  try {
    const client = sb();
    for (const folder of ["destinations", "articles", "defaults"] as const) {
      const { data } = await client.storage
        .from("photos")
        .list(folder, { limit: 1000 });
      for (const f of data ?? []) {
        res[folder] += 1;
        res.bytes += (f.metadata as { size?: number } | null)?.size ?? 0;
      }
    }
    return res;
  } catch {
    return res;
  }
}
