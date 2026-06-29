// Ré-héberge une image distante (Unsplash...) dans Supabase Storage (bucket
// public "photos"), en version allégée, et renvoie l'URL publique. En cas
// d'échec, renvoie l'URL d'origine (jamais de casse).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

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
    ? `${base}?auto=format&fit=max&w=1200&q=68&fm=jpg`
    : sourceUrl;

  try {
    const r = await fetch(fetchUrl, { headers: { "User-Agent": "Mozilla/5.0 BonVoleur" } });
    if (!r.ok) return sourceUrl;
    const raw = Buffer.from(await r.arrayBuffer());
    if (raw.byteLength === 0) return sourceUrl;

    let jpeg = await sharp(raw).resize({ width: 900, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    if (jpeg.byteLength > 150 * 1024) {
      jpeg = await sharp(raw).resize({ width: 700, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    }

    // Garde-fou : vérifie que sharp a bien produit du JPEG (magic bytes FFD8).
    if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return sourceUrl;

    await ensureBucket(client);
    const path = `${prefix}/${slugify(name)}.jpg`;
    const { error } = await client.storage
      .from("photos")
      .upload(path, jpeg, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
    if (error) return sourceUrl;
    return client.storage.from("photos").getPublicUrl(path).data.publicUrl;
  } catch {
    return sourceUrl;
  }
}
