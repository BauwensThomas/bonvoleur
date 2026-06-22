// Ré-héberge une image distante (Unsplash...) dans Supabase Storage (bucket
// public "photos"), en version allégée, et renvoie l'URL publique. En cas
// d'échec, renvoie l'URL d'origine (jamais de casse).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _sb: SupabaseClient | null = null;
let _bucketReady = false;

function sb(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_sb) _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

async function ensureBucket(client: SupabaseClient) {
  if (_bucketReady) return;
  try {
    await client.storage.createBucket("photos", { public: true });
  } catch {
    /* existe déjà */
  }
  _bucketReady = true;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function rehostImage(
  sourceUrl: string | null,
  prefix: string,
  name: string
): Promise<string | null> {
  if (!sourceUrl) return sourceUrl;
  if (sourceUrl.includes("/storage/v1/object/public/photos/")) return sourceUrl;
  const client = sb();
  if (!client) return sourceUrl;

  const base = sourceUrl.split("?")[0];
  const fetchUrl = /(images|plus)\.unsplash\.com/.test(sourceUrl)
    ? `${base}?auto=format&fit=max&w=1200&q=68`
    : sourceUrl;

  try {
    const r = await fetch(fetchUrl, { headers: { "User-Agent": "Mozilla/5.0 BonVoleur" } });
    if (!r.ok) return sourceUrl;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength === 0) return sourceUrl;
    await ensureBucket(client);
    const path = `${prefix}/${slugify(name)}.jpg`;
    const { error } = await client.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (error) return sourceUrl;
    return client.storage.from("photos").getPublicUrl(path).data.publicUrl;
  } catch {
    return sourceUrl;
  }
}
