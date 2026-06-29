// Ré-héberge une image distante (souvent Unsplash) dans Supabase Storage, en
// version ALLEGEE, et renvoie l'URL publique Supabase. Si quoi que ce soit
// échoue, renvoie l'URL d'origine (jamais de casse).
import { createClient } from "@supabase/supabase-js";

let _sb = null;
let _bucketReady = false;

function client(env) {
  if (!_sb) {
    _sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _sb;
}

async function ensureBucket(sb) {
  if (_bucketReady) return;
  try {
    await sb.storage.createBucket("photos", { public: true });
  } catch {
    /* existe déjà */
  }
  _bucketReady = true;
}

const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// env: {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY}. prefix: "destinations"|"articles".
export async function rehostImage(env, sourceUrl, prefix, name) {
  if (!sourceUrl) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return sourceUrl;
  // Déjà sur notre Storage -> on garde.
  if (sourceUrl.includes("/storage/v1/object/public/photos/")) return sourceUrl;

  // Version allégée : Unsplash sait redimensionner/compresser via l'URL.
  const base = sourceUrl.split("?")[0];
  const fetchUrl = /(images|plus)\.unsplash\.com/.test(sourceUrl)
    ? `${base}?auto=format&fit=max&w=1200&q=68&fm=jpg`
    : sourceUrl;

  try {
    const r = await fetch(fetchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 BonVoleur" },
    });
    if (!r.ok) return sourceUrl;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength === 0) return sourceUrl;
    // Garde-fou : vérifie que le fichier est bien un JPEG (magic bytes FFD8).
    if (buf[0] !== 0xff || buf[1] !== 0xd8) {
      console.log(`  rehost ${name}: format non-JPEG reçu, upload annulé`);
      return sourceUrl;
    }
    const sb = client(env);
    await ensureBucket(sb);
    const path = `${prefix}/${slugify(name)}.jpg`;
    const { error } = await sb.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.log(`  rehost ${name}: ${error.message}`);
      return sourceUrl;
    }
    return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.log(`  rehost ${name}: ${e.message}`);
    return sourceUrl;
  }
}
